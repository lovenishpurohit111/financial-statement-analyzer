"""
QuickBooks Online export parser.
Handles messy XLSX/CSV with blank rows, headers, subtotals, hierarchical structure.
Auto-detects P&L vs Balance Sheet.
"""
import pandas as pd
import numpy as np
import re
import io
from typing import Optional, Tuple

# ── Detection keywords ─────────────────────────────────────────────────────
PL_TITLE_KW   = ["profit", "loss", "income statement", "p&l", "p & l"]
BS_TITLE_KW   = ["balance sheet", "statement of financial position"]
PL_SECTION_KW = ["income", "revenue", "sales", "expenses", "cost of goods",
                  "cogs", "gross profit", "operating"]
BS_SECTION_KW = ["assets", "liabilities", "equity", "stockholder", "shareholder"]

SUBTOTAL_PREFIXES = [
    "total", "net ", "gross profit", "gross loss", "net income", "net loss",
    "total income", "total expenses", "total revenue", "total assets",
    "total liabilities", "total equity", "total current", "total fixed",
    "total other", "total cost", "total operating", "net operating",
    "liabilities and equity", "total liabilities and equity",
    "total stockholder", "total shareholder",
]


def _is_subtotal(label: str) -> bool:
    label_l = label.strip().lower()
    return any(label_l.startswith(p) for p in SUBTOTAL_PREFIXES)


def _clean_value(val) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return None if np.isnan(val) else float(val)
    s = str(val).strip()
    if not s or s.lower() in ('nan', 'none', '', '-'):
        return None
    s = re.sub(r'[$,£€₹\s]', '', s)
    s = s.replace('(', '-').replace(')', '')
    try:
        return float(s)
    except ValueError:
        return None


def _read_file(contents: bytes, filename: str) -> pd.DataFrame:
    if filename.lower().endswith('.csv'):
        return pd.read_csv(io.BytesIO(contents), header=None, dtype=str, encoding='utf-8-sig')
    else:
        return pd.read_excel(io.BytesIO(contents), header=None, dtype=str)


def detect_file_type(df: pd.DataFrame) -> str:
    all_text = ' '.join(
        cell.lower() for cell in df.values.flatten()
        if isinstance(cell, str) and cell.strip()
    )
    if any(kw in all_text for kw in PL_TITLE_KW):
        return 'pl'
    if any(kw in all_text for kw in BS_TITLE_KW):
        return 'bs'
    pl_score = sum(1 for kw in PL_SECTION_KW if kw in all_text)
    bs_score = sum(1 for kw in BS_SECTION_KW if kw in all_text)
    if pl_score > bs_score:
        return 'pl'
    if bs_score > pl_score:
        return 'bs'
    return 'unknown'


def _find_value_col(df: pd.DataFrame) -> int:
    best_col, best_count = df.shape[1] - 1, 0
    for ci in range(df.shape[1] - 1, -1, -1):
        count = sum(1 for v in df.iloc[:, ci] if _clean_value(v) is not None)
        if count > best_count:
            best_count, best_col = count, ci
    return best_col


def _extract_rows(df: pd.DataFrame) -> list:
    value_col = _find_value_col(df)
    rows = []
    for _, row in df.iterrows():
        raw = str(row.iloc[0]) if not pd.isna(row.iloc[0]) else ''
        label = raw.strip()
        if not label or label.lower() in ('nan', 'none'):
            continue
        indent = len(raw) - len(raw.lstrip(' '))
        val = _clean_value(row.iloc[value_col]) if value_col < len(row) else None
        rows.append({'label': label, 'value': val, 'indent': indent})
    return rows


def _classify_pl_section(label_l: str) -> Optional[str]:
    if any(k in label_l for k in ['income', 'revenue', 'sales', 'service fee', 'consulting']):
        return 'income'
    if any(k in label_l for k in ['cost of goods', 'cogs', 'cost of sales', 'cost of revenue']):
        return 'cogs'
    if any(k in label_l for k in ['operating expense', 'expense', 'overhead', 'selling',
                                    'general', 'administrative', 'sg&a', 'payroll', 'wages']):
        return 'operating_expenses'
    if 'other income' in label_l or 'non-operating income' in label_l:
        return 'other_income'
    if any(k in label_l for k in ['other expense', 'interest expense', 'depreciation', 'amortization']):
        return 'other_expenses'
    return None


def _classify_bs_section(label_l: str) -> Optional[str]:
    if 'current asset' in label_l:
        return 'current_assets'
    if any(k in label_l for k in ['fixed asset', 'property', 'equipment', 'ppe',
                                    'non-current asset', 'long-term asset', 'plant']):
        return 'fixed_assets'
    if 'other asset' in label_l:
        return 'other_assets'
    if 'current liabilit' in label_l:
        return 'current_liabilities'
    if any(k in label_l for k in ['long-term liabilit', 'long term liabilit',
                                    'non-current liabilit', 'mortgage', 'long term debt']):
        return 'long_term_liabilities'
    if any(k in label_l for k in ['equity', 'stockholder', 'shareholder', "owner's capital",
                                    'retained', 'capital stock', 'paid-in']):
        return 'equity'
    # Broad fallbacks
    if 'asset' in label_l:
        return 'current_assets'
    if 'liabilit' in label_l:
        return 'current_liabilities'
    return None


def parse_pl(df: pd.DataFrame) -> dict:
    rows = _extract_rows(df)
    sections = {k: [] for k in ['income', 'cogs', 'operating_expenses', 'other_income', 'other_expenses']}
    current_section = None
    period = None

    for row in rows:
        label, label_l, value = row['label'], row['label'].lower(), row['value']

        # Capture period string
        if period is None and re.search(r'\b(january|february|march|april|may|june|july|august|'
                                         r'september|october|november|december|jan|feb|mar|apr|'
                                         r'jun|jul|aug|sep|oct|nov|dec|\d{4})\b', label_l):
            if value is None:
                period = label
                continue

        if _is_subtotal(label_l):
            continue

        if value is None:
            sec = _classify_pl_section(label_l)
            if sec:
                current_section = sec
            continue

        if value != 0:
            if current_section:
                sections[current_section].append({'label': label, 'value': round(abs(value), 2)})
            else:
                sec = _classify_pl_section(label_l)
                if sec:
                    sections[sec].append({'label': label, 'value': round(abs(value), 2)})

    return {'type': 'pl', 'sections': sections, 'period': period or 'N/A'}


def parse_bs(df: pd.DataFrame) -> dict:
    rows = _extract_rows(df)
    sections = {k: [] for k in ['current_assets', 'fixed_assets', 'other_assets',
                                  'current_liabilities', 'long_term_liabilities', 'equity']}
    current_section = None
    period = None

    for row in rows:
        label, label_l, value = row['label'], row['label'].lower(), row['value']

        if period is None and re.search(r'\b(january|february|march|april|may|june|july|august|'
                                         r'september|october|november|december|jan|feb|mar|apr|'
                                         r'jun|jul|aug|sep|oct|nov|dec|\d{4})\b', label_l):
            if value is None:
                period = label
                continue

        if _is_subtotal(label_l):
            continue

        if value is None:
            sec = _classify_bs_section(label_l)
            if sec:
                current_section = sec
            continue

        if current_section and value != 0:
            sections[current_section].append({'label': label, 'value': round(abs(value), 2)})

    return {'type': 'bs', 'sections': sections, 'period': period or 'N/A'}


def parse_file(contents: bytes, filename: str) -> dict:
    df = _read_file(contents, filename)
    ftype = detect_file_type(df)
    if ftype == 'pl':
        return parse_pl(df)
    elif ftype == 'bs':
        return parse_bs(df)
    else:
        raise ValueError("Could not detect file type. Ensure this is a QuickBooks P&L or Balance Sheet export.")
