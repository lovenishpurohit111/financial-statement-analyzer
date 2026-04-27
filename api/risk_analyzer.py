"""
Financial Risk Assessment Engine.
Implements:
  - Altman Z-Score (public & private company variants)
  - 8-dimension risk radar (liquidity, leverage, profitability, efficiency,
    coverage, growth proxy, operational, market)
  - Early warning signals
  - Distress probability estimate
"""
from typing import Optional


def altman_z_score(pl_data: dict, bs_data: dict) -> dict:
    """
    Altman Z-Score for private companies (Z'-Score model, 1983 revision).
    Z' = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5

    X1 = Working Capital / Total Assets
    X2 = Retained Earnings / Total Assets  (proxy: equity / total assets)
    X3 = EBIT / Total Assets
    X4 = Book Value of Equity / Total Liabilities
    X5 = Revenue / Total Assets
    """
    if not pl_data or not bs_data:
        return {"available": False, "reason": "Both P&L and Balance Sheet required for Altman Z-Score."}

    ps = pl_data.get("summary", {})
    bs = bs_data.get("summary", {})

    ta  = bs.get("total_assets", 0)
    tl  = bs.get("total_liabilities", 0)
    wc  = bs.get("working_capital", 0)
    eq  = bs.get("equity", 0)
    rev = ps.get("total_revenue", 0)
    ebit = ps.get("ebitda", ps.get("net_profit", 0))   # EBITDA as EBIT proxy

    if ta <= 0:
        return {"available": False, "reason": "Total assets must be > 0 to compute Z-Score."}

    x1 = wc / ta
    x2 = eq / ta          # retained earnings proxy (book equity / assets)
    x3 = ebit / ta
    x4 = eq / tl if tl > 0 else 9.99   # book equity / total debt
    x5 = rev / ta

    z = 0.717*x1 + 0.847*x2 + 3.107*x3 + 0.420*x4 + 0.998*x5
    z = round(z, 3)

    if z >= 2.9:
        zone = "safe"
        zone_label = "Safe Zone"
        zone_color = "green"
        description = "Low financial distress risk. The company shows solid fundamentals across working capital, profitability, and asset utilization."
        distress_probability = max(5, int(10 - (z - 2.9) * 3))
    elif z >= 1.23:
        zone = "grey"
        zone_label = "Grey Zone"
        zone_color = "amber"
        description = "Moderate distress risk. The company sits in the zone of uncertainty — monitor closely. Multiple consecutive years here elevate risk significantly."
        distress_probability = int(20 + (2.9 - z) / (2.9 - 1.23) * 45)
    else:
        zone = "distress"
        zone_label = "Distress Zone"
        zone_color = "red"
        description = "High financial distress risk. Historical research shows companies in this zone have an 80%+ probability of financial distress within 2 years without intervention."
        distress_probability = min(92, int(65 + (1.23 - z) * 20))

    components = [
        {"name": "Working Capital / Assets (X1)", "value": round(x1, 4), "weight": 0.717, "contribution": round(0.717*x1, 4), "meaning": "Liquidity relative to size"},
        {"name": "Equity / Assets (X2)",          "value": round(x2, 4), "weight": 0.847, "contribution": round(0.847*x2, 4), "meaning": "Cumulative profitability proxy"},
        {"name": "EBIT / Assets (X3)",             "value": round(x3, 4), "weight": 3.107, "contribution": round(3.107*x3, 4), "meaning": "Asset productivity (most powerful)"},
        {"name": "Equity / Liabilities (X4)",      "value": round(x4, 4), "weight": 0.420, "contribution": round(0.420*x4, 4), "meaning": "Solvency cushion"},
        {"name": "Revenue / Assets (X5)",          "value": round(x5, 4), "weight": 0.998, "contribution": round(0.998*x5, 4), "meaning": "Asset turn efficiency"},
    ]

    return {
        "available": True,
        "z_score": z,
        "zone": zone,
        "zone_label": zone_label,
        "zone_color": zone_color,
        "description": description,
        "distress_probability": distress_probability,
        "components": components,
        "benchmarks": {
            "safe_threshold":    2.9,
            "distress_threshold": 1.23,
        },
        "model_note": "Altman Z'-Score (1983 private-company model). Academic research accuracy: ~80–90% at predicting distress 1-2 years prior to event. Not a substitute for professional credit analysis."
    }


def compute_risk_radar(pl_data: dict, bs_data: dict) -> dict:
    """
    8-dimension risk radar — each dimension scored 0–100 (100 = safest).
    """
    ps = pl_data.get("summary", {}) if pl_data else {}
    pr = pl_data.get("ratios", {})  if pl_data else {}
    bs = bs_data.get("summary", {}) if bs_data else {}
    br = bs_data.get("ratios", {})  if bs_data else {}

    def clamp(v, lo=0, hi=100): return max(lo, min(hi, v))

    # 1. Liquidity risk (current ratio → score)
    cr = br.get("current_ratio")
    if cr is not None:
        liq = clamp(int((cr / 3.0) * 100))
    else:
        liq = 50

    # 2. Leverage / solvency risk
    dte = br.get("debt_to_equity")
    if dte is not None:
        lev = clamp(int(max(0, 100 - dte * 25)))
    else:
        dta = br.get("debt_to_assets", 0.5)
        lev = clamp(int((1 - dta) * 100))

    # 3. Profitability risk
    npm = pr.get("net_profit_margin", 0)
    prof = clamp(int(50 + npm * 2.5))   # 0%→50, 20%→100, -20%→0

    # 4. Operational efficiency (expense ratio)
    er = pr.get("expense_ratio", 80)
    eff = clamp(int((1 - er/100) * 140))   # 60%→56, 80%→28, 100%→0; scaled to 0–100

    # 5. Coverage / cash adequacy
    wc  = bs.get("working_capital", 0)
    ta  = bs.get("total_assets", 1) or 1
    wc_ratio = wc / ta
    cov = clamp(int(50 + wc_ratio * 200))

    # 6. Revenue quality proxy (gross margin as proxy for pricing power)
    gm = pr.get("gross_margin", 30)
    rev_q = clamp(int(gm * 1.4))   # 70%→98, 40%→56, 10%→14

    # 7. Balance sheet strength (equity ratio)
    eq_ratio = br.get("equity_ratio", 40)  # already in %
    if eq_ratio is not None:
        bs_str = clamp(int(eq_ratio * 1.4))
    else:
        bs_str = 40

    # 8. EBITDA margin (earnings quality)
    ebitda = ps.get("ebitda", 0)
    rev    = ps.get("total_revenue", 1) or 1
    ebitda_m = ebitda / rev * 100
    earn_q = clamp(int(50 + ebitda_m * 2))

    dimensions = [
        {"name": "Liquidity",       "score": liq,    "description": "Ability to meet short-term obligations",    "icon": "💧"},
        {"name": "Leverage",        "score": lev,    "description": "Debt burden relative to equity",            "icon": "⚖️"},
        {"name": "Profitability",   "score": prof,   "description": "Net income generation consistency",         "icon": "📈"},
        {"name": "Efficiency",      "score": eff,    "description": "Cost control relative to revenue",          "icon": "⚙️"},
        {"name": "Coverage",        "score": cov,    "description": "Working capital buffer vs. total assets",   "icon": "🛡️"},
        {"name": "Pricing Power",   "score": rev_q,  "description": "Gross margin as pricing/product strength",  "icon": "💎"},
        {"name": "Balance Sheet",   "score": bs_str, "description": "Equity proportion of the asset base",       "icon": "🏦"},
        {"name": "Earnings Quality","score": earn_q, "description": "EBITDA margin — core operating strength",   "icon": "✨"},
    ]

    overall = int(sum(d["score"] for d in dimensions) / len(dimensions))

    return {
        "dimensions": dimensions,
        "overall_score": overall,
        "overall_label": "Low Risk" if overall >= 70 else "Moderate Risk" if overall >= 45 else "High Risk",
        "overall_color": "green" if overall >= 70 else "amber" if overall >= 45 else "red",
    }


def early_warning_signals(pl_data: dict, bs_data: dict) -> list:
    """
    Detect specific financial distress patterns and return actionable warnings.
    """
    signals = []
    ps = pl_data.get("summary", {}) if pl_data else {}
    pr = pl_data.get("ratios", {})  if pl_data else {}
    bs = bs_data.get("summary", {}) if bs_data else {}
    br = bs_data.get("ratios", {})  if bs_data else {}

    # ── Profitability signals ─────────────────────────────────────────
    npm = pr.get("net_profit_margin", None)
    if npm is not None and npm < 0:
        signals.append({
            "severity": "critical",
            "category": "Profitability",
            "signal":   "Negative Net Profit Margin",
            "detail":   f"Net margin of {npm:.1f}% means the business is consuming cash. Sustained losses erode equity and lead to insolvency.",
            "action":   "Immediately identify the 3 largest controllable expense categories and create a 90-day cost reduction plan.",
        })
    elif npm is not None and npm < 3:
        signals.append({
            "severity": "warning",
            "category": "Profitability",
            "signal":   "Critically Thin Net Margin",
            "detail":   f"A {npm:.1f}% net margin leaves almost no buffer. A 2–3% revenue drop or unexpected cost would push the business into a loss.",
            "action":   "Implement weekly P&L monitoring. Consider a 5–10% price increase test on your highest-volume products/services.",
        })

    gm = pr.get("gross_margin", None)
    if gm is not None and gm < 15:
        signals.append({
            "severity": "warning",
            "category": "Cost Structure",
            "signal":   "Very Low Gross Margin",
            "detail":   f"Gross margin of {gm:.1f}% means {100-gm:.1f}¢ of every dollar goes to direct costs before any overhead. This severely limits ability to invest in growth.",
            "action":   "Audit COGS line-by-line. Explore supplier renegotiation, product mix shift, or value-based pricing.",
        })

    # ── Liquidity signals ─────────────────────────────────────────────
    cr = br.get("current_ratio", None)
    if cr is not None and cr < 1.0:
        signals.append({
            "severity": "critical",
            "category": "Liquidity",
            "signal":   "Current Ratio Below 1.0 — Liquidity Crisis Risk",
            "detail":   f"Current ratio of {cr:.2f}x means current liabilities exceed current assets by ${abs(bs.get('working_capital',0)):,.0f}. The business cannot cover near-term obligations from current assets alone.",
            "action":   "Accelerate collections, negotiate extended payables, explore a revolving credit facility. Consider asset liquidation if situation is acute.",
        })
    elif cr is not None and cr < 1.3:
        signals.append({
            "severity": "warning",
            "category": "Liquidity",
            "signal":   "Tight Liquidity Buffer",
            "detail":   f"Current ratio of {cr:.2f}x is uncomfortably low. A single large unexpected expense could trigger a cash crisis.",
            "action":   "Build a minimum 60-day cash reserve. Review accounts receivable aging — collect overdue invoices.",
        })

    wc = bs.get("working_capital", None)
    if wc is not None and wc < 0:
        signals.append({
            "severity": "critical",
            "category": "Working Capital",
            "signal":   "Negative Working Capital",
            "detail":   f"Negative working capital of ${abs(wc):,.0f} is a red flag for suppliers, lenders, and investors. It indicates the business is funding operations with short-term debt.",
            "action":   "Restructure short-term debt to long-term. Improve invoice collection speed. Negotiate net-60 or net-90 payment terms with suppliers.",
        })

    # ── Leverage signals ──────────────────────────────────────────────
    dte = br.get("debt_to_equity", None)
    if dte is not None and dte > 3.0:
        signals.append({
            "severity": "critical",
            "category": "Leverage",
            "signal":   "Dangerously High Debt-to-Equity",
            "detail":   f"D/E ratio of {dte:.2f}x means creditors own {dte:.0f}x more of the business than shareholders. At this level, any revenue disruption can make debt service impossible.",
            "action":   "Seek debt restructuring or equity injection. Avoid taking on any new debt. Engage a financial restructuring advisor.",
        })
    elif dte is not None and dte > 2.0:
        signals.append({
            "severity": "warning",
            "category": "Leverage",
            "signal":   "Elevated Leverage Risk",
            "detail":   f"D/E ratio of {dte:.2f}x is above safe thresholds for most industries. Rising interest rates could significantly increase debt service costs.",
            "action":   "Prioritize debt repayment over expansion. Review all debt covenants for potential breaches.",
        })

    # ── Equity signals ────────────────────────────────────────────────
    eq = bs.get("equity", None)
    if eq is not None and eq < 0:
        signals.append({
            "severity": "critical",
            "category": "Solvency",
            "signal":   "Negative Equity — Technical Insolvency",
            "detail":   "Total liabilities exceed total assets. The business is technically insolvent. Creditors have a claim on more than 100% of assets.",
            "action":   "This requires immediate professional intervention. Consult a restructuring advisor, insolvency specialist, or M&A advisor for recapitalization options.",
        })

    # ── Expense structure signals ─────────────────────────────────────
    er = pr.get("expense_ratio", None)
    if er is not None and er > 95:
        signals.append({
            "severity": "critical",
            "category": "Cost Structure",
            "signal":   "Expense Ratio Exceeds 95%",
            "detail":   f"Only {100-er:.1f}¢ of every revenue dollar reaches profit. The business has virtually no margin for error, growth investment, or unexpected costs.",
            "action":   "Conduct a full zero-based budgeting exercise. Every expense line must justify its existence against revenue impact.",
        })

    # ── Asset efficiency signals ──────────────────────────────────────
    ta = bs.get("total_assets", 0)
    rev = ps.get("total_revenue", 0)
    if ta > 0 and rev > 0:
        asset_turn = rev / ta
        if asset_turn < 0.3:
            signals.append({
                "severity": "warning",
                "category": "Asset Efficiency",
                "signal":   "Low Asset Turnover",
                "detail":   f"Asset turnover of {asset_turn:.2f}x suggests assets are underutilized relative to the revenue they generate. Idle assets reduce ROA and ROE.",
                "action":   "Identify underperforming or idle assets for sale or lease. Review capital allocation decisions.",
            })

    if not signals:
        signals.append({
            "severity": "positive",
            "category": "Overall",
            "signal":   "No Major Warning Signals Detected",
            "detail":   "Based on the available financial data, no significant distress indicators were found. Continue monitoring key ratios quarterly.",
            "action":   "Maintain discipline in cash management and expense control. Consider benchmarking against industry peers.",
        })

    # Sort by severity
    order = {"critical": 0, "warning": 1, "positive": 2}
    signals.sort(key=lambda x: order.get(x["severity"], 3))
    return signals


def full_risk_assessment(pl_data: dict, bs_data: dict) -> dict:
    z_result = altman_z_score(pl_data, bs_data)
    radar    = compute_risk_radar(pl_data, bs_data)
    warnings = early_warning_signals(pl_data, bs_data)

    critical_count = sum(1 for w in warnings if w["severity"] == "critical")
    warning_count  = sum(1 for w in warnings if w["severity"] == "warning")

    return {
        "altman_z":       z_result,
        "risk_radar":     radar,
        "warning_signals": warnings,
        "summary": {
            "critical_signals": critical_count,
            "warning_signals":  warning_count,
            "overall_risk_score":  radar["overall_score"],
            "overall_risk_label":  radar["overall_label"],
            "distress_probability": z_result.get("distress_probability") if z_result.get("available") else None,
        }
    }
