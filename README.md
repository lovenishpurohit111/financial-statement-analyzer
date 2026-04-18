# 📊 Financial Statement Analyzer

A production-grade web app for analyzing QuickBooks Online financial exports.

**Tech stack:** React + Tailwind CSS (Vercel) · FastAPI + pandas (Vercel serverless)

## 🚀 Deploy on Vercel (free, no card)

1. Push repo to GitHub (done automatically)
2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
3. New Project → Import `financial-statement-analyzer`
4. Leave all settings default → Deploy

Done. App is live in ~2 minutes.

## 💻 Local Development

**Backend:**
```bash
cd api
pip install -r requirements.txt
uvicorn index:app --reload --port 8000
```

**Frontend** (new terminal):
```bash
npm install
npm start
```

Set `REACT_APP_API_URL=http://localhost:8000/api` in `frontend/.env.local` for local dev.

## 📁 Sample Files

Located in `sample_data/`:
- `sample_pl.xlsx` — Profit & Loss (Acme Consulting LLC, 2024)
- `sample_bs_current.xlsx` — Balance Sheet (Dec 31, 2024)
- `sample_bs_previous.xlsx` — Balance Sheet (Dec 31, 2023) for comparison

All files mimic QuickBooks Online export format with messy rows, subtotals, and blank lines.

## 🔍 Analysis Modes

| Mode | Files Needed | Output |
|------|-------------|--------|
| Quick P&L | 1 P&L file | Revenue, expenses, margins, insights |
| Quick BS | 1 Balance Sheet | Assets, liabilities, ratios, insights |
| Full Analysis | P&L + BS (+ optional prev BS) | All above + ROA/ROE + Cash Flow + Health Score |

## 🌍 Tax Engine

Supported countries: US, UK, CA, AU, IN

Entity types: Sole Proprietorship, Partnership, S-Corp, C-Corp

Tax is **estimated only** — always accompanied by a professional disclaimer.

## 📋 CSV Column Format

Files need two columns: Label (col A) and Amount (col B). QuickBooks exports this automatically.
