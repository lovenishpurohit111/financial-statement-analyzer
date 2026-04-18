"""
Modular tax estimation engine.
Uses structured country/entity tax rules. Explicitly disclaims estimates.
Never guesses — returns null when data is insufficient.
"""
from typing import Optional

DISCLAIMER = (
    "⚠️ This is an estimate only and does not constitute professional tax advice. "
    "Consult a qualified tax professional or CPA before making any tax decisions."
)

# ── Structured tax rules by country + entity type ──────────────────────────
# Format: {country_code: {entity_type: {brackets: [...] | flat_rate: float, notes: str}}}
# Brackets: [(threshold, rate), ...] — marginal rates up to threshold (0 = unlimited)
# All rates are fractions (0.21 = 21%)

TAX_RULES = {
    "US": {
        "description": "United States Federal Tax",
        "sole_proprietorship": {
            "type": "individual_brackets",
            "brackets": [
                (11600,  0.10),
                (47150,  0.12),
                (100525, 0.22),
                (191950, 0.24),
                (243725, 0.32),
                (609350, 0.35),
                (0,      0.37),
            ],
            "se_tax_rate": 0.1413,  # Self-employment tax on net earnings
            "notes": "2024 federal rates for single filer. State taxes additional.",
        },
        "partnership": {
            "type": "pass_through",
            "brackets": [
                (11600,  0.10),
                (47150,  0.12),
                (100525, 0.22),
                (191950, 0.24),
                (243725, 0.32),
                (609350, 0.35),
                (0,      0.37),
            ],
            "notes": "Pass-through entity. Partners taxed at individual rates. 2024 federal.",
        },
        "s_corp": {
            "type": "pass_through",
            "brackets": [
                (11600,  0.10),
                (47150,  0.12),
                (100525, 0.22),
                (191950, 0.24),
                (243725, 0.32),
                (609350, 0.35),
                (0,      0.37),
            ],
            "notes": "Pass-through entity. Shareholders pay individual rates. Corporate-level taxes may apply in some states. 2024 federal.",
        },
        "c_corp": {
            "type": "flat",
            "rate": 0.21,
            "notes": "Flat 21% federal corporate income tax rate (Tax Cuts and Jobs Act 2017). State taxes additional (avg 4–9%).",
        },
    },
    "UK": {
        "description": "United Kingdom Tax",
        "sole_proprietorship": {
            "type": "individual_brackets",
            "brackets": [
                (12570,  0.0),
                (50270,  0.20),
                (125140, 0.40),
                (0,      0.45),
            ],
            "notes": "2024/25 UK Income Tax rates for England/Wales. National Insurance additional.",
        },
        "partnership": {
            "type": "pass_through",
            "brackets": [
                (12570,  0.0),
                (50270,  0.20),
                (125140, 0.40),
                (0,      0.45),
            ],
            "notes": "Partners taxed at individual Income Tax rates. 2024/25 UK rates.",
        },
        "limited_company": {
            "type": "tiered",
            "tiers": [
                (50000,  0.19),
                (250000, "marginal"),  # 19–25% marginal relief
                (0,      0.25),
            ],
            "notes": "UK Corporation Tax 2024: 19% for profits ≤£50k, 25% for profits ≥£250k, marginal relief between.",
        },
    },
    "CA": {
        "description": "Canada Federal Tax",
        "sole_proprietorship": {
            "type": "individual_brackets",
            "brackets": [
                (55867,  0.15),
                (111733, 0.205),
                (154906, 0.26),
                (220000, 0.29),
                (0,      0.33),
            ],
            "notes": "2024 Canada federal income tax rates. Provincial taxes additional.",
        },
        "corporation": {
            "type": "flat",
            "rate": 0.15,
            "ccpc_rate": 0.09,
            "notes": "Federal corporate rate 15% (general) or 9% for Canadian-Controlled Private Corporations (CCPC) on first $500k active business income. Provincial taxes additional.",
        },
    },
    "AU": {
        "description": "Australia Tax",
        "sole_trader": {
            "type": "individual_brackets",
            "brackets": [
                (18200,  0.0),
                (45000,  0.19),
                (120000, 0.325),
                (180000, 0.37),
                (0,      0.45),
            ],
            "notes": "2024–25 Australian individual income tax rates. Medicare levy (2%) additional.",
        },
        "company": {
            "type": "flat",
            "rate": 0.30,
            "base_rate": 0.25,
            "notes": "Base rate entity (turnover < A$50M, ≤80% passive income): 25%. Other companies: 30%.",
        },
    },
    "IN": {
        "description": "India Tax",
        "individual": {
            "type": "individual_brackets",
            "brackets": [
                (300000,  0.0),
                (600000,  0.05),
                (900000,  0.10),
                (1200000, 0.15),
                (1500000, 0.20),
                (0,       0.30),
            ],
            "notes": "New Tax Regime 2024–25. Surcharge and cess additional. Old regime rates differ.",
        },
        "private_limited": {
            "type": "flat",
            "rate": 0.22,
            "notes": "Domestic company under Section 115BAA: 22% base + 10% surcharge + 4% cess = effective ~25.17%.",
        },
        "llp": {
            "type": "flat",
            "rate": 0.30,
            "notes": "LLP taxed at flat 30% + surcharge + cess.",
        },
    },
}

ENTITY_MAP = {
    "sole_proprietorship": ["sole_proprietorship", "sole_trader", "individual"],
    "partnership":         ["partnership"],
    "s_corp":              ["s_corp"],
    "c_corp":              ["c_corp", "corporation", "limited_company", "private_limited", "company"],
    "llp":                 ["llp"],
}


def _bracket_tax(income: float, brackets: list) -> tuple:
    """Calculate marginal bracket tax. Returns (tax, effective_rate, breakdown)."""
    tax = 0.0
    prev_threshold = 0
    breakdown = []
    for threshold, rate in brackets:
        if threshold == 0:
            taxable = max(income - prev_threshold, 0)
            chunk = taxable * rate
            tax += chunk
            breakdown.append({
                'bracket': f'Above ${prev_threshold:,.0f}',
                'rate': f'{rate*100:.1f}%',
                'taxable_amount': round(taxable, 2),
                'tax': round(chunk, 2),
            })
            break
        taxable = max(min(income, threshold) - prev_threshold, 0)
        chunk = taxable * rate
        tax += chunk
        if taxable > 0:
            breakdown.append({
                'bracket': f'${prev_threshold:,.0f} – ${threshold:,.0f}',
                'rate': f'{rate*100:.1f}%',
                'taxable_amount': round(taxable, 2),
                'tax': round(chunk, 2),
            })
        prev_threshold = threshold
        if income <= threshold:
            break
    effective = tax / income if income > 0 else 0
    return round(tax, 2), round(effective * 100, 2), breakdown


def estimate(
    net_profit: float,
    country: Optional[str],
    entity_type: Optional[str],
) -> dict:
    """
    Estimate tax for given profit, country, and entity type.
    Returns structured result with rate, amount, explanation, disclaimer.
    """
    if not entity_type or entity_type.lower() in ('', 'not_specified', 'none'):
        return {
            'tax': None,
            'entity_type': None,
            'message': 'Entity type not provided. Tax estimation skipped.',
            'prompt': 'Select an entity type to unlock tax insights.',
            'disclaimer': DISCLAIMER,
        }

    if not country:
        return {
            'tax': None,
            'message': 'Country not specified. Cannot determine applicable tax rules.',
            'disclaimer': DISCLAIMER,
        }

    country_upper = country.upper().strip()
    if country_upper not in TAX_RULES:
        return {
            'tax': None,
            'message': f'Tax rules for "{country}" are not yet available in our database.',
            'disclaimer': DISCLAIMER,
            'supported_countries': list(TAX_RULES.keys()),
        }

    if net_profit <= 0:
        return {
            'tax': 0,
            'effective_rate': 0,
            'message': 'No taxable income (net profit ≤ 0). No tax liability estimated.',
            'disclaimer': DISCLAIMER,
        }

    country_rules = TAX_RULES[country_upper]
    # Find matching entity rule
    entity_l = entity_type.lower().replace(' ', '_').replace('-', '_')
    rule = None
    for rule_key, rule_val in country_rules.items():
        if rule_key == 'description':
            continue
        if entity_l == rule_key:
            rule = rule_val
            break
        for alias in ENTITY_MAP.get(entity_l, []):
            if alias == rule_key:
                rule = rule_val
                break
        if rule:
            break

    if not rule:
        available = [k for k in country_rules.keys() if k != 'description']
        return {
            'tax': None,
            'message': f'Entity type "{entity_type}" not found for {country_upper}. '
                       f'Available: {", ".join(available)}',
            'disclaimer': DISCLAIMER,
        }

    # Calculate tax
    tax_amount = 0.0
    effective_rate = 0.0
    bracket_breakdown = []
    notes = rule.get('notes', '')
    explanation_parts = []

    if rule['type'] == 'flat':
        rate = rule['rate']
        tax_amount = net_profit * rate
        effective_rate = rate * 100
        explanation_parts.append(f'Flat rate of {rate*100:.1f}% applied to net profit of ${net_profit:,.2f}.')

    elif rule['type'] in ('individual_brackets', 'pass_through'):
        tax_amount, effective_rate, bracket_breakdown = _bracket_tax(net_profit, rule['brackets'])
        explanation_parts.append(f'Marginal tax brackets applied to net profit of ${net_profit:,.2f}.')
        if rule['type'] == 'pass_through':
            explanation_parts.append('Pass-through entity: income taxed at owner\'s personal rate.')
        if 'se_tax_rate' in rule:
            se_tax = net_profit * 0.9235 * rule['se_tax_rate']
            tax_amount += se_tax
            explanation_parts.append(f'Self-employment tax (≈{rule["se_tax_rate"]*100:.1f}% on 92.35% of net): ${se_tax:,.2f}.')

    elif rule['type'] == 'tiered':
        # UK-style tiered
        tiers = rule['tiers']
        if net_profit <= 50000:
            rate = tiers[0][1]
            tax_amount = net_profit * rate
            effective_rate = rate * 100
            explanation_parts.append(f'Profits ≤ £50,000: flat rate {rate*100:.0f}%.')
        elif net_profit <= 250000:
            # Marginal relief formula: 25% - (250000 - profit) * 3/200
            marginal_rate = 0.25 - (250000 - net_profit) * 3 / 200 / net_profit
            tax_amount = net_profit * marginal_rate
            effective_rate = marginal_rate * 100
            explanation_parts.append(f'Profits between £50,000–£250,000: marginal relief applies. Effective rate ≈{effective_rate:.1f}%.')
        else:
            tax_amount = net_profit * 0.25
            effective_rate = 25.0
            explanation_parts.append('Profits ≥ £250,000: flat rate 25%.')

    explanation = ' '.join(explanation_parts)
    if notes:
        explanation += f' Note: {notes}'

    return {
        'country': country_upper,
        'country_description': country_rules.get('description', ''),
        'entity_type': entity_type,
        'net_profit': round(net_profit, 2),
        'tax': round(tax_amount, 2),
        'effective_rate': round(effective_rate, 2),
        'bracket_breakdown': bracket_breakdown,
        'explanation': explanation,
        'disclaimer': DISCLAIMER,
    }
