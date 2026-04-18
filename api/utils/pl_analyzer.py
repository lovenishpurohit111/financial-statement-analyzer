"""P&L financial analysis calculations."""
from typing import Optional


def analyze(parsed: dict, entity_type: Optional[str] = None) -> dict:
    sections = parsed.get('sections', {})

    income     = sections.get('income', [])
    cogs       = sections.get('cogs', [])
    op_exp     = sections.get('operating_expenses', [])
    oth_inc    = sections.get('other_income', [])
    oth_exp    = sections.get('other_expenses', [])

    total_revenue    = sum(i['value'] for i in income)
    total_cogs       = sum(i['value'] for i in cogs)
    gross_profit     = total_revenue - total_cogs
    total_op_exp     = sum(i['value'] for i in op_exp)
    total_other_inc  = sum(i['value'] for i in oth_inc)
    total_other_exp  = sum(i['value'] for i in oth_exp)

    ebitda           = gross_profit - total_op_exp
    net_profit       = ebitda + total_other_inc - total_other_exp

    gross_margin     = (gross_profit / total_revenue * 100) if total_revenue else 0
    operating_margin = (ebitda / total_revenue * 100) if total_revenue else 0
    net_margin       = (net_profit / total_revenue * 100) if total_revenue else 0
    expense_ratio    = ((total_cogs + total_op_exp) / total_revenue * 100) if total_revenue else 0
    cogs_ratio       = (total_cogs / total_revenue * 100) if total_revenue else 0
    opex_ratio       = (total_op_exp / total_revenue * 100) if total_revenue else 0

    # Largest expense items
    all_expenses = [(i['label'], i['value']) for i in op_exp + cogs]
    all_expenses.sort(key=lambda x: x[1], reverse=True)
    top_expenses = [{'label': l, 'value': v} for l, v in all_expenses[:5]]

    return {
        'period': parsed.get('period', 'N/A'),
        'summary': {
            'total_revenue':    round(total_revenue, 2),
            'total_cogs':       round(total_cogs, 2),
            'gross_profit':     round(gross_profit, 2),
            'total_op_expenses': round(total_op_exp, 2),
            'ebitda':           round(ebitda, 2),
            'total_other_income': round(total_other_inc, 2),
            'total_other_expenses': round(total_other_exp, 2),
            'net_profit':       round(net_profit, 2),
        },
        'ratios': {
            'gross_margin':      round(gross_margin, 2),
            'operating_margin':  round(operating_margin, 2),
            'net_profit_margin': round(net_margin, 2),
            'expense_ratio':     round(expense_ratio, 2),
            'cogs_ratio':        round(cogs_ratio, 2),
            'opex_ratio':        round(opex_ratio, 2),
        },
        'breakdown': {
            'income':              income,
            'cogs':                cogs,
            'operating_expenses':  op_exp,
            'other_income':        oth_inc,
            'other_expenses':      oth_exp,
            'top_expenses':        top_expenses,
        },
    }
