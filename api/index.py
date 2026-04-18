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
DISCLAIMER = "⚠️ Estimate only — not professional tax advice. Consult a qualified CPA."

TAX_RULES = {
    "US": {"description":"United States Federal Tax",
           "sole_proprietorship":{"type":"brackets","brackets":[(11600,.10),(47150,.12),(100525,.22),(191950,.24),(243725,.32),(609350,.35),(0,.37)],"se_tax":0.1413,"notes":"2024 federal rates. State taxes additional."},
           "partnership":{"type":"brackets","brackets":[(11600,.10),(47150,.12),(100525,.22),(191950,.24),(243725,.32),(609350,.35),(0,.37)],"notes":"Pass-through. Partners taxed at individual rates."},
           "s_corp":{"type":"brackets","brackets":[(11600,.10),(47150,.12),(100525,.22),(191950,.24),(243725,.32),(609350,.35),(0,.37)],"notes":"Pass-through. Shareholders pay individual rates."},
           "c_corp":{"type":"flat","rate":0.21,"notes":"Flat 21% federal corporate rate (TCJA 2017). State taxes additional."}},
    "UK": {"description":"United Kingdom Tax",
           "sole_proprietorship":{"type":"brackets","brackets":[(12570,0),(50270,.20),(125140,.40),(0,.45)],"notes":"2024/25 Income Tax. NI additional."},
           "partnership":{"type":"brackets","brackets":[(12570,0),(50270,.20),(125140,.40),(0,.45)],"notes":"Partners taxed at individual IT rates."},
           "limited_company":{"type":"tiered","notes":"19% ≤£50k, 25% ≥£250k, marginal relief between. 2024."}},
    "CA": {"description":"Canada Federal Tax",
           "sole_proprietorship":{"type":"brackets","brackets":[(55867,.15),(111733,.205),(154906,.26),(220000,.29),(0,.33)],"notes":"2024 federal rates. Provincial taxes additional."},
           "corporation":{"type":"flat","rate":0.15,"notes":"15% general / 9% CCPC on first $500k active income."}},
    "AU": {"description":"Australia Tax",
           "sole_trader":{"type":"brackets","brackets":[(18200,0),(45000,.19),(120000,.325),(180000,.37),(0,.45)],"notes":"2024-25 rates. Medicare levy (2%) additional."},
           "company":{"type":"flat","rate":0.25,"notes":"Base rate entity ≤A$50M turnover: 25%. Others: 30%."}},
    "IN": {"description":"India Tax",
           "individual":{"type":"brackets","brackets":[(300000,0),(600000,.05),(900000,.10),(1200000,.15),(1500000,.20),(0,.30)],"notes":"New Tax Regime 2024-25. Surcharge & cess additional."},
           "private_limited":{"type":"flat","rate":0.22,"notes":"Sec 115BAA: 22% + 10% surcharge + 4% cess ≈ 25.17%."},
           "llp":{"type":"flat","rate":0.30,"notes":"Flat 30% + surcharge + cess."}},
}

ENTITY_ALIAS = {"sole_proprietorship":["sole_proprietorship","sole_trader","individual"],
                "partnership":["partnership"],"s_corp":["s_corp"],"c_corp":["c_corp","corporation","limited_company","private_limited","company"],"llp":["llp"]}

def _bracket_tax(income, brackets):
    tax = 0; prev = 0; bd = []
    for thresh, rate in brackets:
        if thresh == 0:
            taxable = max(income - prev, 0); chunk = taxable * rate
            tax += chunk; bd.append({'bracket':f'Above ${prev:,.0f}','rate':f'{rate*100:.1f}%','taxable_amount':round(taxable,2),'tax':round(chunk,2)}); break
        taxable = max(min(income, thresh) - prev, 0); chunk = taxable * rate
        tax += chunk
        if taxable > 0: bd.append({'bracket':f'${prev:,.0f}–${thresh:,.0f}','rate':f'{rate*100:.1f}%','taxable_amount':round(taxable,2),'tax':round(chunk,2)})
        prev = thresh
        if income <= thresh: break
    return round(tax,2), round(tax/income*100,2) if income else 0, bd

def estimate_tax(net_profit, country, entity_type):
    if not entity_type or entity_type.lower() in ('','not_specified','none'):
        return {'tax':None,'message':'Entity type not provided. Tax estimation skipped.','prompt':'Select an entity type to unlock tax insights.','disclaimer':DISCLAIMER}
    if not country:
        return {'tax':None,'message':'Country not specified.','disclaimer':DISCLAIMER}
    cu = country.upper().strip()
    if cu not in TAX_RULES:
        return {'tax':None,'message':f'Tax rules for "{country}" not available.','supported_countries':list(TAX_RULES.keys()),'disclaimer':DISCLAIMER}
    if net_profit <= 0:
        return {'tax':0,'effective_rate':0,'message':'No taxable income (net profit ≤ 0).','disclaimer':DISCLAIMER}
    el = entity_type.lower().replace(' ','_').replace('-','_'); rule = None; cr = TAX_RULES[cu]
    for rk, rv in cr.items():
        if rk == 'description': continue
        if el == rk or any(al == rk for al in ENTITY_ALIAS.get(el,[])): rule = rv; break
    if not rule:
        avail = [k for k in cr if k != 'description']
        return {'tax':None,'message':f'Entity type "{entity_type}" not found for {cu}. Available: {", ".join(avail)}','disclaimer':DISCLAIMER}
    tax = 0; eff = 0; bd = []; notes = rule.get('notes','')
    if rule['type'] == 'flat':
        tax = net_profit * rule['rate']; eff = rule['rate'] * 100
        if 'se_tax' in rule: pass
    elif rule['type'] == 'brackets':
        tax, eff, bd = _bracket_tax(net_profit, rule['brackets'])
        if 'se_tax' in rule: se = net_profit * 0.9235 * rule['se_tax']; tax += se
    elif rule['type'] == 'tiered':
        if net_profit <= 50000: tax = net_profit * 0.19; eff = 19.0
        elif net_profit <= 250000: mr = 0.25-(250000-net_profit)*3/200/net_profit; tax = net_profit*mr; eff = round(mr*100,2)
        else: tax = net_profit*0.25; eff = 25.0
    return {'country':cu,'country_description':cr.get('description',''),'entity_type':entity_type,
            'net_profit':round(net_profit,2),'tax':round(tax,2),'effective_rate':round(eff,2),
            'bracket_breakdown':bd,'explanation':notes,'disclaimer':DISCLAIMER}

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
    parsed_data: dict; entity_type: Optional[str]=None; country: Optional[str]=None

@app.post("/api/analyze/pl")
def route_pl(req: PLReq):
    try:
        pl  = analyze_pl(req.parsed_data)
        tax = estimate_tax(pl['summary']['net_profit'], req.country, req.entity_type)
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
    entity_type: Optional[str]=None; country: Optional[str]=None

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
        tax = estimate_tax(net, req.country, req.entity_type)
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
