"""
Industry benchmarking engine.
Benchmark data sourced from: NYU Stern Damodaran dataset (2024),
CSIMarket sector averages, IBISWorld industry reports.
"""

INDUSTRY_BENCHMARKS = {
    "saas": {
        "name": "SaaS / Software",
        "icon": "💻",
        "description": "Cloud software, SaaS products, and recurring-revenue tech",
        "gross_margin":   {"excellent": 80, "good": 70, "average": 60, "poor": 45},
        "net_margin":     {"excellent": 20, "good": 12, "average": 5,  "poor": -5},
        "expense_ratio":  {"excellent": 50, "good": 65, "average": 80, "poor": 93},
        "opex_ratio":     {"excellent": 28, "good": 42, "average": 58, "poor": 75},
        "current_ratio":  {"excellent": 3.0, "good": 2.0, "average": 1.5, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.2, "good": 0.6, "average": 1.2, "poor": 2.5},
        "notes": "SaaS companies trade on Rule of 40 (growth% + profit% ≥ 40). High gross margins (70–85%) reflect low COGS. Customer acquisition cost (CAC) and churn are critical KPIs not visible in standard P&Ls.",
    },
    "professional_services": {
        "name": "Professional Services",
        "icon": "💼",
        "description": "Consulting, accounting, legal, architecture, and advisory firms",
        "gross_margin":   {"excellent": 68, "good": 55, "average": 42, "poor": 28},
        "net_margin":     {"excellent": 20, "good": 13, "average": 7,  "poor": 2},
        "expense_ratio":  {"excellent": 55, "good": 70, "average": 83, "poor": 93},
        "opex_ratio":     {"excellent": 33, "good": 46, "average": 60, "poor": 75},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.3, "poor": 0.9},
        "debt_to_equity": {"excellent": 0.2, "good": 0.5, "average": 1.0, "poor": 2.0},
        "notes": "Labor is the primary cost driver (typically 50–70% of revenue). Utilization rate and billing rate are key. Retainer-heavy revenue models outperform project-based in margin stability.",
    },
    "retail": {
        "name": "Retail (General)",
        "icon": "🛍️",
        "description": "General merchandise, specialty retail, and brick-and-mortar stores",
        "gross_margin":   {"excellent": 48, "good": 35, "average": 25, "poor": 14},
        "net_margin":     {"excellent": 8,  "good": 4,  "average": 2,  "poor": 0.5},
        "expense_ratio":  {"excellent": 58, "good": 74, "average": 88, "poor": 97},
        "opex_ratio":     {"excellent": 18, "good": 26, "average": 37, "poor": 50},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.5, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.5, "good": 1.0, "average": 1.8, "poor": 3.2},
        "notes": "Retail runs on thin margins. Inventory turnover, shrinkage, and rent as % of revenue are critical. Average net margin across retail is 2–4%. COGS dominates (typically 55–75% of revenue).",
    },
    "ecommerce": {
        "name": "E-Commerce",
        "icon": "🛒",
        "description": "Online retail, DTC brands, and digital-first commerce",
        "gross_margin":   {"excellent": 50, "good": 37, "average": 26, "poor": 14},
        "net_margin":     {"excellent": 10, "good": 5,  "average": 2,  "poor": -3},
        "expense_ratio":  {"excellent": 57, "good": 72, "average": 87, "poor": 98},
        "opex_ratio":     {"excellent": 20, "good": 30, "average": 45, "poor": 62},
        "current_ratio":  {"excellent": 2.2, "good": 1.6, "average": 1.2, "poor": 0.9},
        "debt_to_equity": {"excellent": 0.4, "good": 0.9, "average": 1.6, "poor": 3.0},
        "notes": "Fulfillment, shipping, and customer acquisition cost (CAC) heavily compress margins. Profitable e-commerce requires strong repeat purchase rates and low return rates.",
    },
    "restaurant": {
        "name": "Restaurant / Food Service",
        "icon": "🍽️",
        "description": "Full-service, QSR, cafes, catering, and food concepts",
        "gross_margin":   {"excellent": 70, "good": 62, "average": 53, "poor": 42},
        "net_margin":     {"excellent": 10, "good": 6,  "average": 3,  "poor": 0},
        "expense_ratio":  {"excellent": 64, "good": 77, "average": 88, "poor": 97},
        "opex_ratio":     {"excellent": 28, "good": 38, "average": 50, "poor": 64},
        "current_ratio":  {"excellent": 1.5, "good": 1.1, "average": 0.9, "poor": 0.6},
        "debt_to_equity": {"excellent": 0.5, "good": 1.3, "average": 2.2, "poor": 4.0},
        "notes": "Prime cost (food + labor) should be ≤ 65% of revenue. Low current ratios are normal in restaurants due to daily cash cycles. Location economics drive profitability significantly.",
    },
    "healthcare": {
        "name": "Healthcare / Medical",
        "icon": "🏥",
        "description": "Medical practices, clinics, dental, mental health, and health services",
        "gross_margin":   {"excellent": 55, "good": 43, "average": 32, "poor": 20},
        "net_margin":     {"excellent": 15, "good": 9,  "average": 4,  "poor": 1},
        "expense_ratio":  {"excellent": 60, "good": 74, "average": 87, "poor": 97},
        "opex_ratio":     {"excellent": 28, "good": 40, "average": 54, "poor": 68},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.4, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.5, "good": 1.0, "average": 1.8, "poor": 3.2},
        "notes": "Billing efficiency and collections are critical — days outstanding > 60 creates cash flow pressure. Staffing shortages and malpractice insurance are key cost pressures.",
    },
    "construction": {
        "name": "Construction",
        "icon": "🏗️",
        "description": "General contracting, specialty trades, and home building",
        "gross_margin":   {"excellent": 24, "good": 17, "average": 11, "poor": 5},
        "net_margin":     {"excellent": 8,  "good": 4,  "average": 2,  "poor": 0.5},
        "expense_ratio":  {"excellent": 72, "good": 83, "average": 92, "poor": 98},
        "opex_ratio":     {"excellent": 9,  "good": 14, "average": 21, "poor": 30},
        "current_ratio":  {"excellent": 2.0, "good": 1.5, "average": 1.2, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.5, "good": 1.1, "average": 2.0, "poor": 3.8},
        "notes": "Construction runs on thin margins (3–8% net). Project management, material cost controls, and cash flow timing (front-loaded billings) are critical to profitability.",
    },
    "manufacturing": {
        "name": "Manufacturing",
        "icon": "🏭",
        "description": "Product manufacturing, assembly, and industrial production",
        "gross_margin":   {"excellent": 38, "good": 27, "average": 18, "poor": 10},
        "net_margin":     {"excellent": 10, "good": 6,  "average": 3,  "poor": 1},
        "expense_ratio":  {"excellent": 65, "good": 78, "average": 88, "poor": 96},
        "opex_ratio":     {"excellent": 14, "good": 21, "average": 31, "poor": 44},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.4, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.5, "good": 1.2, "average": 2.0, "poor": 3.8},
        "notes": "Economies of scale heavily impact margins. Supply chain efficiency, capacity utilization, and scrap rates are key operational KPIs. Asset-heavy balance sheets are normal.",
    },
    "real_estate_services": {
        "name": "Real Estate Services",
        "icon": "🏘️",
        "description": "Property management, real estate agencies, brokerage, development",
        "gross_margin":   {"excellent": 45, "good": 35, "average": 25, "poor": 15},
        "net_margin":     {"excellent": 20, "good": 13, "average": 7,  "poor": 2},
        "expense_ratio":  {"excellent": 55, "good": 68, "average": 82, "poor": 93},
        "opex_ratio":     {"excellent": 18, "good": 28, "average": 40, "poor": 54},
        "current_ratio":  {"excellent": 2.0, "good": 1.5, "average": 1.2, "poor": 0.9},
        "debt_to_equity": {"excellent": 1.0, "good": 2.0, "average": 3.2, "poor": 5.0},
        "notes": "Transaction volume is cyclical and interest-rate sensitive. Higher D/E ratios are standard due to property leverage. Management fee revenue (from property management) is more stable than transaction commissions.",
    },
    "technology_it": {
        "name": "Technology / IT Services",
        "icon": "💡",
        "description": "IT consulting, managed services, tech hardware, and system integration",
        "gross_margin":   {"excellent": 52, "good": 40, "average": 28, "poor": 16},
        "net_margin":     {"excellent": 14, "good": 8,  "average": 3,  "poor": -2},
        "expense_ratio":  {"excellent": 60, "good": 74, "average": 87, "poor": 97},
        "opex_ratio":     {"excellent": 23, "good": 34, "average": 47, "poor": 62},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.4, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.3, "good": 0.7, "average": 1.3, "poor": 2.5},
        "notes": "Managed services / recurring revenue commands premium margins vs. project work. Hardware resale significantly reduces blended margins. Vendor certifications and talent retention drive competitive positioning.",
    },
    "logistics": {
        "name": "Logistics / Transportation",
        "icon": "🚛",
        "description": "Freight, trucking, warehousing, couriers, and supply chain",
        "gross_margin":   {"excellent": 28, "good": 20, "average": 14, "poor": 7},
        "net_margin":     {"excellent": 8,  "good": 4,  "average": 2,  "poor": 0.5},
        "expense_ratio":  {"excellent": 70, "good": 82, "average": 92, "poor": 98},
        "opex_ratio":     {"excellent": 11, "good": 17, "average": 25, "poor": 36},
        "current_ratio":  {"excellent": 2.0, "good": 1.5, "average": 1.2, "poor": 0.9},
        "debt_to_equity": {"excellent": 0.8, "good": 1.5, "average": 2.5, "poor": 4.2},
        "notes": "Fuel costs and driver availability are primary margin drivers. Asset utilization (truck/warehouse fill rates) is the key operational KPI. Fuel hedging and route optimization directly impact profitability.",
    },
    "marketing_agency": {
        "name": "Marketing / Creative Agency",
        "icon": "🎯",
        "description": "Digital marketing, advertising, PR, design, and creative agencies",
        "gross_margin":   {"excellent": 65, "good": 52, "average": 40, "poor": 27},
        "net_margin":     {"excellent": 18, "good": 12, "average": 6,  "poor": 1},
        "expense_ratio":  {"excellent": 55, "good": 68, "average": 82, "poor": 93},
        "opex_ratio":     {"excellent": 28, "good": 40, "average": 54, "poor": 68},
        "current_ratio":  {"excellent": 2.2, "good": 1.6, "average": 1.2, "poor": 0.9},
        "debt_to_equity": {"excellent": 0.2, "good": 0.5, "average": 1.0, "poor": 2.0},
        "notes": "Retainer revenue is significantly more valuable than project revenue (3x multiplier on agency valuation). Talent cost is the primary expense. Overhead ratio (non-billable time) directly impacts profitability.",
    },
    "fintech": {
        "name": "FinTech / Financial Services",
        "icon": "💳",
        "description": "Payment processing, lending, insurance, wealth management, financial tech",
        "gross_margin":   {"excellent": 72, "good": 60, "average": 48, "poor": 34},
        "net_margin":     {"excellent": 22, "good": 15, "average": 7,  "poor": -2},
        "expense_ratio":  {"excellent": 50, "good": 65, "average": 80, "poor": 92},
        "opex_ratio":     {"excellent": 26, "good": 38, "average": 53, "poor": 68},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.4, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.3, "good": 0.8, "average": 1.5, "poor": 3.0},
        "notes": "Regulatory compliance costs are a significant and growing expense. Technology infrastructure investment creates high upfront costs but scales with low marginal cost.",
    },
    "education": {
        "name": "Education / Training",
        "icon": "📚",
        "description": "Schools, tutoring, online learning, professional training, and e-learning",
        "gross_margin":   {"excellent": 62, "good": 50, "average": 38, "poor": 24},
        "net_margin":     {"excellent": 15, "good": 9,  "average": 4,  "poor": 0},
        "expense_ratio":  {"excellent": 60, "good": 74, "average": 87, "poor": 97},
        "opex_ratio":     {"excellent": 33, "good": 44, "average": 57, "poor": 72},
        "current_ratio":  {"excellent": 2.5, "good": 1.8, "average": 1.4, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.3, "good": 0.7, "average": 1.3, "poor": 2.2},
        "notes": "Online delivery dramatically improves scalability and margins vs. in-person. Instructor quality and content freshness are key competitive differentiators. Cohort retention is a leading indicator of revenue.",
    },
    "nonprofit": {
        "name": "Non-Profit / NGO",
        "icon": "🤝",
        "description": "Charitable organizations, foundations, and mission-driven entities",
        "gross_margin":   {"excellent": 75, "good": 62, "average": 50, "poor": 35},
        "net_margin":     {"excellent": 12, "good": 7,  "average": 3,  "poor": 0},
        "expense_ratio":  {"excellent": 70, "good": 80, "average": 88, "poor": 96},
        "opex_ratio":     {"excellent": 18, "good": 28, "average": 40, "poor": 54},
        "current_ratio":  {"excellent": 3.0, "good": 2.2, "average": 1.6, "poor": 1.0},
        "debt_to_equity": {"excellent": 0.1, "good": 0.3, "average": 0.7, "poor": 1.5},
        "notes": "Program expense ratio (% of budget spent on mission vs. administration) is the key metric for nonprofits. Watchdog organizations flag admin ratios >30% as a concern. Months of operating reserves is critical.",
    },
}


def get_industry_list():
    return [
        {"key": k, "name": v["name"], "icon": v["icon"], "description": v["description"]}
        for k, v in INDUSTRY_BENCHMARKS.items()
    ]


def _rate(value: float, thresholds: dict, higher_is_better: bool = True) -> str:
    e, g, a = thresholds["excellent"], thresholds["good"], thresholds["average"]
    if higher_is_better:
        if value >= e: return "excellent"
        if value >= g: return "good"
        if value >= a: return "average"
        return "poor"
    else:
        if value <= e: return "excellent"
        if value <= g: return "good"
        if value <= a: return "average"
        return "poor"


def _percentile(value: float, thresholds: dict, higher_is_better: bool = True) -> int:
    e, g, a, p = thresholds["excellent"], thresholds["good"], thresholds["average"], thresholds["poor"]
    if higher_is_better:
        if value >= e:
            return min(99, int(90 + min((value - e) / max(abs(e), 1) * 10, 9)))
        if value >= g and e != g:
            return int(70 + (value - g) / (e - g) * 20)
        if value >= a and g != a:
            return int(45 + (value - a) / (g - a) * 25)
        if value >= p and a != p:
            return int(15 + (value - p) / (a - p) * 30)
        return max(5, int(value / max(abs(p), 1) * 15))
    else:
        if value <= e:
            return min(99, int(90 + min((e - value) / max(abs(e), 0.01) * 10, 9)))
        if value <= g and g != e:
            return int(70 + (g - value) / (g - e) * 20)
        if value <= a and a != g:
            return int(45 + (a - value) / (a - g) * 25)
        if value <= p and p != a:
            return int(15 + (p - value) / (p - a) * 30)
        return max(5, 10)


def compare_to_benchmark(pl_data: dict, bs_data: dict, industry_key: str) -> dict:
    bench = INDUSTRY_BENCHMARKS.get(industry_key)
    if not bench:
        return None

    comparisons = []

    if pl_data and pl_data.get("ratios"):
        r = pl_data["ratios"]
        metrics = [
            ("Gross Margin",          r.get("gross_margin", 0),       "%", "gross_margin",  True),
            ("Net Profit Margin",     r.get("net_profit_margin", 0),  "%", "net_margin",    True),
            ("Expense Ratio",         r.get("expense_ratio", 0),      "%", "expense_ratio", False),
            ("Operating Expense %",   r.get("opex_ratio", 0),         "%", "opex_ratio",    False),
        ]
        for name, val, unit, key, higher in metrics:
            if key not in bench:
                continue
            t = bench[key]
            comparisons.append({
                "metric":   name,
                "category": "Profitability",
                "your_value":           round(val, 2),
                "unit":                 unit,
                "industry_excellent":   t["excellent"],
                "industry_good":        t["good"],
                "industry_average":     t["average"],
                "industry_poor":        t["poor"],
                "rating":               _rate(val, t, higher),
                "percentile":           _percentile(val, t, higher),
                "higher_is_better":     higher,
            })

    if bs_data and bs_data.get("ratios"):
        r = bs_data["ratios"]
        bs_metrics = [
            ("Current Ratio",   r.get("current_ratio"),   "x", "current_ratio",  True),
            ("Debt-to-Equity",  r.get("debt_to_equity"),  "x", "debt_to_equity", False),
        ]
        for name, val, unit, key, higher in bs_metrics:
            if val is None or key not in bench:
                continue
            t = bench[key]
            comparisons.append({
                "metric":   name,
                "category": "Balance Sheet",
                "your_value":           round(val, 2),
                "unit":                 unit,
                "industry_excellent":   t["excellent"],
                "industry_good":        t["good"],
                "industry_average":     t["average"],
                "industry_poor":        t["poor"],
                "rating":               _rate(val, t, higher),
                "percentile":           _percentile(val, t, higher),
                "higher_is_better":     higher,
            })

    rating_scores = {"excellent": 4, "good": 3, "average": 2, "poor": 1}
    if comparisons:
        avg_score = sum(rating_scores.get(c["rating"], 2) for c in comparisons) / len(comparisons)
        if avg_score >= 3.5:   overall = "excellent"
        elif avg_score >= 2.7: overall = "good"
        elif avg_score >= 1.8: overall = "average"
        else:                  overall = "poor"
        avg_pct = int(sum(c["percentile"] for c in comparisons) / len(comparisons))
    else:
        overall = "average"
        avg_pct = 50

    return {
        "industry":          bench["name"],
        "industry_key":      industry_key,
        "industry_notes":    bench.get("notes", ""),
        "comparisons":       comparisons,
        "overall_rating":    overall,
        "average_percentile": avg_pct,
    }
