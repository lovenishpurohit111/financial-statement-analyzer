"""
Scenario Simulator + Burn Rate & Runway Engine.
"""
from typing import Optional


# ── SCENARIO SIMULATOR ────────────────────────────────────────────────────────

def run_scenario(pl_data: dict, scenario: dict) -> dict:
    """
    Apply a scenario (revenue change + cost changes) to a P&L and return
    projected financials with delta vs baseline.
    
    scenario keys:
      revenue_change_pct   : float  — % change to total revenue (+20 = +20%)
      cogs_change_pct      : float  — % change to COGS
      opex_change_pct      : float  — % change to operating expenses
      label                : str    — scenario name
      description          : str    — scenario description
    """
    if not pl_data:
        return {"error": "P&L data required for scenario simulation."}

    ps = pl_data.get("summary", {})
    rev_base   = ps.get("total_revenue",      0)
    cogs_base  = ps.get("total_cogs",         0)
    opex_base  = ps.get("total_op_expenses",  0)
    oi_base    = ps.get("total_other_income", 0)
    oe_base    = ps.get("total_other_expenses", 0)
    net_base   = ps.get("net_profit",         0)

    rev_pct  = float(scenario.get("revenue_change_pct",  0)) / 100
    cogs_pct = float(scenario.get("cogs_change_pct",     0)) / 100
    opex_pct = float(scenario.get("opex_change_pct",     0)) / 100

    rev_new   = rev_base  * (1 + rev_pct)
    cogs_new  = cogs_base * (1 + cogs_pct)
    opex_new  = opex_base * (1 + opex_pct)
    gp_new    = rev_new - cogs_new
    ebitda_new = gp_new - opex_new
    net_new   = ebitda_new + oi_base - oe_base

    def pct(a, b): return round(a / b * 100, 2) if b else 0
    def delta(new, old): return round(new - old, 2)
    def delta_pct(new, old): return round((new - old) / abs(old) * 100, 2) if old else None

    return {
        "label":       scenario.get("label", "Custom Scenario"),
        "description": scenario.get("description", ""),
        "assumptions": {
            "revenue_change_pct": scenario.get("revenue_change_pct", 0),
            "cogs_change_pct":    scenario.get("cogs_change_pct",    0),
            "opex_change_pct":    scenario.get("opex_change_pct",    0),
        },
        "projected": {
            "total_revenue":      round(rev_new,   2),
            "total_cogs":         round(cogs_new,  2),
            "gross_profit":       round(gp_new,    2),
            "total_op_expenses":  round(opex_new,  2),
            "ebitda":             round(ebitda_new, 2),
            "net_profit":         round(net_new,   2),
            "gross_margin":       pct(gp_new, rev_new),
            "net_margin":         pct(net_new, rev_new),
            "expense_ratio":      pct(cogs_new + opex_new, rev_new),
        },
        "deltas": {
            "revenue":    {"abs": delta(rev_new, rev_base),   "pct": delta_pct(rev_new, rev_base)},
            "cogs":       {"abs": delta(cogs_new, cogs_base), "pct": delta_pct(cogs_new, cogs_base)},
            "opex":       {"abs": delta(opex_new, opex_base), "pct": delta_pct(opex_new, opex_base)},
            "net_profit": {"abs": delta(net_new, net_base),   "pct": delta_pct(net_new, net_base)},
            "gross_margin_pts": round(pct(gp_new, rev_new) - pct(rev_base - cogs_base, rev_base), 2),
            "net_margin_pts":   round(pct(net_new, rev_new) - pct(net_base, rev_base), 2),
        },
        "baseline": {
            "total_revenue":     round(rev_base,  2),
            "total_cogs":        round(cogs_base, 2),
            "total_op_expenses": round(opex_base, 2),
            "net_profit":        round(net_base,  2),
            "gross_margin":      pct(rev_base - cogs_base, rev_base),
            "net_margin":        pct(net_base, rev_base),
        },
    }


def preset_scenarios(pl_data: dict) -> list:
    """Return a set of ready-made business scenario presets."""
    return [
        run_scenario(pl_data, {
            "label":               "Optimistic Growth",
            "description":         "Revenue grows 20%, costs increase at half the rate due to operating leverage.",
            "revenue_change_pct":  20,
            "cogs_change_pct":     10,
            "opex_change_pct":     8,
        }),
        run_scenario(pl_data, {
            "label":               "Recession Scenario",
            "description":         "Revenue drops 20% while fixed costs remain mostly unchanged.",
            "revenue_change_pct":  -20,
            "cogs_change_pct":     -10,
            "opex_change_pct":     -5,
        }),
        run_scenario(pl_data, {
            "label":               "Cost Optimization",
            "description":         "Revenue flat, COGS reduced 10% (supplier renegotiation), OpEx cut 15% (lean initiative).",
            "revenue_change_pct":  0,
            "cogs_change_pct":     -10,
            "opex_change_pct":     -15,
        }),
        run_scenario(pl_data, {
            "label":               "Price Increase +10%",
            "description":         "10% price increase across the board; volume impact modeled as -3% unit reduction.",
            "revenue_change_pct":  6.7,   # net of volume loss: 1.10 × 0.97 - 1 ≈ 6.7%
            "cogs_change_pct":     -3,    # fewer units
            "opex_change_pct":     0,
        }),
        run_scenario(pl_data, {
            "label":               "Hiring Surge",
            "description":         "Business invests heavily in headcount (+30% OpEx) to drive 25% revenue growth next period.",
            "revenue_change_pct":  25,
            "cogs_change_pct":     15,
            "opex_change_pct":     30,
        }),
        run_scenario(pl_data, {
            "label":               "Break-Even Analysis",
            "description":         "Revenue reduced to break-even — how far can revenue drop before losses begin?",
            "revenue_change_pct":  _break_even_revenue_drop(pl_data),
            "cogs_change_pct":     0,
            "opex_change_pct":     0,
        }),
    ]


def _break_even_revenue_drop(pl_data: dict) -> float:
    """Calculate the % revenue drop that brings net profit to zero."""
    ps = pl_data.get("summary", {})
    rev  = ps.get("total_revenue", 0)
    net  = ps.get("net_profit", 0)
    if rev <= 0 or net <= 0:
        return 0.0
    # At break-even: revenue - cogs - opex + other = 0
    # Simplified: drop = net / rev * 100
    drop = net / rev * 100
    return round(-drop, 2)


# ── BURN RATE & RUNWAY ────────────────────────────────────────────────────────

def compute_runway(pl_data: dict, bs_data: dict, cash_on_hand: Optional[float] = None) -> dict:
    """
    Compute monthly burn rate, cash runway, and break-even analysis.
    
    Burn rate = total monthly cash outflows (expenses)
    Runway    = cash on hand / net monthly burn (if burning cash)
    Break-even = revenue needed to cover all costs
    """
    if not pl_data:
        return {"error": "P&L data required for runway calculation."}

    ps = pl_data.get("summary", {})
    rev_annual  = ps.get("total_revenue",      0)
    cogs_annual = ps.get("total_cogs",         0)
    opex_annual = ps.get("total_op_expenses",  0)
    net_annual  = ps.get("net_profit",         0)
    oi_annual   = ps.get("total_other_income", 0)
    oe_annual   = ps.get("total_other_expenses", 0)

    # Monthly figures (assume annual P&L)
    rev_mo   = rev_annual  / 12
    cogs_mo  = cogs_annual / 12
    opex_mo  = opex_annual / 12
    oi_mo    = oi_annual   / 12
    oe_mo    = oe_annual   / 12

    total_costs_mo = cogs_mo + opex_mo + oe_mo
    net_mo = rev_mo - total_costs_mo + oi_mo

    # Fixed vs variable cost split (heuristic: COGS is mostly variable, OpEx 60% fixed)
    variable_cost_mo = cogs_mo + opex_mo * 0.4
    fixed_cost_mo    = opex_mo * 0.6 + oe_mo
    variable_cogs_ratio = cogs_mo / rev_mo if rev_mo else 0  # COGS as % of each revenue dollar

    # Break-even revenue: Fixed costs / (1 - variable cost ratio)
    contribution_margin = 1 - variable_cogs_ratio - (opex_mo * 0.4 / rev_mo if rev_mo else 0)
    break_even_mo = fixed_cost_mo / contribution_margin if contribution_margin > 0 else None
    break_even_annual = break_even_mo * 12 if break_even_mo else None

    # Burn and runway
    is_burning = net_mo < 0
    gross_burn_mo = total_costs_mo  # always positive
    net_burn_mo   = abs(net_mo) if is_burning else 0

    # Cash position — try to pull from balance sheet if not provided
    if cash_on_hand is None and bs_data:
        bsbd = bs_data.get("breakdown", {})
        ca_items = bsbd.get("current_assets", [])
        for item in ca_items:
            lbl = item["label"].lower()
            if any(k in lbl for k in ["cash", "bank", "checking", "savings"]):
                cash_on_hand = item["value"]
                break

    runway_months = None
    runway_label  = None
    if cash_on_hand is not None and cash_on_hand > 0:
        if is_burning and net_burn_mo > 0:
            runway_months = round(cash_on_hand / net_burn_mo, 1)
            if runway_months < 3:
                runway_label = "Critical — less than 3 months"
            elif runway_months < 6:
                runway_label = "Warning — 3–6 months"
            elif runway_months < 12:
                runway_label = "Caution — 6–12 months"
            else:
                runway_label = f"Stable — {runway_months:.0f} months"
        else:
            runway_months = None
            runway_label = "Not applicable — business is cash-flow positive"

    # Months to profitability (if burning)
    # Simple model: assume net burn reduces linearly if revenue grows at 5% / month
    months_to_breakeven = None
    if is_burning and rev_mo > 0 and break_even_mo:
        gap = break_even_mo - rev_mo
        if gap > 0:
            months_to_breakeven = round(gap / (rev_mo * 0.05), 1)  # at 5% monthly growth

    # Survival scenarios
    survival = []
    if cash_on_hand and is_burning:
        # Scenario: cut opex 20%
        new_burn = (cogs_mo + opex_mo * 0.8 + oe_mo - rev_mo - oi_mo)
        if new_burn > 0:
            survival.append({
                "action": "Cut operating expenses 20%",
                "new_monthly_burn": round(new_burn, 2),
                "extended_runway_months": round(cash_on_hand / new_burn, 1) if new_burn > 0 else None,
            })
        # Scenario: grow revenue 15%
        new_net = (rev_mo * 1.15 - cogs_mo * 1.1 - opex_mo + oi_mo - oe_mo)
        if new_net < 0:
            survival.append({
                "action": "Grow revenue 15% (with proportional COGS increase)",
                "new_monthly_burn": round(abs(new_net), 2),
                "extended_runway_months": round(cash_on_hand / abs(new_net), 1) if new_net < 0 else None,
            })

    return {
        "period_assumption": "Annual P&L divided by 12 for monthly estimates",
        "monthly": {
            "revenue":          round(rev_mo,          2),
            "cogs":             round(cogs_mo,         2),
            "operating_expenses": round(opex_mo,       2),
            "total_costs":      round(total_costs_mo,  2),
            "net_cash_flow":    round(net_mo,          2),
            "gross_burn":       round(gross_burn_mo,   2),
            "fixed_costs":      round(fixed_cost_mo,   2),
            "variable_costs":   round(variable_cost_mo, 2),
        },
        "is_burning":           is_burning,
        "net_burn_monthly":     round(net_burn_mo, 2) if is_burning else 0,
        "cash_on_hand":         cash_on_hand,
        "runway_months":        runway_months,
        "runway_label":         runway_label,
        "break_even": {
            "monthly_revenue_needed": round(break_even_mo,    2) if break_even_mo else None,
            "annual_revenue_needed":  round(break_even_annual, 2) if break_even_annual else None,
            "months_to_breakeven":    months_to_breakeven,
            "gap_from_current":       round(break_even_mo - rev_mo, 2) if break_even_mo else None,
            "contribution_margin_pct": round(contribution_margin * 100, 2),
        },
        "survival_scenarios":   survival,
    }
