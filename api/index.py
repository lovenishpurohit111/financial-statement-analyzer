from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json

from utils.parser import parse_file
from utils import pl_analyzer, bs_analyzer, insights as insights_engine, tax_engine

app = FastAPI(title="Financial Statement Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Upload + Detect ──────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    """Upload a file, detect type, parse, return structured data."""
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(400, "Only CSV or Excel files (.csv, .xlsx, .xls) are supported.")

    contents = await file.read()
    try:
        parsed = parse_file(contents, file.filename)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to parse file: {str(e)}")

    return {
        "filename": file.filename,
        "detected_type": parsed["type"],
        "detected_label": "Profit & Loss" if parsed["type"] == "pl" else "Balance Sheet",
        "period": parsed.get("period", "N/A"),
        "parsed_data": parsed,
    }


# ── P&L Analysis ─────────────────────────────────────────────────────────────

class PLRequest(BaseModel):
    parsed_data: dict
    entity_type: Optional[str] = None
    country: Optional[str] = None


@app.post("/api/analyze/pl")
def analyze_pl(req: PLRequest):
    try:
        analysis = pl_analyzer.analyze(req.parsed_data, req.entity_type)
        generated_insights = insights_engine.generate_pl_insights(analysis)
        tax = tax_engine.estimate(
            net_profit=analysis['summary']['net_profit'],
            country=req.country,
            entity_type=req.entity_type,
        )
        return {
            "analysis_type": "pl",
            "analysis": analysis,
            "insights": generated_insights,
            "tax": tax,
        }
    except Exception as e:
        raise HTTPException(500, f"P&L analysis failed: {str(e)}")


# ── Balance Sheet Analysis ────────────────────────────────────────────────────

class BSRequest(BaseModel):
    parsed_data: dict


@app.post("/api/analyze/bs")
def analyze_bs(req: BSRequest):
    try:
        analysis = bs_analyzer.analyze(req.parsed_data)
        generated_insights = insights_engine.generate_bs_insights(analysis)
        return {
            "analysis_type": "bs",
            "analysis": analysis,
            "insights": generated_insights,
        }
    except Exception as e:
        raise HTTPException(500, f"Balance Sheet analysis failed: {str(e)}")


# ── Full Analysis (P&L + BS current + BS previous optional) ─────────────────

class FullRequest(BaseModel):
    pl_data: dict
    bs_current_data: dict
    bs_previous_data: Optional[dict] = None
    entity_type: Optional[str] = None
    country: Optional[str] = None


@app.post("/api/analyze/full")
def analyze_full(req: FullRequest):
    try:
        pl_analysis  = pl_analyzer.analyze(req.pl_data, req.entity_type)
        bs_current   = bs_analyzer.analyze(req.bs_current_data)
        bs_previous  = bs_analyzer.analyze(req.bs_previous_data) if req.bs_previous_data else None

        # ROA, ROE
        net_profit   = pl_analysis['summary']['net_profit']
        total_assets = bs_current['summary']['total_assets']
        equity       = bs_current['summary']['equity']

        roa = round(net_profit / total_assets * 100, 2) if total_assets else None
        roe = round(net_profit / equity * 100, 2) if equity else None

        # Cash Flow Statement (Indirect Method)
        # Operating CF = Net Profit + Non-cash adjustments + WC changes
        dep_exp = next(
            (i['value'] for i in req.pl_data.get('sections', {}).get('other_expenses', [])
             if 'depreciat' in i['label'].lower() or 'amortiz' in i['label'].lower()),
            0
        )

        wc_current  = bs_current['summary']['working_capital']
        wc_previous = bs_previous['summary']['working_capital'] if bs_previous else None
        wc_change   = round(wc_current - wc_previous, 2) if wc_previous is not None else None

        operating_cf  = round(net_profit + dep_exp + (wc_change or 0), 2)
        investing_cf  = round(-bs_current['summary']['fixed_assets'] * 0.1, 2)  # est. capex
        financing_cf  = None  # would need more data
        net_cf        = round(operating_cf + investing_cf, 2) if investing_cf else operating_cf

        cash_flow = {
            "operating": operating_cf,
            "investing": investing_cf,
            "financing": financing_cf,
            "net_cash_flow": net_cf,
            "notes": "Cash flow estimated using Indirect Method. Investing CF is an approximation based on fixed assets. For precise figures, use a dedicated Cash Flow Statement."
        }

        # Health Score
        health = insights_engine.compute_health_score(pl_analysis, bs_current)

        # Balance sheet comparison
        comparison = bs_analyzer.compare(bs_current, bs_previous) if bs_previous else None

        # Full insights
        full_insights = insights_engine.generate_full_insights(
            pl_analysis, bs_current, bs_previous, cash_flow, health
        )

        # Tax
        tax = tax_engine.estimate(net_profit, req.country, req.entity_type)

        return {
            "analysis_type": "full",
            "pl_analysis":   pl_analysis,
            "bs_current":    bs_current,
            "bs_previous":   bs_previous,
            "returns": {
                "roa": roa,
                "roe": roe,
                "net_profit": net_profit,
                "total_assets": total_assets,
                "equity": equity,
            },
            "cash_flow":        cash_flow,
            "balance_sheet_comparison": comparison,
            "health_score":     health,
            "insights":         full_insights,
            "tax":              tax,
        }
    except Exception as e:
        raise HTTPException(500, f"Full analysis failed: {str(e)}")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Financial Statement Analyzer API"}


@app.get("/api/tax/countries")
def tax_countries():
    return {"supported_countries": list(tax_engine.TAX_RULES.keys())}
