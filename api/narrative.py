"""
AI Narrative Report Generator.
Produces CFO-quality written financial analysis from structured data.
No external AI API required — pure rule-based natural language generation
with dynamic sentence construction and contextual intelligence.
"""
from datetime import datetime
from typing import Optional


def _fmt(n: float, prefix="$", decimals=0) -> str:
    if n is None: return "N/A"
    neg = n < 0
    a = abs(n)
    if a >= 1_000_000:
        s = f"{prefix}{a/1_000_000:.1f}M"
    elif a >= 1_000:
        s = f"{prefix}{a/1_000:.0f}K"
    else:
        s = f"{prefix}{a:,.{decimals}f}"
    return f"({s})" if neg else s


def _pct(n: float) -> str:
    if n is None: return "N/A"
    return f"{n:.1f}%"


def _trend_word(val: float, good_above: float = 0) -> str:
    if val > good_above + 10: return "strong"
    if val > good_above:      return "healthy"
    if val > good_above - 5:  return "thin"
    return "concerning"


def generate_narrative(
    pl_data: Optional[dict],
    bs_data: Optional[dict],
    benchmark_data: Optional[dict] = None,
    risk_data: Optional[dict] = None,
    tax_data: Optional[dict] = None,
    company_name: str = "The Company",
    period: str = "",
    industry: str = "",
) -> dict:
    """
    Generates a structured narrative report with multiple sections.
    Returns dict with section titles and prose content.
    """
    period_str = period or (pl_data or bs_data or {}).get("period", "the reporting period")
    sections = []
    generated = datetime.now().strftime("%B %d, %Y")

    # ── Executive Summary ─────────────────────────────────────────────
    exec_parts = []

    if pl_data:
        ps = pl_data.get("summary", {})
        pr = pl_data.get("ratios", {})
        rev  = ps.get("total_revenue", 0)
        net  = ps.get("net_profit", 0)
        npm  = pr.get("net_profit_margin", 0)
        gm   = pr.get("gross_margin", 0)
        er   = pr.get("expense_ratio", 0)

        if rev > 0:
            profit_status = "profitable" if net >= 0 else "operating at a loss"
            exec_parts.append(
                f"{company_name} generated total revenue of {_fmt(rev)} during {period_str}, "
                f"with a net profit of {_fmt(net)} ({_pct(npm)} net margin), "
                f"indicating a {_trend_word(npm, 5)} financial performance. "
                f"Gross margin of {_pct(gm)} reflects {'efficient' if gm >= 40 else 'tight'} "
                f"cost-of-goods management, while the overall expense ratio of {_pct(er)} "
                f"{'demonstrates disciplined overhead control' if er < 75 else 'indicates scope for operational cost improvements'}."
            )
        else:
            exec_parts.append(f"No revenue was recorded for {period_str}. Financial analysis is limited to available balance sheet data.")

    if bs_data:
        bs = bs_data.get("summary", {})
        br  = bs_data.get("ratios", {})
        ta  = bs.get("total_assets", 0)
        tl  = bs.get("total_liabilities", 0)
        eq  = bs.get("equity", 0)
        cr  = br.get("current_ratio")
        dte = br.get("debt_to_equity")
        wc  = bs.get("working_capital", 0)

        liq_desc = (
            f"a strong liquidity position (current ratio: {cr:.2f}x)" if cr and cr >= 1.5
            else f"a tight liquidity position (current ratio: {cr:.2f}x)" if cr and cr >= 1.0
            else f"a challenged liquidity position (current ratio: {cr:.2f}x)" if cr
            else "liquidity data not available"
        )
        lev_desc = (
            f"conservative leverage ({dte:.2f}x D/E)" if dte and dte <= 0.8
            else f"moderate leverage ({dte:.2f}x D/E)" if dte and dte <= 1.5
            else f"elevated leverage ({dte:.2f}x D/E)" if dte
            else "leverage data not available"
        )
        exec_parts.append(
            f"The balance sheet reflects {liq_desc} and {lev_desc}. "
            f"Total assets of {_fmt(ta)} are supported by equity of {_fmt(eq)}, "
            f"{'representing a well-capitalized structure' if eq > 0 and eq/ta > 0.4 else 'indicating reliance on debt financing' if eq > 0 else 'with equity in negative territory — a critical solvency concern'}."
        )

    if benchmark_data:
        bp = benchmark_data.get("average_percentile", 50)
        ind = benchmark_data.get("industry", industry or "its sector")
        exec_parts.append(
            f"Compared to {ind} industry benchmarks, {company_name} ranks approximately in the "
            f"{'top' if bp >= 75 else 'upper-middle' if bp >= 55 else 'lower-middle' if bp >= 35 else 'bottom'} "
            f"{'quartile' if bp >= 75 or bp < 25 else 'half'} of peers ({bp}th percentile average across key metrics)."
        )

    if risk_data:
        rs = risk_data.get("summary", {})
        z_available = risk_data.get("altman_z", {}).get("available", False)
        if z_available:
            z = risk_data["altman_z"]["z_score"]
            zone = risk_data["altman_z"]["zone_label"]
            exec_parts.append(
                f"The Altman Z'-Score of {z:.2f} places {company_name} in the {zone}, "
                f"suggesting {'low' if zone == 'Safe Zone' else 'moderate' if zone == 'Grey Zone' else 'elevated'} "
                f"financial distress risk based on publicly validated academic models."
            )

    sections.append({
        "title": "Executive Summary",
        "icon": "📋",
        "content": " ".join(exec_parts) if exec_parts else "Insufficient data to generate executive summary.",
    })

    # ── Revenue & Profitability Analysis ─────────────────────────────
    if pl_data:
        ps = pl_data.get("summary", {})
        pr = pl_data.get("ratios", {})
        bd = pl_data.get("breakdown", {})
        rev   = ps.get("total_revenue", 0)
        cogs  = ps.get("total_cogs", 0)
        gp    = ps.get("gross_profit", 0)
        opex  = ps.get("total_op_expenses", 0)
        ebitda = ps.get("ebitda", 0)
        net   = ps.get("net_profit", 0)
        gm    = pr.get("gross_margin", 0)
        npm   = pr.get("net_profit_margin", 0)
        om    = pr.get("operating_margin", 0)
        er    = pr.get("expense_ratio", 0)
        cogs_r = pr.get("cogs_ratio", 0)

        top_exp = bd.get("top_expenses", [])
        top_exp_str = ""
        if top_exp:
            te = top_exp[0]
            pct = te["value"] / rev * 100 if rev else 0
            top_exp_str = (
                f" The single largest cost item is {te['label']} at {_fmt(te['value'])} "
                f"({_pct(pct)} of revenue)"
            )
            if pct > 35:
                top_exp_str += f", which represents a concentration risk that should be monitored."
            else:
                top_exp_str += "."

        para1 = (
            f"Revenue of {_fmt(rev)} forms the top line for {period_str}. "
            f"After deducting cost of goods sold of {_fmt(cogs)} ({_pct(cogs_r)} of revenue), "
            f"the company generated a gross profit of {_fmt(gp)}, equating to a gross margin of {_pct(gm)}. "
        )
        if gm >= 50:
            para1 += "This is a strong gross margin, indicative of pricing power or low direct-cost operations. "
        elif gm >= 30:
            para1 += "This is a respectable gross margin within normal business parameters. "
        elif gm >= 15:
            para1 += "This gross margin is below average and limits flexibility for overhead absorption. "
        else:
            para1 += "This gross margin is critically low and constrains the entire profitability structure. "

        para2 = (
            f"Operating expenses of {_fmt(opex)} were incurred, producing EBITDA of {_fmt(ebitda)} "
            f"(operating margin: {_pct(om)}).{top_exp_str} "
            f"After all items, net profit stands at {_fmt(net)} ({_pct(npm)} net margin). "
        )
        if net < 0:
            para2 += (
                f"The net loss of {_fmt(abs(net))} is a material concern. Immediate strategic review of "
                f"cost structure and revenue drivers is strongly recommended."
            )
        elif npm < 5:
            para2 += "The thin net margin leaves the business highly vulnerable to revenue volatility or unexpected cost increases."
        elif npm >= 15:
            para2 += "The double-digit net margin demonstrates strong earnings power relative to revenue."

        sections.append({
            "title": "Revenue & Profitability Analysis",
            "icon": "📊",
            "content": para1 + "\n\n" + para2,
        })

    # ── Balance Sheet Analysis ────────────────────────────────────────
    if bs_data:
        bs = bs_data.get("summary", {})
        br = bs_data.get("ratios", {})
        ca  = bs.get("current_assets", 0)
        fa  = bs.get("fixed_assets", 0)
        oa  = bs.get("other_assets", 0)
        ta  = bs.get("total_assets", 0)
        cl  = bs.get("current_liabilities", 0)
        ll  = bs.get("long_term_liabilities", 0)
        tl  = bs.get("total_liabilities", 0)
        eq  = bs.get("equity", 0)
        wc  = bs.get("working_capital", 0)
        cr  = br.get("current_ratio")
        dte = br.get("debt_to_equity")
        dta = br.get("debt_to_assets")
        eq_r = br.get("equity_ratio", 0)

        asset_para = (
            f"Total assets of {_fmt(ta)} are composed of current assets ({_fmt(ca)}, "
            f"{_pct(ca/ta*100 if ta else 0)} of total), fixed assets ({_fmt(fa)}), "
            f"and other long-term assets ({_fmt(oa)}). "
        )
        if ca / ta > 0.6 if ta else False:
            asset_para += "The asset base is heavily weighted toward current assets, suggesting a relatively liquid but potentially under-invested capital structure. "
        elif fa / ta > 0.6 if ta else False:
            asset_para += "The high proportion of fixed assets indicates a capital-intensive business model. Asset utilization efficiency is a key driver of returns. "

        liab_para = (
            f"On the liabilities side, current obligations stand at {_fmt(cl)}, "
            f"with long-term liabilities of {_fmt(ll)}, bringing total liabilities to {_fmt(tl)}. "
            f"Shareholder equity of {_fmt(eq)} represents {_pct(eq_r or 0)} of total assets. "
        )
        if cr:
            liab_para += (
                f"The current ratio of {cr:.2f}x "
                f"{'provides adequate short-term coverage' if cr >= 1.5 else 'signals tight short-term liquidity' if cr >= 1.0 else 'indicates current liabilities exceed current assets — a critical concern'}. "
            )
        if dte:
            liab_para += (
                f"The debt-to-equity ratio of {dte:.2f}x indicates "
                f"{'a conservatively leveraged balance sheet' if dte <= 0.5 else 'moderate use of financial leverage' if dte <= 1.5 else 'a highly leveraged structure that amplifies both upside and risk'}."
            )

        sections.append({
            "title": "Balance Sheet Analysis",
            "icon": "🏦",
            "content": asset_para + "\n\n" + liab_para,
        })

    # ── Industry Benchmark Commentary ────────────────────────────────
    if benchmark_data and benchmark_data.get("comparisons"):
        ind_name = benchmark_data.get("industry", "industry peers")
        overall  = benchmark_data.get("overall_rating", "average")
        avg_pct  = benchmark_data.get("average_percentile", 50)
        comps    = benchmark_data.get("comparisons", [])

        strong = [c for c in comps if c["rating"] in ("excellent","good")]
        weak   = [c for c in comps if c["rating"] == "poor"]

        bench_para = (
            f"Relative to {ind_name} sector benchmarks, {company_name} demonstrates {overall} "
            f"performance with an average percentile ranking of {avg_pct}. "
        )
        if strong:
            bench_para += (
                f"Particular strengths are evident in: {', '.join(c['metric'] for c in strong[:3])} "
                f"— all of which rank above industry median. "
            )
        if weak:
            bench_para += (
                f"Areas requiring attention relative to peers include: {', '.join(c['metric'] for c in weak[:3])}. "
                f"Closing these gaps represents a concrete opportunity to improve competitive positioning. "
            )
        bench_para += benchmark_data.get("industry_notes", "")

        sections.append({
            "title": f"Industry Benchmark — {ind_name}",
            "icon": "🎯",
            "content": bench_para,
        })

    # ── Risk Assessment ───────────────────────────────────────────────
    if risk_data:
        rs    = risk_data.get("summary", {})
        radar = risk_data.get("risk_radar", {})
        z     = risk_data.get("altman_z", {})
        warns = risk_data.get("warning_signals", [])

        risk_para = ""
        if z.get("available"):
            risk_para += (
                f"The Altman Z'-Score of {z['z_score']:.2f} positions {company_name} in the {z['zone_label']}. "
                f"{z['description']} "
            )

        if radar.get("dimensions"):
            dims = radar["dimensions"]
            weakest = sorted(dims, key=lambda d: d["score"])[:2]
            strongest = sorted(dims, key=lambda d: d["score"], reverse=True)[:2]
            risk_para += (
                f"Across the 8-dimension risk radar, the overall risk score is {radar['overall_score']}/100 "
                f"({radar['overall_label']}). Strongest dimensions are {strongest[0]['name']} "
                f"({strongest[0]['score']}/100) and {strongest[1]['name']} ({strongest[1]['score']}/100). "
                f"Areas of greatest risk are {weakest[0]['name']} ({weakest[0]['score']}/100) "
                f"and {weakest[1]['name']} ({weakest[1]['score']}/100). "
            )

        crit = [w for w in warns if w["severity"] == "critical"]
        if crit:
            risk_para += (
                f"CRITICAL: {len(crit)} critical risk signal{'s' if len(crit) > 1 else ''} {'were' if len(crit) > 1 else 'was'} "
                f"identified that require immediate management attention: "
                f"{'; '.join(w['signal'] for w in crit[:2])}."
            )

        if risk_para:
            sections.append({
                "title": "Risk Assessment",
                "icon": "⚠️",
                "content": risk_para,
            })

    # ── Tax Summary ───────────────────────────────────────────────────
    if tax_data and tax_data.get("tax") is not None and tax_data.get("tax") > 0:
        tax_para = (
            f"Based on the net profit of {_fmt(tax_data.get('gross_profit', 0))} and applicable "
            f"{tax_data.get('country_description', 'tax')} rules for a {tax_data.get('entity_type', 'business entity')}, "
            f"the estimated federal tax liability is {_fmt(tax_data.get('tax', 0))} "
            f"(effective rate: {tax_data.get('effective_rate', 0):.1f}%). "
        )
        if tax_data.get("total_deductions", 0) > 0:
            tax_para += (
                f"Deductions of {_fmt(tax_data.get('total_deductions', 0))} were applied, "
                f"reducing taxable income to {_fmt(tax_data.get('taxable_income', 0))}. "
            )
        tax_para += tax_data.get("disclaimer", "")
        sections.append({
            "title": "Tax Estimate",
            "icon": "🧾",
            "content": tax_para,
        })

    # ── Strategic Recommendations ─────────────────────────────────────
    rec_parts = []
    if pl_data:
        pr = pl_data.get("ratios", {})
        if pr.get("net_profit_margin", 0) < 5:
            rec_parts.append("**Margin improvement:** Conduct a zero-based expense review and identify the 3 largest non-essential cost lines for immediate reduction.")
        if pr.get("gross_margin", 0) < 30:
            rec_parts.append("**Cost of goods:** Renegotiate supplier contracts, explore bulk purchasing, and evaluate product/service mix optimization to improve gross margin.")
        if pr.get("expense_ratio", 0) > 80:
            rec_parts.append("**Operational efficiency:** Establish a monthly expense-to-revenue ratio dashboard and set quarterly reduction targets for overhead categories.")

    if bs_data:
        br = bs_data.get("ratios", {})
        if br.get("current_ratio", 2) < 1.5:
            rec_parts.append("**Liquidity:** Implement a rolling 13-week cash flow forecast. Accelerate receivables collection and negotiate extended payable terms.")
        if br.get("debt_to_equity", 0) and br.get("debt_to_equity") > 2.0:
            rec_parts.append("**Debt management:** Prioritize debt reduction. Explore refinancing opportunities to lock in lower rates on long-term obligations.")

    if not rec_parts:
        rec_parts.append("The business demonstrates solid financial fundamentals. Focus on sustaining these results through consistent cash management, margin discipline, and reinvestment in growth initiatives.")
        rec_parts.append("Consider implementing a formal quarterly financial review process with KPI benchmarking against industry peers to identify opportunities before they become challenges.")

    rec_content = "\n\n".join(f"{i+1}. {r}" for i, r in enumerate(rec_parts))
    sections.append({
        "title": "Strategic Recommendations",
        "icon": "🚀",
        "content": rec_content,
    })

    # ── Disclaimer ────────────────────────────────────────────────────
    sections.append({
        "title": "Important Disclaimer",
        "icon": "⚖️",
        "content": (
            "This report is generated automatically from uploaded financial data and is intended for informational "
            "purposes only. It does not constitute financial, tax, legal, or investment advice. The analyses and "
            "estimates contained herein are based on the data provided and may not reflect all relevant factors. "
            "All financial decisions should be made in consultation with qualified professionals — including CPAs, "
            f"CFOs, and financial advisors. Report generated: {generated}."
        ),
    })

    return {
        "company_name": company_name,
        "period": period_str,
        "industry": industry,
        "generated": generated,
        "sections": sections,
    }
