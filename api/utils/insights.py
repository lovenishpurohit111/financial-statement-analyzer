"""
Rule-based financial insights engine.
Generates clear, actionable insights from P&L and/or Balance Sheet data.
"""
from typing import Optional


def _insight(level: str, category: str, title: str, message: str, action: str = '') -> dict:
    """level: 'positive' | 'warning' | 'critical' | 'info'"""
    return {'level': level, 'category': category, 'title': title, 'message': message, 'action': action}


def generate_pl_insights(pl: dict) -> list:
    insights = []
    s = pl['summary']
    r = pl['ratios']

    rev    = s['total_revenue']
    profit = s['net_profit']
    gross  = s['gross_profit']
    margin = r['net_profit_margin']
    gm     = r['gross_margin']
    exp_r  = r['expense_ratio']

    # Revenue check
    if rev == 0:
        insights.append(_insight('critical', 'Revenue',
            'No Revenue Detected',
            'No revenue lines were found in your P&L. Verify the file contains income data.',
            'Check that your QuickBooks export includes the Income section.'))
        return insights

    # Profitability
    if margin >= 20:
        insights.append(_insight('positive', 'Profitability',
            'Strong Net Profit Margin',
            f'Your net profit margin is {margin:.1f}%, which is excellent. Most healthy businesses target 10–20%.',
            'Consider reinvesting profits into growth initiatives.'))
    elif margin >= 10:
        insights.append(_insight('positive', 'Profitability',
            'Healthy Profit Margin',
            f'Net profit margin of {margin:.1f}% is solid and above average for most industries.',
            'Continue monitoring expense growth to protect margins.'))
    elif margin >= 5:
        insights.append(_insight('warning', 'Profitability',
            'Thin Profit Margin',
            f'Net profit margin of {margin:.1f}% leaves little room for error. Industry average varies but 10%+ is generally healthy.',
            'Review your largest expense categories for reduction opportunities.'))
    elif margin >= 0:
        insights.append(_insight('warning', 'Profitability',
            'Very Low Profit Margin',
            f'Net profit margin of {margin:.1f}% is critically low. A small downturn could push the business into loss.',
            'Urgent: Identify your top 3 expenses and explore cost-cutting or revenue-growth strategies.'))
    else:
        insights.append(_insight('critical', 'Profitability',
            'Operating at a Loss',
            f'Your business is losing money — net loss of ${abs(profit):,.0f}. Immediate action is required.',
            'Prioritize: (1) Cut discretionary expenses, (2) Review pricing strategy, (3) Consult a financial advisor.'))

    # Gross margin
    if gm > 0:
        if gm >= 50:
            insights.append(_insight('positive', 'Cost of Goods',
                'Excellent Gross Margin',
                f'Gross margin of {gm:.1f}% indicates efficient production/service delivery.', ''))
        elif gm >= 25:
            insights.append(_insight('info', 'Cost of Goods',
                'Moderate Gross Margin',
                f'Gross margin of {gm:.1f}%. Review COGS for supplier or process optimization opportunities.', ''))
        else:
            insights.append(_insight('warning', 'Cost of Goods',
                'Low Gross Margin',
                f'Gross margin of {gm:.1f}% suggests high direct costs relative to revenue. Consider renegotiating supplier contracts or adjusting pricing.',
                'Analyze each COGS line item for potential reduction.'))

    # Expense ratio
    if exp_r >= 95:
        insights.append(_insight('critical', 'Expenses',
            'Expenses Nearly Exceed Revenue',
            f'Expense ratio of {exp_r:.1f}%: for every $1 of revenue, ${exp_r/100:.2f} is spent on costs.',
            'Immediate cost review required. Focus on fixed costs that can be renegotiated.'))
    elif exp_r >= 80:
        insights.append(_insight('warning', 'Expenses',
            'High Expense Ratio',
            f'Expense ratio of {exp_r:.1f}% leaves limited profit buffer.',
            'Review discretionary expenses and look for operational efficiencies.'))
    elif exp_r < 60:
        insights.append(_insight('positive', 'Expenses',
            'Well-Controlled Expenses',
            f'Expense ratio of {exp_r:.1f}% indicates strong cost management.', ''))

    # Top expense warning
    breakdown = pl.get('breakdown', {})
    top_exp = breakdown.get('top_expenses', [])
    if top_exp and rev > 0:
        top_name = top_exp[0]['label']
        top_val  = top_exp[0]['value']
        top_pct  = top_val / rev * 100
        if top_pct > 30:
            insights.append(_insight('warning', 'Expenses',
                f'High Concentration: {top_name}',
                f'"{top_name}" represents {top_pct:.1f}% of revenue (${top_val:,.0f}). '
                f'High concentration in a single expense creates risk.',
                f'Investigate whether "{top_name}" can be reduced or renegotiated.'))

    return insights


def generate_bs_insights(bs: dict) -> list:
    insights = []
    s = bs['summary']
    r = bs['ratios']

    cr  = r.get('current_ratio')
    dte = r.get('debt_to_equity')
    dta = r.get('debt_to_assets')
    wc  = s.get('working_capital', 0)
    eq  = s.get('equity', 0)
    ta  = s.get('total_assets', 0)
    tl  = s.get('total_liabilities', 0)

    # Liquidity
    if cr is not None:
        if cr >= 2:
            insights.append(_insight('positive', 'Liquidity',
                'Strong Liquidity Position',
                f'Current ratio of {cr:.2f} means you have ${cr:.2f} of current assets for every $1 of current debt.',
                'Consider deploying excess current assets for better returns.'))
        elif cr >= 1.2:
            insights.append(_insight('positive', 'Liquidity',
                'Adequate Liquidity',
                f'Current ratio of {cr:.2f} is within the healthy range (1.2–2.0).', ''))
        elif cr >= 1.0:
            insights.append(_insight('warning', 'Liquidity',
                'Liquidity is Tight',
                f'Current ratio of {cr:.2f} is marginally above 1. A short-term cash shortfall could create payment difficulties.',
                'Build a cash reserve. Review accounts receivable collection speed.'))
        else:
            insights.append(_insight('critical', 'Liquidity',
                'Liquidity Risk — Immediate Attention',
                f'Current ratio of {cr:.2f} means current liabilities exceed current assets. The business may struggle to meet short-term obligations.',
                'Urgently review: (1) Accounts receivable, (2) Short-term debt restructuring, (3) Credit line options.'))

    # Working capital
    if wc < 0:
        insights.append(_insight('critical', 'Working Capital',
            'Negative Working Capital',
            f'Negative working capital of ${abs(wc):,.0f} indicates current liabilities exceed current assets.',
            'Prioritize collecting receivables and consider extending payables where possible.'))
    elif wc > 0:
        insights.append(_insight('positive', 'Working Capital',
            'Positive Working Capital',
            f'Working capital of ${wc:,.0f} provides a buffer for day-to-day operations.', ''))

    # Leverage
    if dte is not None:
        if dte <= 0.5:
            insights.append(_insight('positive', 'Leverage',
                'Conservative Debt Level',
                f'Debt-to-equity ratio of {dte:.2f} shows the business is primarily equity-financed. Low financial risk.',
                'You may have capacity to take on strategic debt for growth.'))
        elif dte <= 1.5:
            insights.append(_insight('info', 'Leverage',
                'Moderate Leverage',
                f'Debt-to-equity of {dte:.2f} is within normal ranges for most industries.', ''))
        elif dte <= 3:
            insights.append(_insight('warning', 'Leverage',
                'Elevated Leverage Risk',
                f'Debt-to-equity of {dte:.2f} indicates significant borrowing relative to equity.',
                'Monitor debt service coverage. Avoid taking on additional debt without revenue growth.'))
        else:
            insights.append(_insight('critical', 'Leverage',
                'High Leverage — Financial Risk',
                f'Debt-to-equity ratio of {dte:.2f} is very high. The business is heavily dependent on debt.',
                'Debt restructuring or equity infusion may be necessary. Consult a financial advisor.'))

    # Equity
    if eq < 0:
        insights.append(_insight('critical', 'Equity',
            'Negative Equity (Insolvency Risk)',
            'Total liabilities exceed total assets — the business is technically insolvent.',
            'Immediate intervention required. Consult a financial restructuring specialist.'))
    elif eq > 0 and ta > 0:
        eq_pct = eq / ta * 100
        if eq_pct >= 50:
            insights.append(_insight('positive', 'Equity',
                'Strong Equity Base',
                f'Equity represents {eq_pct:.1f}% of total assets — a strong, resilient capital structure.', ''))

    return insights


def generate_full_insights(pl: dict, bs_current: dict, bs_previous: dict = None,
                            cash_flow: dict = None, health_score: int = None) -> list:
    insights = generate_pl_insights(pl)
    insights += generate_bs_insights(bs_current)

    # ROA / ROE insights
    net_profit = pl['summary']['net_profit']
    total_assets = bs_current['summary']['total_assets']
    equity = bs_current['summary']['equity']

    if total_assets > 0:
        roa = net_profit / total_assets * 100
        if roa >= 10:
            insights.append(_insight('positive', 'Returns',
                'Excellent Return on Assets',
                f'ROA of {roa:.1f}%: generating strong profit from asset base.', ''))
        elif roa >= 5:
            insights.append(_insight('info', 'Returns',
                'Moderate Return on Assets',
                f'ROA of {roa:.1f}%. Industry benchmarks vary; compare to sector peers.', ''))
        elif roa >= 0:
            insights.append(_insight('warning', 'Returns',
                'Low Return on Assets',
                f'ROA of {roa:.1f}% — assets are not generating sufficient profit.',
                'Review asset utilization. Idle or underperforming assets may need to be divested.'))
        else:
            insights.append(_insight('critical', 'Returns',
                'Negative Return on Assets',
                f'ROA of {roa:.1f}% — the business is destroying value.',
                'Comprehensive strategic review needed.'))

    if equity > 0:
        roe = net_profit / equity * 100
        if roe >= 15:
            insights.append(_insight('positive', 'Returns',
                'Strong Return on Equity',
                f'ROE of {roe:.1f}% — excellent shareholder value creation.', ''))
        elif roe >= 8:
            insights.append(_insight('info', 'Returns',
                'Acceptable Return on Equity',
                f'ROE of {roe:.1f}%. Could be improved through better margin management.', ''))
        elif roe >= 0:
            insights.append(_insight('warning', 'Returns',
                'Low Return on Equity',
                f'ROE of {roe:.1f}% — shareholders could earn more in lower-risk investments.',
                'Focus on improving net margins and efficient use of equity capital.'))

    # Period comparison insights
    if bs_previous:
        from . import bs_analyzer
        changes = bs_analyzer.compare(bs_current, bs_previous)
        if changes.get('equity_change') is not None:
            ec = changes['equity_change']
            if ec > 0:
                insights.append(_insight('positive', 'Growth',
                    f'Equity Growing ({ec:+.1f}%)',
                    'Business equity increased period-over-period — a positive sign of retained earnings or investment.', ''))
            elif ec < -10:
                insights.append(_insight('warning', 'Growth',
                    f'Equity Declining ({ec:+.1f}%)',
                    'Equity has decreased significantly. This may indicate losses, distributions, or asset write-downs.',
                    'Review retained earnings and dividend/drawing activity.'))

    # Health score context
    if health_score is not None:
        if health_score >= 80:
            insights.append(_insight('positive', 'Overall Health',
                f'Financial Health Score: {health_score}/100',
                'Overall financial health is strong across profitability, liquidity, and leverage dimensions.', ''))
        elif health_score >= 60:
            insights.append(_insight('info', 'Overall Health',
                f'Financial Health Score: {health_score}/100',
                'Moderate financial health. Specific areas need attention — see individual insights above.', ''))
        elif health_score >= 40:
            insights.append(_insight('warning', 'Overall Health',
                f'Financial Health Score: {health_score}/100',
                'Financial health is below average. Multiple risk factors identified.', ''))
        else:
            insights.append(_insight('critical', 'Overall Health',
                f'Financial Health Score: {health_score}/100',
                'Financial health is poor. Immediate remediation is advised.', ''))

    return insights


def compute_health_score(pl: dict, bs: dict) -> int:
    """
    Compute a 0–100 financial health score.
    Components: Profitability (35), Liquidity (30), Leverage (20), Efficiency (15)
    """
    score = 0

    # Profitability (35 pts)
    margin = pl['ratios']['net_profit_margin']
    if margin >= 20:   score += 35
    elif margin >= 10: score += 28
    elif margin >= 5:  score += 18
    elif margin >= 0:  score += 8

    # Liquidity (30 pts)
    cr = bs['ratios'].get('current_ratio')
    if cr is not None:
        if cr >= 2:    score += 30
        elif cr >= 1.5: score += 24
        elif cr >= 1.2: score += 18
        elif cr >= 1.0: score += 10
    else:
        score += 15  # neutral if no data

    # Leverage (20 pts)
    dte = bs['ratios'].get('debt_to_equity')
    if dte is not None:
        if dte <= 0.5:   score += 20
        elif dte <= 1:   score += 16
        elif dte <= 1.5: score += 11
        elif dte <= 2.5: score += 6
    else:
        score += 10  # neutral

    # Efficiency — expense ratio (15 pts)
    exp_r = pl['ratios']['expense_ratio']
    if exp_r <= 60:   score += 15
    elif exp_r <= 75: score += 11
    elif exp_r <= 85: score += 6
    elif exp_r <= 95: score += 2

    return min(max(score, 0), 100)
