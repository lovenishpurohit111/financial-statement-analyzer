"""Balance Sheet financial analysis calculations."""
from typing import Optional


def analyze(parsed: dict) -> dict:
    s = parsed.get('sections', {})

    cur_assets   = sum(i['value'] for i in s.get('current_assets', []))
    fixed_assets = sum(i['value'] for i in s.get('fixed_assets', []))
    other_assets = sum(i['value'] for i in s.get('other_assets', []))
    total_assets = cur_assets + fixed_assets + other_assets

    cur_liab     = sum(i['value'] for i in s.get('current_liabilities', []))
    lt_liab      = sum(i['value'] for i in s.get('long_term_liabilities', []))
    total_liab   = cur_liab + lt_liab

    equity       = sum(i['value'] for i in s.get('equity', []))

    # If equity not found from items, derive from accounting equation
    if equity == 0 and total_assets > 0:
        equity = total_assets - total_liab

    working_capital = cur_assets - cur_liab
    current_ratio   = round(cur_assets / cur_liab, 2) if cur_liab else None
    quick_ratio     = None   # Would need cash + receivables breakdown
    debt_to_equity  = round(total_liab / equity, 2) if equity else None
    debt_to_assets  = round(total_liab / total_assets, 2) if total_assets else None
    equity_ratio    = round(equity / total_assets * 100, 2) if total_assets else None
    asset_to_equity = round(total_assets / equity, 2) if equity else None

    return {
        'period': parsed.get('period', 'N/A'),
        'summary': {
            'current_assets':   round(cur_assets, 2),
            'fixed_assets':     round(fixed_assets, 2),
            'other_assets':     round(other_assets, 2),
            'total_assets':     round(total_assets, 2),
            'current_liabilities': round(cur_liab, 2),
            'long_term_liabilities': round(lt_liab, 2),
            'total_liabilities': round(total_liab, 2),
            'equity':           round(equity, 2),
            'working_capital':  round(working_capital, 2),
        },
        'ratios': {
            'current_ratio':    current_ratio,
            'debt_to_equity':   debt_to_equity,
            'debt_to_assets':   debt_to_assets,
            'equity_ratio':     equity_ratio,
            'asset_to_equity':  asset_to_equity,
        },
        'breakdown': {
            'current_assets':        s.get('current_assets', []),
            'fixed_assets':          s.get('fixed_assets', []),
            'other_assets':          s.get('other_assets', []),
            'current_liabilities':   s.get('current_liabilities', []),
            'long_term_liabilities': s.get('long_term_liabilities', []),
            'equity':                s.get('equity', []),
        },
    }


def compare(current: dict, previous: dict) -> dict:
    """Compare two balance sheets to compute period-over-period changes."""
    def delta(cur_val, prev_val):
        if prev_val and prev_val != 0:
            return round((cur_val - prev_val) / abs(prev_val) * 100, 2)
        return None

    c = current['summary']
    p = previous['summary']

    return {
        'total_assets_change':      delta(c['total_assets'],      p['total_assets']),
        'total_liabilities_change': delta(c['total_liabilities'],  p['total_liabilities']),
        'equity_change':            delta(c['equity'],             p['equity']),
        'working_capital_change':   delta(c['working_capital'],    p['working_capital']),
        'current_ratio_change':     delta(current['ratios'].get('current_ratio') or 0,
                                          previous['ratios'].get('current_ratio') or 0),
    }
