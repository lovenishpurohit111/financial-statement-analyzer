import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import io, re
import pandas as pd
import numpy as np

app = FastAPI(title="Financial Statement Analyzer API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── PARSER ────────────────────────────────────────────────────────────────────
PL_TITLE_KW   = ["profit", "loss", "income statement", "p&l", "p & l"]
BS_TITLE_KW   = ["balance sheet", "statement of financial position"]
PL_SECTION_KW = ["income", "revenue", "sales", "expenses", "cost of goods", "cogs", "gross profit"]
BS_SECTION_KW = ["assets", "liabilities", "equity", "stockholder", "shareholder"]
SUBTOTAL_PFXS = ["total", "net ", "gross profit", "gross loss", "net income", "net loss",
                  "total income", "total expenses", "total revenue", "total assets",
                  "total liabilities", "total equity", "total current", "total fixed",
                  "total other", "total cost", "total operating", "net operating",
                  "liabilities and equity", "total liabilities and equity",
                  "total stockholder", "total shareholder"]

def _is_sub(label): return any(label.strip().lower().startswith(p) for p in SUBTOTAL_PFXS)

def _val(v):
    if v is None: return None
    if isinstance(v, (int, float)): return None if (isinstance(v, float) and np.isnan(v)) else float(v)
    s = re.sub(r'[$,£€₹\s]', '', str(v).strip()).replace('(', '-').replace(')', '')
    if not s or s.lower() in ('nan','none','-',''): return None
    try: return float(s)
    except: return None

def _read(contents, filename):
    if filename.lower().endswith('.csv'):
        return pd.read_csv(io.BytesIO(contents), header=None, dtype=str, encoding='utf-8-sig')
    return pd.read_excel(io.BytesIO(contents), header=None, dtype=str)

def _detect(df):
    txt = ' '.join(c.lower() for c in df.values.flatten() if isinstance(c, str) and c.strip())
    if any(k in txt for k in PL_TITLE_KW): return 'pl'
    if any(k in txt for k in BS_TITLE_KW): return 'bs'
    ps = sum(1 for k in PL_SECTION_KW if k in txt)
    bs = sum(1 for k in BS_SECTION_KW if k in txt)
    return 'pl' if ps > bs else 'bs' if bs > ps else 'unknown'

def _val_col(df):
    best, cnt = df.shape[1]-1, 0
    for ci in range(df.shape[1]-1, -1, -1):
        c = sum(1 for v in df.iloc[:,ci] if _val(v) is not None)
        if c > cnt: cnt, best = c, ci
    return best

def _rows(df):
    vc = _val_col(df); out = []
    for _, row in df.iterrows():
        raw = str(row.iloc[0]) if not pd.isna(row.iloc[0]) else ''
        lbl = raw.strip()
        if not lbl or lbl.lower() in ('nan','none'): continue
        out.append({'label': lbl, 'value': _val(row.iloc[vc]) if vc < len(row) else None})
    return out

def _pl_sec(ll):
    if any(k in ll for k in ['income','revenue','sales','service fee','consulting']): return 'income'
    if any(k in ll for k in ['cost of goods','cogs','cost of sales','cost of revenue']): return 'cogs'
    if any(k in ll for k in ['operating expense','expense','overhead','selling','general',
                               'administrative','sg&a','payroll','wages']): return 'operating_expenses'
    if 'other income' in ll or 'non-operating income' in ll: return 'other_income'
    if any(k in ll for k in ['other expense','interest expense','depreciation','amortization']): return 'other_expenses'
    return None

def _bs_sec(ll):
    if 'current asset' in ll: return 'current_assets'
    if any(k in ll for k in ['fixed asset','property','equipment','ppe','non-current asset','plant']): return 'fixed_assets'
    if 'other asset' in ll: return 'other_assets'
    if 'current liabilit' in ll: return 'current_liabilities'
    if any(k in ll for k in ['long-term liabilit','long term liabilit','non-current liabilit','mortgage','long term debt']): return 'long_term_liabilities'
    if any(k in ll for k in ['equity','stockholder','shareholder',"owner",'retained','capital stock','paid-in']): return 'equity'
    if 'asset' in ll: return 'current_assets'
    if 'liabilit' in ll: return 'current_liabilities'
    return None

def parse_pl(df):
    secs = {k:[] for k in ['income','cogs','operating_expenses','other_income','other_expenses']}
    cur = None; period = None
    for r in _rows(df):
        lbl, ll, v = r['label'], r['label'].lower(), r['value']
        if period is None and re.search(r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b', ll) and v is None:
            period = lbl; continue
        if _is_sub(lbl): continue
        if v is None:
            s = _pl_sec(ll)
            if s: cur = s
            continue
        if v != 0:
            target = cur or _pl_sec(ll)
            if target: secs[target].append({'label': lbl, 'value': round(abs(v), 2)})
    return {'type':'pl','sections':secs,'period': period or 'N/A'}

def parse_bs(df):
    secs = {k:[] for k in ['current_assets','fixed_assets','other_assets','current_liabilities','long_term_liabilities','equity']}
    cur = None; period = None
    for r in _rows(df):
        lbl, ll, v = r['label'], r['label'].lower(), r['value']
        if period is None and re.search(r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b', ll) and v is None:
            period = lbl; continue
        if _is_sub(lbl): continue
        if v is None:
            s = _bs_sec(ll)
            if s: cur = s
            continue
        if cur and v != 0: secs[cur].append({'label': lbl, 'value': round(abs(v), 2)})
    return {'type':'bs','sections':secs,'period': period or 'N/A'}

def parse_file(contents, filename):
    df = _read(contents, filename)
    t  = _detect(df)
    if t == 'pl': return parse_pl(df)
    if t == 'bs': return parse_bs(df)
    raise ValueError("Could not detect file type. Ensure this is a QuickBooks P&L or Balance Sheet export.")

# ── P&L ANALYSIS ─────────────────────────────────────────────────────────────
def analyze_pl(parsed):
    s  = parsed.get('sections', {})
    income = s.get('income',[]); cogs = s.get('cogs',[]); op = s.get('operating_expenses',[])
    oi = s.get('other_income',[]); oe = s.get('other_expenses',[])
    rev = sum(i['value'] for i in income); tc = sum(i['value'] for i in cogs)
    gp  = rev - tc; top_e = sum(i['value'] for i in op)
    toi = sum(i['value'] for i in oi); toe = sum(i['value'] for i in oe)
    ebitda = gp - top_e; net = ebitda + toi - toe
    def pct(a, b): return round(a/b*100, 2) if b else 0
    all_exp = sorted([(i['label'],i['value']) for i in op+cogs], key=lambda x: x[1], reverse=True)
    return {
        'period': parsed.get('period','N/A'),
        'type': 'pl',
        'summary': {'total_revenue':round(rev,2),'total_cogs':round(tc,2),'gross_profit':round(gp,2),
                    'total_op_expenses':round(top_e,2),'ebitda':round(ebitda,2),
                    'total_other_income':round(toi,2),'total_other_expenses':round(toe,2),'net_profit':round(net,2)},
        'ratios': {'gross_margin':pct(gp,rev),'operating_margin':pct(ebitda,rev),
                   'net_profit_margin':pct(net,rev),'expense_ratio':pct(tc+top_e,rev),
                   'cogs_ratio':pct(tc,rev),'opex_ratio':pct(top_e,rev)},
        'breakdown': {'income':income,'cogs':cogs,'operating_expenses':op,'other_income':oi,
                      'other_expenses':oe,'top_expenses':[{'label':l,'value':v} for l,v in all_exp[:5]]},
    }

# ── BS ANALYSIS ───────────────────────────────────────────────────────────────
def analyze_bs(parsed):
    s = parsed.get('sections', {})
    ca = sum(i['value'] for i in s.get('current_assets',[]));   fa = sum(i['value'] for i in s.get('fixed_assets',[]))
    oa = sum(i['value'] for i in s.get('other_assets',[]));     ta = ca + fa + oa
    cl = sum(i['value'] for i in s.get('current_liabilities',[])); ll = sum(i['value'] for i in s.get('long_term_liabilities',[]))
    tl = cl + ll; eq = sum(i['value'] for i in s.get('equity',[]))
    if eq == 0 and ta > 0: eq = ta - tl
    wc = ca - cl
    def r(a, b, dec=2): return round(a/b, dec) if b else None
    return {
        'period': parsed.get('period','N/A'), 'type': 'bs',
        'summary': {'current_assets':round(ca,2),'fixed_assets':round(fa,2),'other_assets':round(oa,2),
                    'total_assets':round(ta,2),'current_liabilities':round(cl,2),
                    'long_term_liabilities':round(ll,2),'total_liabilities':round(tl,2),
                    'equity':round(eq,2),'working_capital':round(wc,2)},
        'ratios': {'current_ratio':r(ca,cl),'debt_to_equity':r(tl,eq),'debt_to_assets':r(tl,ta),
                   'equity_ratio':round(eq/ta*100,2) if ta else None,'asset_to_equity':r(ta,eq)},
        'breakdown': {k: s.get(k,[]) for k in ['current_assets','fixed_assets','other_assets',
                                                 'current_liabilities','long_term_liabilities','equity']},
    }

def compare_bs(cur, prev):
    def d(a, b): return round((a-b)/abs(b)*100, 2) if b and b != 0 else None
    c, p = cur['summary'], prev['summary']
    return {'total_assets_change':d(c['total_assets'],p['total_assets']),
            'total_liabilities_change':d(c['total_liabilities'],p['total_liabilities']),
            'equity_change':d(c['equity'],p['equity']),
            'working_capital_change':d(c['working_capital'],p['working_capital'])}

# ── INSIGHTS ──────────────────────────────────────────────────────────────────
def ins(level, cat, title, msg, action=''):
    return {'level':level,'category':cat,'title':title,'message':msg,'action':action}

def pl_insights(pl):
    out = []; s = pl['summary']; r = pl['ratios']
    rev = s['total_revenue']; margin = r['net_profit_margin']; gm = r['gross_margin']; er = r['expense_ratio']
    if rev == 0:
        return [ins('critical','Revenue','No Revenue Detected','No revenue found in P&L. Verify the file contains income data.','Check the Income section of your export.')]
    if margin >= 20: out.append(ins('positive','Profitability','Strong Net Profit Margin',f'Net margin of {margin:.1f}% is excellent. Most healthy businesses target 10–20%.','Consider reinvesting profits into growth.'))
    elif margin >= 10: out.append(ins('positive','Profitability','Healthy Profit Margin',f'Net margin of {margin:.1f}% is solid and above average.','Monitor expense growth to protect margins.'))
    elif margin >= 5: out.append(ins('warning','Profitability','Thin Profit Margin',f'Net margin of {margin:.1f}% leaves little room for error.','Review your largest expense categories for reduction opportunities.'))
    elif margin >= 0: out.append(ins('warning','Profitability','Very Low Profit Margin',f'Net margin of {margin:.1f}% is critically low.','Identify top 3 expenses and explore cost-cutting or revenue-growth strategies.'))
    else: out.append(ins('critical','Profitability','Operating at a Loss',f'Net loss of ${abs(s["net_profit"]):,.0f}. Immediate action required.','(1) Cut discretionary expenses, (2) Review pricing, (3) Consult a financial advisor.'))
    if gm >= 50: out.append(ins('positive','Cost of Goods','Excellent Gross Margin',f'Gross margin {gm:.1f}% indicates efficient operations.'))
    elif gm >= 25: out.append(ins('info','Cost of Goods','Moderate Gross Margin',f'Gross margin {gm:.1f}%. Review COGS for optimization opportunities.'))
    elif gm > 0: out.append(ins('warning','Cost of Goods','Low Gross Margin',f'Gross margin {gm:.1f}% — high direct costs.','Renegotiate supplier contracts or adjust pricing.'))
    if er >= 95: out.append(ins('critical','Expenses','Expenses Nearly Exceed Revenue',f'Expense ratio {er:.1f}%.','Immediate cost review required.'))
    elif er >= 80: out.append(ins('warning','Expenses','High Expense Ratio',f'Expense ratio {er:.1f}% leaves limited profit buffer.','Review discretionary expenses.'))
    elif er < 60: out.append(ins('positive','Expenses','Well-Controlled Expenses',f'Expense ratio {er:.1f}% — strong cost management.'))
    top = pl.get('breakdown',{}).get('top_expenses',[])
    if top and rev > 0:
        tp = top[0]['value']/rev*100
        if tp > 30: out.append(ins('warning','Expenses',f'High Concentration: {top[0]["label"]}',f'"{top[0]["label"]}" is {tp:.1f}% of revenue.','Investigate reduction or renegotiation.'))
    return out

def bs_insights(bs):
    out = []; s = bs['summary']; r = bs['ratios']
    cr = r.get('current_ratio'); dte = r.get('debt_to_equity'); wc = s.get('working_capital',0); eq = s.get('equity',0); ta = s.get('total_assets',0)
    if cr is not None:
        if cr >= 2: out.append(ins('positive','Liquidity','Strong Liquidity',f'Current ratio {cr:.2f} — ${cr:.2f} of current assets per $1 of debt.'))
        elif cr >= 1.2: out.append(ins('positive','Liquidity','Adequate Liquidity',f'Current ratio {cr:.2f} is in healthy range.'))
        elif cr >= 1.0: out.append(ins('warning','Liquidity','Tight Liquidity',f'Current ratio {cr:.2f} — marginal buffer.','Build cash reserves, review receivables.'))
        else: out.append(ins('critical','Liquidity','Liquidity Risk',f'Current ratio {cr:.2f} — liabilities exceed assets.','Review receivables, restructure short-term debt.'))
    if wc < 0: out.append(ins('critical','Working Capital','Negative Working Capital',f'Deficit of ${abs(wc):,.0f}.','Collect receivables, extend payables where possible.'))
    elif wc > 0: out.append(ins('positive','Working Capital','Positive Working Capital',f'${wc:,.0f} buffer for daily operations.'))
    if dte is not None:
        if dte <= 0.5: out.append(ins('positive','Leverage','Conservative Debt',f'D/E ratio {dte:.2f} — primarily equity-financed.'))
        elif dte <= 1.5: out.append(ins('info','Leverage','Moderate Leverage',f'D/E ratio {dte:.2f} — normal range.'))
        elif dte <= 3: out.append(ins('warning','Leverage','Elevated Leverage',f'D/E ratio {dte:.2f} — significant borrowing.','Monitor debt service carefully.'))
        else: out.append(ins('critical','Leverage','High Leverage Risk',f'D/E ratio {dte:.2f} — heavily debt-dependent.','Consider restructuring or equity infusion.'))
    if eq < 0: out.append(ins('critical','Equity','Negative Equity — Insolvency Risk','Liabilities exceed assets.','Consult a financial restructuring specialist immediately.'))
    elif eq > 0 and ta > 0 and eq/ta >= 0.5: out.append(ins('positive','Equity','Strong Equity Base',f'Equity is {eq/ta*100:.1f}% of assets.'))
    return out

def health_score(pl, bs):
    s = 0; m = pl['ratios']['net_profit_margin']; cr = bs['ratios'].get('current_ratio'); dte = bs['ratios'].get('debt_to_equity'); er = pl['ratios']['expense_ratio']
    s += 35 if m>=20 else 28 if m>=10 else 18 if m>=5 else 8 if m>=0 else 0
    if cr: s += 30 if cr>=2 else 24 if cr>=1.5 else 18 if cr>=1.2 else 10 if cr>=1 else 0
    else: s += 15
    if dte is not None: s += 20 if dte<=0.5 else 16 if dte<=1 else 11 if dte<=1.5 else 6 if dte<=2.5 else 0
    else: s += 10
    s += 15 if er<=60 else 11 if er<=75 else 6 if er<=85 else 2 if er<=95 else 0
    return min(max(s,0),100)

# ── TAX ENGINE ────────────────────────────────────────────────────────────────
DISCLAIMER = "⚠️ Estimate only — not professional tax advice. Consult a qualified CPA before making any tax decisions."

# ── 2024/2025 TAX RULES ───────────────────────────────────────────────────────
# Sources: IRS Rev. Proc. 2023-34 (2024 inflation adjustments), TCJA, IRS Pub 334, 535, 587
# UK: HMRC 2024-25 rates. CA: CRA 2024. AU: ATO 2024-25. IN: Finance Act 2024.

TAX_RULES = {
    "US": {
        "description": "United States Federal Income Tax",
        "sole_proprietorship": {
            "type": "brackets",
            # 2024 IRS inflation-adjusted brackets (single filer, Rev. Proc. 2023-34)
            "brackets": [(11600,.10),(47150,.12),(100525,.22),(191950,.24),(243725,.32),(609350,.35),(0,.37)],
            "standard_deduction": 14600,   # 2024 single filer (IRS Rev. Proc. 2023-34)
            "se_tax_rate": 0.1413,         # 15.3% × 92.35% = 14.13% net SE tax
            "qbi_eligible": True,          # Sec 199A: 20% QBI deduction (phase-out starts $182,050 single)
            "qbi_phase_out": 182050,
            "notes": "2024 IRS rates (Rev. Proc. 2023-34). Includes SE tax on 92.35% of net earnings. QBI deduction up to 20% of qualified business income. Standard deduction $14,600. State taxes additional (avg 4–6%)."
        },
        "partnership": {
            "type": "brackets",
            "brackets": [(11600,.10),(47150,.12),(100525,.22),(191950,.24),(243725,.32),(609350,.35),(0,.37)],
            "standard_deduction": 14600,
            "qbi_eligible": True,
            "qbi_phase_out": 182050,
            "notes": "Pass-through entity (2024 rates). Each partner reports share of income on personal return. QBI deduction may apply. State taxes additional."
        },
        "s_corp": {
            "type": "brackets",
            "brackets": [(11600,.10),(47150,.12),(100525,.22),(191950,.24),(243725,.32),(609350,.35),(0,.37)],
            "standard_deduction": 14600,
            "qbi_eligible": True,
            "qbi_phase_out": 182050,
            "notes": "Pass-through entity (2024 rates). Shareholders pay personal income tax on distributions. Reasonable salary required. QBI deduction available. State taxes additional."
        },
        "c_corp": {
            "type": "flat",
            "rate": 0.21,
            "notes": "Flat 21% federal corporate income tax (TCJA 2017, permanent). No QBI deduction. Dividends subject to additional tax at shareholder level. State corporate taxes additional (avg 5–9%). AMT of 15% applies to corps with avg income >$1B."
        },
    },
    "UK": {
        "description": "United Kingdom Tax (2024/25)",
        "sole_proprietorship": {
            "type": "brackets",
            # HMRC 2024/25: personal allowance £12,570, basic 20%, higher 40%, additional 45%
            "brackets": [(12570,0.0),(50270,0.20),(125140,0.40),(0,0.45)],
            "standard_deduction": 12570,
            "notes": "HMRC 2024/25 Income Tax bands (England, Wales, NI). Personal allowance £12,570 (tapers above £100k). Class 4 NI: 6% on profits £12,570–£50,270, 2% above. Class 2 NI abolished April 2024."
        },
        "partnership": {
            "type": "brackets",
            "brackets": [(12570,0.0),(50270,0.20),(125140,0.40),(0,0.45)],
            "standard_deduction": 12570,
            "notes": "HMRC 2024/25. Partners taxed individually on their profit share at Income Tax rates."
        },
        "limited_company": {
            "type": "tiered",
            # Corporation Tax: 19% ≤£50k, 25% ≥£250k, marginal relief between
            "small_profits_rate": 0.19,
            "main_rate": 0.25,
            "small_profits_threshold": 50000,
            "upper_threshold": 250000,
            "notes": "UK Corporation Tax 2024/25: 19% for profits ≤£50,000; 25% for profits ≥£250,000; marginal relief applies between. R&D relief and capital allowances may reduce liability."
        },
    },
    "CA": {
        "description": "Canada Federal Income Tax (2024)",
        "sole_proprietorship": {
            "type": "brackets",
            # CRA 2024 federal brackets
            "brackets": [(55867,0.15),(111733,0.205),(154906,0.26),(220000,0.29),(0,0.33)],
            "standard_deduction": 15705,  # Basic personal amount 2024
            "notes": "CRA 2024 federal rates. Basic personal amount $15,705. CPP contributions may be deductible. Provincial taxes additional (range 4–25.75% depending on province)."
        },
        "corporation": {
            "type": "flat",
            "rate": 0.15,
            "ccpc_rate": 0.09,
            "ccpc_threshold": 500000,
            "notes": "Federal corporate rate 15% (general) or 9% for Canadian-Controlled Private Corporations (CCPC) on first $500k of active business income (Small Business Deduction). Provincial taxes additional (avg 8–12%)."
        },
    },
    "AU": {
        "description": "Australia Tax (2024–25)",
        "sole_trader": {
            "type": "brackets",
            # ATO 2024-25: Stage 3 tax cuts now in effect
            "brackets": [(18200,0.0),(45000,0.19),(135000,0.325),(190000,0.37),(0,0.45)],
            "standard_deduction": 18200,
            "lito": 700,  # Low Income Tax Offset max
            "notes": "ATO 2024-25 rates including Stage 3 tax cuts. Tax-free threshold A$18,200. LITO up to $700. Medicare levy 2% additional. Small business immediate asset write-off applies."
        },
        "company": {
            "type": "tiered_au",
            "base_rate": 0.25,
            "general_rate": 0.30,
            "threshold": 50_000_000,
            "notes": "ATO 2024-25. Base rate entity (aggregated turnover <A$50M, ≤80% passive income): 25%. All other companies: 30%. Small business entity threshold A$10M for most concessions."
        },
    },
    "IN": {
        "description": "India Income Tax (FY 2024-25 / AY 2025-26)",
        "individual": {
            "type": "brackets",
            # Finance Act 2024 - New Tax Regime (default from FY 2023-24)
            "brackets": [(300000,0.0),(700000,0.05),(1000000,0.10),(1200000,0.15),(1500000,0.20),(0,0.30)],
            "rebate_87a": 25000,  # Rebate u/s 87A if income ≤₹7L (new regime)
            "cess": 0.04,         # Health & Education Cess
            "notes": "Finance Act 2024 New Tax Regime (default). Rebate u/s 87A: full tax rebate if net income ≤₹7 lakh. 4% Health & Education Cess on tax. Surcharge applies for income >₹50L. Old regime available optionally with deductions."
        },
        "private_limited": {
            "type": "flat",
            "rate": 0.22,
            "surcharge": 0.10,
            "cess": 0.04,
            "notes": "Domestic company under Sec 115BAA: 22% + 10% surcharge + 4% cess = effective 25.168%. No MAT. No exemptions/deductions (except 80JJAA). New manufacturing companies: 15% + surcharge + cess."
        },
        "llp": {
            "type": "flat",
            "rate": 0.30,
            "surcharge_threshold": 1_00_00_000,
            "surcharge_rate": 0.12,
            "cess": 0.04,
            "notes": "LLP: 30% + 12% surcharge (if income >₹1Cr) + 4% H&E Cess. Alternate Minimum Tax (AMT) at 18.5% applies if regular tax < AMT."
        },
    },
    "SG": {
        "description": "Singapore Tax (YA 2025)",
        "individual": {
            "type": "brackets",
            # IRAS YA 2025
            "brackets": [(20000,0.0),(30000,0.02),(40000,0.035),(80000,0.07),(120000,0.115),(160000,0.15),(200000,0.18),(240000,0.19),(280000,0.195),(320000,0.20),(500000,0.22),(1000000,0.23),(0,0.24)],
            "notes": "IRAS YA 2025 personal income tax rates. Earned income relief applies. No capital gains tax. No GST on personal income."
        },
        "company": {
            "type": "flat",
            "rate": 0.17,
            "startup_exemption": True,
            "notes": "Singapore corporate tax: flat 17%. First S$100k profit: 75% exempt for qualifying new companies (first 3 years). Next S$100k: 50% exempt. Partial exemption for established companies. No dividend withholding tax for residents."
        },
    },
    "DE": {
        "description": "Germany Tax (2024)",
        "individual": {
            "type": "brackets",
            # German progressive income tax 2024
            "brackets": [(11604,0.0),(17006,0.14),(66761,0.24),(277826,0.42),(0,0.45)],
            "solidarity": 0.055,  # Solidarity surcharge on tax (only if tax > €18,130)
            "notes": "Germany 2024 income tax (Einkommensteuer). Basic allowance €11,604. Solidarity surcharge 5.5% on tax above threshold. Church tax 8–9% (optional). Trade tax (Gewerbesteuer) additional for businesses."
        },
        "gmbh": {
            "type": "flat",
            "rate": 0.15,
            "solidarity": 0.055,
            "trade_tax_avg": 0.14,
            "notes": "GmbH: 15% corporate tax + 5.5% solidarity surcharge = ~15.825%, plus trade tax (Gewerbesteuer) avg 14% (varies by municipality). Total effective ~29–33%."
        },
    },
}

ENTITY_ALIAS = {
    "sole_proprietorship": ["sole_proprietorship","sole_trader","individual","sole trader"],
    "partnership":         ["partnership"],
    "s_corp":              ["s_corp","s corp"],
    "c_corp":              ["c_corp","c corp","corporation","limited_company","private_limited","company","gmbh"],
    "llp":                 ["llp"],
}

# ── US Business Deductions (2024) ─────────────────────────────────────────────
US_DEDUCTIONS = {
    "home_office": {
        "label": "Home Office Deduction",
        "method": "simplified",  # $5/sq ft up to 300 sq ft = max $1,500
        "max_simplified": 1500,
        "note": "Simplified method: $5/sq ft (max 300 sq ft = $1,500). Actual expense method may yield more. Sec 280A."
    },
    "vehicle_mileage": {
        "label": "Business Vehicle (Mileage)",
        "rate_per_mile": 0.67,   # IRS standard mileage rate 2024: 67¢/mile
        "note": "IRS 2024 standard mileage rate: 67¢/mile for business use. Keep mileage log. Actual expense method available."
    },
    "health_insurance": {
        "label": "Self-Employed Health Insurance",
        "deductible_pct": 1.0,
        "note": "100% deductible for self-employed (Sec 162(l)). Premiums for yourself, spouse, and dependents. Cannot exceed net self-employment income."
    },
    "sep_ira": {
        "label": "SEP-IRA Contribution",
        "max_rate": 0.25,        # 25% of net self-employment income
        "max_amount": 69000,     # 2024 IRS limit
        "note": "SEP-IRA: up to 25% of net self-employment earnings, max $69,000 (2024). Pre-tax retirement contribution reduces taxable income dollar-for-dollar."
    },
    "section_179": {
        "label": "Section 179 Expensing",
        "limit_2024": 1220000,   # 2024 Sec 179 deduction limit
        "phase_out_start": 3050000,
        "note": "Sec 179: immediately expense up to $1,220,000 of qualifying business equipment/property in 2024 (phase-out above $3,050,000 of purchases). Bonus depreciation: 60% in 2024 (declining)."
    },
    "meals": {
        "label": "Business Meals",
        "deductible_pct": 0.50,
        "note": "50% of qualifying business meals deductible (post-TCJA). Must be directly related to business. Entertainment expenses generally not deductible."
    },
    "qualified_business_income": {
        "label": "QBI Deduction (Sec 199A)",
        "rate": 0.20,
        "phase_out_start_single": 182050,
        "phase_out_end_single": 232050,
        "note": "Qualified Business Income deduction: up to 20% of QBI for pass-through entities. Phases out for specified service trades (SSTB) between $182,050–$232,050 (single, 2024). W-2 wage limits may apply above phase-out."
    },
    "retirement_simple_ira": {
        "label": "SIMPLE IRA Contribution",
        "employee_limit": 16000,  # 2024
        "catchup_50plus": 3500,
        "note": "SIMPLE IRA 2024: employee contribution up to $16,000 ($19,500 if age 50+). Employer must match 3% or contribute 2% non-elective."
    },
    "solo_401k": {
        "label": "Solo 401(k) Contribution",
        "employee_limit": 23000,  # 2024 elective deferral
        "total_limit": 69000,     # 2024 total including employer contribution
        "catchup_50plus": 7500,
        "note": "Solo 401(k) 2024: employee deferral up to $23,000 ($30,500 if 50+), plus employer contribution up to 25% of compensation. Total limit $69,000 ($76,500 if 50+)."
    },
}

def _bracket_tax(income, brackets):
    tax = 0; prev = 0; bd = []
    for thresh, rate in brackets:
        if thresh == 0:
            taxable = max(income - prev, 0); chunk = taxable * rate
            if taxable > 0:
                tax += chunk; bd.append({'bracket':f'Above ${prev:,.0f}','rate':f'{rate*100:.1f}%','taxable_amount':round(taxable,2),'tax':round(chunk,2)})
            break
        taxable = max(min(income, thresh) - prev, 0); chunk = taxable * rate
        tax += chunk
        if taxable > 0: bd.append({'bracket':f'${prev:,.0f}–${thresh:,.0f}','rate':f'{rate*100:.1f}%','taxable_amount':round(taxable,2),'tax':round(chunk,2)})
        prev = thresh
        if income <= thresh: break
    return round(tax,2), round(tax/income*100,2) if income else 0, bd

def estimate_tax(net_profit, country, entity_type, deductions=None):
    """
    Estimate tax with optional deductions dict.
    deductions keys (all optional, values in USD):
      home_office, vehicle_miles, health_insurance, sep_ira,
      section_179, meals_50pct, other_deductions,
      filing_status ('single'|'married')
    """
    if not entity_type or entity_type.lower() in ('','not_specified','none'):
        return {'tax':None,'message':'Entity type not provided. Tax estimation skipped.',
                'prompt':'Select an entity type to unlock tax insights.','disclaimer':DISCLAIMER}
    if not country:
        return {'tax':None,'message':'Country not specified.','disclaimer':DISCLAIMER}
    cu = country.upper().strip()
    if cu not in TAX_RULES:
        return {'tax':None,'message':f'Tax rules for "{country}" not available.',
                'supported_countries':list(TAX_RULES.keys()),'disclaimer':DISCLAIMER}
    if net_profit <= 0:
        return {'tax':0,'effective_rate':0,'message':'No taxable income (net profit ≤ 0).','disclaimer':DISCLAIMER}

    el = entity_type.lower().replace(' ','_').replace('-','_')
    rule = None; cr = TAX_RULES[cu]
    for rk, rv in cr.items():
        if rk == 'description': continue
        if el == rk or any(al == rk for al in ENTITY_ALIAS.get(el,[])): rule = rv; break
    if not rule:
        avail = [k for k in cr if k != 'description']
        return {'tax':None,'message':f'Entity type "{entity_type}" not found for {cu}. Available: {", ".join(avail)}','disclaimer':DISCLAIMER}

    deductions = deductions or {}
    filing = deductions.get('filing_status','single')
    deduction_log = []
    taxable_income = net_profit

    # ── US-specific deductions (most comprehensive) ────────────────────────
    if cu == 'US':
        if rule.get('type') != 'flat':  # Not C-Corp (C-corps can't take personal deductions)

            # 1. SE Tax deduction: deduct half of SE tax from income (Sec 164(f))
            se_tax_full = net_profit * 0.9235 * 0.153  # gross SE tax before any adjustment
            half_se_deduction = round(se_tax_full / 2, 2)
            taxable_income -= half_se_deduction
            deduction_log.append({'item':'½ SE Tax Deduction (Sec 164(f))','amount':half_se_deduction,'note':'Half of self-employment tax is deductible from gross income.'})

            # 2. Standard deduction
            std_ded = rule.get('standard_deduction', 14600)
            if filing == 'married': std_ded = 29200  # MFJ 2024
            taxable_income -= std_ded
            deduction_log.append({'item':f'Standard Deduction ({filing.title()})','amount':std_ded,'note':f'2024 IRS standard deduction: ${std_ded:,}.'})

            # 3. Health insurance premiums (self-employed)
            hi = float(deductions.get('health_insurance', 0) or 0)
            if hi > 0:
                hi = min(hi, net_profit)  # Can't exceed net SE income
                taxable_income -= hi
                deduction_log.append({'item':'Self-Employed Health Insurance (Sec 162(l))','amount':hi,'note':'100% of premiums deductible, capped at net SE income.'})

            # 4. SEP-IRA
            sep = float(deductions.get('sep_ira', 0) or 0)
            if sep > 0:
                sep_max = min(net_profit * 0.25, 69000)
                sep = min(sep, sep_max)
                taxable_income -= sep
                deduction_log.append({'item':'SEP-IRA Contribution','amount':sep,'note':f'Max: 25% of net earnings or $69,000 (2024). Your max: ${sep_max:,.0f}.'})

            # 5. Solo 401(k) or SIMPLE IRA
            s401k = float(deductions.get('solo_401k', 0) or 0)
            if s401k > 0:
                s401k = min(s401k, 69000)
                taxable_income -= s401k
                deduction_log.append({'item':'Solo 401(k) Contribution','amount':s401k,'note':'Employee deferral up to $23,000 + employer up to 25% comp, total max $69,000 (2024).'})

            # 6. Home office
            ho = float(deductions.get('home_office', 0) or 0)
            if ho > 0:
                ho = min(ho, 1500)  # simplified method cap
                taxable_income -= ho
                deduction_log.append({'item':'Home Office (Simplified Method)','amount':ho,'note':'$5/sq ft up to 300 sq ft = max $1,500. Actual expense method may differ.'})

            # 7. Vehicle mileage
            miles = float(deductions.get('vehicle_miles', 0) or 0)
            if miles > 0:
                vehicle_ded = round(miles * 0.67, 2)
                taxable_income -= vehicle_ded
                deduction_log.append({'item':f'Vehicle Mileage ({miles:,.0f} miles × $0.67)','amount':vehicle_ded,'note':'2024 IRS standard mileage rate: 67¢/mile. Keep mileage log.'})

            # 8. Section 179
            s179 = float(deductions.get('section_179', 0) or 0)
            if s179 > 0:
                s179 = min(s179, 1220000)
                taxable_income -= s179
                deduction_log.append({'item':'Section 179 Expensing','amount':s179,'note':'2024 limit: $1,220,000. Immediate expensing of qualifying equipment.'})

            # 9. Business meals (50%)
            meals = float(deductions.get('meals_entertainment', 0) or 0)
            if meals > 0:
                meals_ded = round(meals * 0.5, 2)
                taxable_income -= meals_ded
                deduction_log.append({'item':'Business Meals (50% deductible)','amount':meals_ded,'note':'Post-TCJA: only 50% of qualifying business meals deductible.'})

            # 10. Other deductions
            other = float(deductions.get('other_deductions', 0) or 0)
            if other > 0:
                taxable_income -= other
                deduction_log.append({'item':'Other Business Deductions','amount':other,'note':'User-specified additional deductions.'})

            # 11. QBI Deduction (20% of QBI, Sec 199A) — applied after above
            taxable_income = max(taxable_income, 0)
            if rule.get('qbi_eligible') and net_profit > 0:
                qbi_phase_out = rule.get('qbi_phase_out', 182050)
                if filing == 'married': qbi_phase_out = 364200
                qbi_amount = round(taxable_income * 0.20, 2)  # 20% of remaining taxable income as proxy
                if net_profit > qbi_phase_out:
                    # Simple linear phase-out over $50k range
                    phase_range = 50000 if filing == 'single' else 100000
                    excess = min(net_profit - qbi_phase_out, phase_range)
                    qbi_amount = round(qbi_amount * (1 - excess / phase_range), 2)
                if qbi_amount > 0:
                    taxable_income -= qbi_amount
                    deduction_log.append({'item':'QBI Deduction (Sec 199A — 20%)','amount':qbi_amount,'note':f'Up to 20% of qualified business income. Phase-out starts at ${qbi_phase_out:,} ({filing}).'})

        elif rule.get('type') == 'flat':  # C-Corp
            # C-Corps: Section 179, depreciation (already in P&L), R&D
            s179 = float(deductions.get('section_179', 0) or 0)
            if s179 > 0:
                s179 = min(s179, 1220000)
                taxable_income -= s179
                deduction_log.append({'item':'Section 179 Expensing','amount':s179,'note':'C-Corps can also claim Sec 179. 2024 limit: $1,220,000.'})
            other = float(deductions.get('other_deductions', 0) or 0)
            if other > 0:
                taxable_income -= other
                deduction_log.append({'item':'Additional Business Deductions','amount':other,'note':'Ordinary and necessary business expenses already deducted from P&L should not be double-counted.'})

    elif cu == 'UK':
        # UK: Annual Investment Allowance, personal allowance already in brackets
        other = float(deductions.get('other_deductions', 0) or 0)
        if other > 0:
            taxable_income -= other
            deduction_log.append({'item':'Business Allowances/Deductions','amount':other,'note':'UK allowable business expenses: office, travel, equipment, insurance, professional fees, etc.'})

    elif cu == 'IN':
        # India: Standard deduction ₹75,000 for salaried (new regime), business expense deductions
        other = float(deductions.get('other_deductions', 0) or 0)
        if other > 0:
            taxable_income -= other
            deduction_log.append({'item':'Business Expenses (Sec 37)','amount':other,'note':'Ordinary business expenses wholly & exclusively for business. Chapter VI-A deductions generally not available under New Regime.'})

    # Ensure taxable income >= 0
    taxable_income = max(taxable_income, 0)
    total_deductions = net_profit - taxable_income

    # ── Compute tax on reduced taxable income ─────────────────────────────────
    tax = 0; eff = 0; bd = []; notes = rule.get('notes','')

    if rule['type'] == 'flat':
        rate = rule['rate']
        tax = taxable_income * rate; eff = rate * 100
        # India private limited surcharge + cess
        if cu == 'IN' and 'surcharge' in rule:
            tax = tax * (1 + rule['surcharge'])
        if cu == 'IN' and 'cess' in rule:
            tax = tax * (1 + rule['cess'])

    elif rule['type'] == 'brackets':
        tax, eff, bd = _bracket_tax(taxable_income, rule['brackets'])
        # SE tax for US sole prop / partnership / s-corp (on original net, not reduced income)
        if cu == 'US' and 'se_tax_rate' in rule:
            se_tax = max(net_profit, 0) * 0.9235 * rule['se_tax_rate']
            tax += se_tax
            bd.append({'bracket':'Self-Employment Tax (SE)','rate':f'{rule["se_tax_rate"]*100:.2f}%','taxable_amount':round(net_profit*0.9235,2),'tax':round(se_tax,2)})
        # India cess
        if cu == 'IN' and 'cess' in rule:
            cess = tax * rule['cess']
            tax += cess
            bd.append({'bracket':'Health & Education Cess','rate':'4%','taxable_amount':round(tax-cess,2),'tax':round(cess,2)})
        # India rebate 87A
        if cu == 'IN' and 'rebate_87a' in rule and taxable_income <= 700000:
            rebate = min(tax, rule['rebate_87a'])
            tax -= rebate
            bd.append({'bracket':'Rebate u/s 87A','rate':'—','taxable_amount':0,'tax':-round(rebate,2)})

    elif rule['type'] == 'tiered':  # UK Ltd
        p = taxable_income
        spt = rule.get('small_profits_threshold', 50000)
        upt = rule.get('upper_threshold', 250000)
        if p <= spt:
            tax = p * rule['small_profits_rate']; eff = rule['small_profits_rate']*100
        elif p >= upt:
            tax = p * rule['main_rate']; eff = rule['main_rate']*100
        else:
            # Marginal relief: tax = 25% × profit − (250,000 − profit) × 3/200
            tax = p * 0.25 - (upt - p) * 3/200
            eff = round(tax/p*100, 2) if p else 0

    elif rule['type'] == 'tiered_au':  # AU company
        rate = rule['base_rate'] if net_profit < rule['threshold'] else rule['general_rate']
        tax = taxable_income * rate; eff = rate * 100

    # UK solidarity (Germany)
    if cu == 'DE' and 'solidarity' in rule:
        soli = tax * rule['solidarity']
        tax += soli

    tax = max(round(tax, 2), 0)
    eff = round(tax / net_profit * 100, 2) if net_profit else 0

    return {
        'country': cu,
        'country_description': cr.get('description', ''),
        'entity_type': entity_type,
        'filing_status': filing,
        'gross_profit': round(net_profit, 2),
        'total_deductions': round(total_deductions, 2),
        'taxable_income': round(taxable_income, 2),
        'tax': tax,
        'effective_rate': eff,
        'bracket_breakdown': bd,
        'deduction_breakdown': deduction_log,
        'explanation': notes,
        'available_deductions': US_DEDUCTIONS if cu == 'US' else {},
        'disclaimer': DISCLAIMER,
    }

# ── ROUTES ────────────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.csv','.xlsx','.xls')):
        raise HTTPException(400, "Only CSV or Excel files are supported.")
    contents = await file.read()
    try:
        parsed = parse_file(contents, file.filename)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to parse file: {str(e)}")
    return {"filename":file.filename,"detected_type":parsed["type"],
            "detected_label":"Profit & Loss" if parsed["type"]=="pl" else "Balance Sheet",
            "period":parsed.get("period","N/A"),"parsed_data":parsed}

class PLReq(BaseModel):
    parsed_data: dict; entity_type: Optional[str]=None; country: Optional[str]=None; deductions: Optional[dict]=None

@app.post("/api/analyze/pl")
def route_pl(req: PLReq):
    try:
        pl  = analyze_pl(req.parsed_data)
        tax = estimate_tax(pl['summary']['net_profit'], req.country, req.entity_type, req.deductions)
        return {"analysis_type":"pl","analysis":pl,"insights":pl_insights(pl),"tax":tax}
    except Exception as e: raise HTTPException(500, str(e))

class BSReq(BaseModel):
    parsed_data: dict

@app.post("/api/analyze/bs")
def route_bs(req: BSReq):
    try:
        bs = analyze_bs(req.parsed_data)
        return {"analysis_type":"bs","analysis":bs,"insights":bs_insights(bs)}
    except Exception as e: raise HTTPException(500, str(e))

class FullReq(BaseModel):
    pl_data: dict; bs_current_data: dict; bs_previous_data: Optional[dict]=None
    entity_type: Optional[str]=None; country: Optional[str]=None; deductions: Optional[dict]=None

@app.post("/api/analyze/full")
def route_full(req: FullReq):
    try:
        pl  = analyze_pl(req.pl_data)
        bsc = analyze_bs(req.bs_current_data)
        bsp = analyze_bs(req.bs_previous_data) if req.bs_previous_data else None
        net = pl['summary']['net_profit']; ta = bsc['summary']['total_assets']; eq = bsc['summary']['equity']
        roa = round(net/ta*100,2) if ta else None; roe = round(net/eq*100,2) if eq else None
        dep = next((i['value'] for i in req.pl_data.get('sections',{}).get('other_expenses',[])
                    if 'depreciat' in i['label'].lower() or 'amortiz' in i['label'].lower()), 0)
        wcc = bsc['summary']['working_capital']; wcp = bsp['summary']['working_capital'] if bsp else None
        wcd = round(wcc - wcp, 2) if wcp is not None else 0
        ocf = round(net + dep + wcd, 2); icf = round(-bsc['summary']['fixed_assets']*0.1, 2)
        hs  = health_score(pl, bsc)
        comp = compare_bs(bsc, bsp) if bsp else None
        all_ins = pl_insights(pl) + bs_insights(bsc)
        if hs >= 80: all_ins.append(ins('positive','Overall Health',f'Health Score: {hs}/100','Strong across profitability, liquidity, and leverage.'))
        elif hs >= 60: all_ins.append(ins('info','Overall Health',f'Health Score: {hs}/100','Moderate health. Specific areas need attention.'))
        elif hs >= 40: all_ins.append(ins('warning','Overall Health',f'Health Score: {hs}/100','Below average. Multiple risk factors identified.'))
        else: all_ins.append(ins('critical','Overall Health',f'Health Score: {hs}/100','Poor financial health. Immediate action advised.'))
        if roa is not None:
            if roa >= 10: all_ins.append(ins('positive','Returns',f'ROA: {roa:.1f}%','Excellent return on assets.'))
            elif roa >= 5: all_ins.append(ins('info','Returns',f'ROA: {roa:.1f}%','Moderate return on assets.'))
            elif roa >= 0: all_ins.append(ins('warning','Returns',f'ROA: {roa:.1f}%','Low return on assets.','Review asset utilization.'))
            else: all_ins.append(ins('critical','Returns',f'ROA: {roa:.1f}%','Negative return on assets.','Strategic review needed.'))
        if comp and comp.get('equity_change') is not None:
            ec = comp['equity_change']
            if ec > 0: all_ins.append(ins('positive','Growth',f'Equity Growing ({ec:+.1f}%)','Business equity increased period-over-period.'))
            elif ec < -10: all_ins.append(ins('warning','Growth',f'Equity Declining ({ec:+.1f}%)','Equity decreased significantly.','Review retained earnings and distributions.'))
        tax = estimate_tax(net, req.country, req.entity_type, req.deductions)
        return {"analysis_type":"full","pl_analysis":pl,"bs_current":bsc,"bs_previous":bsp,
                "returns":{"roa":roa,"roe":roe,"net_profit":net,"total_assets":ta,"equity":eq},
                "cash_flow":{"operating":ocf,"investing":icf,"net_cash_flow":round(ocf+icf,2),
                             "notes":"Estimated via indirect method. Investing CF approximated."},
                "balance_sheet_comparison":comp,"health_score":hs,"insights":all_ins,"tax":tax}
    except Exception as e: raise HTTPException(500, str(e))

@app.get("/api/health")
def health(): return {"status":"ok"}

@app.get("/api/tax/countries")
def tax_countries(): return {"supported_countries":list(TAX_RULES.keys())}
