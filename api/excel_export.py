"""
Excel Export Engine — generates a fully formatted, multi-sheet workbook
that mirrors the dashboard: styled KPI cards, charts, tables with filters,
conditional formatting, and slicers (via structured Tables + AutoFilter).
"""
import io
from datetime import datetime
from openpyxl import Workbook
from openpyxl.chart import BarChart, PieChart, LineChart, Reference
from openpyxl.chart.series import DataPoint
from openpyxl.chart.label import DataLabelList
from openpyxl.styles import (Font, PatternFill, Alignment, Border, Side,
                               GradientFill, numbers as num_styles)
from openpyxl.styles.differential import DifferentialStyle
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule, CellIsRule
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as XLImage

# ── Palette (matches editorial theme) ────────────────────────────────────────
C_CRIMSON   = "C41E3A"
C_INK       = "1A1009"
C_CREAM     = "F7F4EE"
C_CREAM2    = "EDE9DF"
C_MUTED     = "8A7F70"
C_FAINT     = "C4BAA8"
C_WHITE     = "FFFFFF"
C_FOREST    = "1B6535"
C_FOREST2   = "2D9150"
C_AMBER     = "B45309"
C_OCEAN     = "1E40AF"
C_ROSE      = "FCEEF1"
C_GREEN_BG  = "EAF6EE"
C_AMBER_BG  = "FEF3C7"
C_BLUE_BG   = "EFF6FF"

FONT      = "Calibri"

def _fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def _font(bold=False, italic=False, size=11, color=C_INK, name=FONT):
    return Font(name=name, bold=bold, italic=italic, size=size, color=color)

def _align(h="left", v="center", wrap=False):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)

def _border_bottom(color=C_INK, style="medium"):
    s = Side(style=style, color=color)
    return Border(bottom=s)

def _border_all(color=C_CREAM2, style="thin"):
    s = Side(style=style, color=color)
    return Border(left=s, right=s, top=s, bottom=s)

def _thin_bottom(color=C_CREAM2):
    return Border(bottom=Side(style="thin", color=color))

def _fmt_money(ws, row, col, value, fmt='$#,##0'):
    cell = ws.cell(row=row, column=col, value=value)
    cell.number_format = fmt
    return cell

def _set(ws, row, col, value=None, bold=False, italic=False, size=11,
         color=C_INK, bg=None, align="left", valign="center",
         wrap=False, num_fmt=None, border=None):
    c = ws.cell(row=row, column=col)
    if value is not None:
        c.value = value
    c.font      = _font(bold=bold, italic=italic, size=size, color=color)
    c.alignment = _align(h=align, v=valign, wrap=wrap)
    if bg:
        c.fill  = _fill(bg)
    if num_fmt:
        c.number_format = num_fmt
    if border:
        c.border = border
    return c

def _section_header(ws, row, col1, col2, title):
    """Crimson-ruled section header spanning col1:col2."""
    ws.merge_cells(start_row=row, start_column=col1, end_row=row, end_column=col2)
    c = _set(ws, row, col1, title.upper(), bold=True, size=9,
             color=C_WHITE, bg=C_INK, align="left",
             border=Border(bottom=Side(style="medium", color=C_CRIMSON)))
    ws.row_dimensions[row].height = 18
    return c

def _kpi_block(ws, row, col, label, value, sub=None, bg=C_GREEN_BG, value_color=C_FOREST):
    """3-row KPI block: label / value / sub."""
    _set(ws, row,   col, label, size=8, color=C_MUTED, bg=bg, align="center", bold=False)
    _set(ws, row+1, col, value, size=16, color=value_color, bg=bg, align="center", bold=True, num_fmt='$#,##0' if isinstance(value, (int,float)) else None)
    if sub is not None:
        _set(ws, row+2, col, sub,   size=9,  color=value_color, bg=bg, align="center", italic=True)
    else:
        _set(ws, row+2, col, "",    bg=bg)
    return row + 3

def _autofit(ws, min_w=10, max_w=40):
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            try:
                if cell.value:
                    max_len = max(max_len, len(str(cell.value)))
            except:
                pass
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, min_w), max_w)

# ─────────────────────────────────────────────────────────────────────────────
# Sheet builders
# ─────────────────────────────────────────────────────────────────────────────

def _build_summary_sheet(wb, results):
    ws = wb.active
    ws.title = "Executive Summary"
    ws.sheet_view.showGridLines = False

    pl   = results.get("pl_analysis") or (results.get("analysis") if results.get("analysis",{}).get("type")=="pl" else None)
    bs   = results.get("bs_current")  or (results.get("analysis") if results.get("analysis",{}).get("type")=="bs" else None)
    hs   = results.get("health_score")
    ret  = results.get("returns", {})
    mode = results.get("analysis_type") or results.get("mode","")
    generated = datetime.now().strftime("%B %d, %Y")

    # ── Title banner ──────────────────────────────────────────────────────────
    ws.merge_cells("A1:L1")
    _set(ws, 1, 1, "FINANCIAL STATEMENT ANALYSIS REPORT", bold=True, size=16,
         color=C_WHITE, bg=C_INK, align="center")
    ws.row_dimensions[1].height = 32

    ws.merge_cells("A2:L2")
    _set(ws, 2, 1, f"Generated: {generated}  |  Analysis Type: {mode.upper() if mode else 'N/A'}", size=9,
         color=C_FAINT, bg=C_INK, align="center", italic=True)
    ws.row_dimensions[2].height = 16

    ws.merge_cells("A3:L3")
    ws["A3"].fill = _fill(C_CRIMSON)
    ws.row_dimensions[3].height = 4

    row = 5

    # ── P&L KPIs ──────────────────────────────────────────────────────────────
    if pl and pl.get("summary"):
        s, r = pl["summary"], pl.get("ratios", {})
        _section_header(ws, row, 1, 12, "Profit & Loss — Key Metrics")
        row += 1

        kpis_pl = [
            ("TOTAL REVENUE",     s.get("total_revenue",0),      f"{r.get('gross_margin',0):.1f}% gross margin", C_GREEN_BG, C_FOREST),
            ("NET PROFIT",        s.get("net_profit",0),          f"{r.get('net_profit_margin',0):.1f}% net margin", C_GREEN_BG if s.get("net_profit",0)>=0 else C_ROSE, C_FOREST if s.get("net_profit",0)>=0 else C_CRIMSON),
            ("TOTAL EXPENSES",    (s.get("total_cogs",0)+s.get("total_op_expenses",0)), f"Expense ratio: {r.get('expense_ratio',0):.1f}%", C_ROSE,  C_CRIMSON),
            ("GROSS MARGIN",      f"{r.get('gross_margin',0):.1f}%",    "of revenue",  C_BLUE_BG, C_OCEAN),
            ("NET MARGIN",        f"{r.get('net_profit_margin',0):.1f}%","of revenue",  C_BLUE_BG, C_OCEAN),
            ("EBITDA",            s.get("ebitda",0),               "earnings before interest & tax", C_GREEN_BG, C_FOREST),
        ]
        for i, (lbl, val, sub, bg, vc) in enumerate(kpis_pl):
            col = 1 + i * 2
            ws.merge_cells(start_row=row, start_column=col, end_row=row,   end_column=col+1)
            ws.merge_cells(start_row=row+1, start_column=col, end_row=row+1, end_column=col+1)
            ws.merge_cells(start_row=row+2, start_column=col, end_row=row+2, end_column=col+1)
            _set(ws, row,   col, lbl,  size=8,  color=C_MUTED, bg=bg, align="center")
            cell_val = ws.cell(row=row+1, column=col, value=val)
            cell_val.font = _font(bold=True, size=15, color=vc)
            cell_val.fill = _fill(bg)
            cell_val.alignment = _align(h="center", v="center")
            if isinstance(val, (int, float)):
                cell_val.number_format = '$#,##0'
            _set(ws, row+2, col, sub,  size=8,  color=vc, bg=bg, align="center", italic=True)
            ws.row_dimensions[row].height   = 18
            ws.row_dimensions[row+1].height = 30
            ws.row_dimensions[row+2].height = 16
        row += 4

    # ── BS KPIs ───────────────────────────────────────────────────────────────
    if bs and bs.get("summary"):
        s, r = bs["summary"], bs.get("ratios", {})
        _section_header(ws, row, 1, 12, "Balance Sheet — Key Metrics")
        row += 1
        kpis_bs = [
            ("TOTAL ASSETS",     s.get("total_assets",0),    "",  C_BLUE_BG, C_OCEAN),
            ("TOTAL LIABILITIES",s.get("total_liabilities",0),"", C_ROSE,    C_CRIMSON),
            ("EQUITY",           s.get("equity",0),           "",  C_GREEN_BG if s.get("equity",0)>=0 else C_ROSE, C_FOREST if s.get("equity",0)>=0 else C_CRIMSON),
            ("WORKING CAPITAL",  s.get("working_capital",0),  "",  C_GREEN_BG if s.get("working_capital",0)>=0 else C_ROSE, C_FOREST if s.get("working_capital",0)>=0 else C_CRIMSON),
            ("CURRENT RATIO",    f"{r.get('current_ratio') or 0:.2f}x", "target > 1.5x", C_BLUE_BG, C_OCEAN),
            ("DEBT-TO-EQUITY",   f"{r.get('debt_to_equity') or 0:.2f}x","target < 1.5x", C_AMBER_BG, C_AMBER),
        ]
        for i, (lbl, val, sub, bg, vc) in enumerate(kpis_bs):
            col = 1 + i * 2
            ws.merge_cells(start_row=row, start_column=col, end_row=row,   end_column=col+1)
            ws.merge_cells(start_row=row+1, start_column=col, end_row=row+1, end_column=col+1)
            ws.merge_cells(start_row=row+2, start_column=col, end_row=row+2, end_column=col+1)
            _set(ws, row,   col, lbl,  size=8,  color=C_MUTED, bg=bg, align="center")
            cell_val = ws.cell(row=row+1, column=col, value=val)
            cell_val.font = _font(bold=True, size=15, color=vc)
            cell_val.fill = _fill(bg)
            cell_val.alignment = _align(h="center", v="center")
            if isinstance(val, (int, float)):
                cell_val.number_format = '$#,##0'
            _set(ws, row+2, col, sub,  size=8,  color=vc, bg=bg, align="center", italic=True)
            ws.row_dimensions[row].height   = 18
            ws.row_dimensions[row+1].height = 30
            ws.row_dimensions[row+2].height = 16
        row += 4

    # ── Health score + ROA/ROE ────────────────────────────────────────────────
    extras = []
    if hs is not None:
        extras.append(("HEALTH SCORE", f"{hs}/100", "Excellent≥80 · Good≥60 · Fair≥40", C_GREEN_BG if hs>=80 else C_AMBER_BG if hs>=60 else C_ROSE, C_FOREST if hs>=80 else C_AMBER if hs>=60 else C_CRIMSON))
    if ret.get("roa") is not None:
        extras.append(("RETURN ON ASSETS", f"{ret['roa']:.1f}%", "target > 5%", C_GREEN_BG if ret['roa']>=5 else C_AMBER_BG, C_FOREST if ret['roa']>=5 else C_AMBER))
    if ret.get("roe") is not None:
        extras.append(("RETURN ON EQUITY", f"{ret['roe']:.1f}%", "target > 10%", C_GREEN_BG if ret['roe']>=10 else C_AMBER_BG, C_FOREST if ret['roe']>=10 else C_AMBER))
    if extras:
        _section_header(ws, row, 1, 12, "Advanced Metrics")
        row += 1
        for i, (lbl, val, sub, bg, vc) in enumerate(extras[:6]):
            col = 1 + i * 2
            ws.merge_cells(start_row=row, start_column=col, end_row=row,   end_column=col+1)
            ws.merge_cells(start_row=row+1, start_column=col, end_row=row+1, end_column=col+1)
            ws.merge_cells(start_row=row+2, start_column=col, end_row=row+2, end_column=col+1)
            _set(ws, row,   col, lbl,  size=8,  color=C_MUTED, bg=bg, align="center")
            _set(ws, row+1, col, val,  size=15, color=vc,     bg=bg, align="center", bold=True)
            _set(ws, row+2, col, sub,  size=8,  color=vc,     bg=bg, align="center", italic=True)
            ws.row_dimensions[row+1].height = 30
        row += 4

    # ── Footer ────────────────────────────────────────────────────────────────
    ws.merge_cells(f"A{row}:L{row}")
    _set(ws, row, 1, "Generated by FinAnalyzer · financial-statement-analyzer.vercel.app · This report is for informational purposes only.",
         size=8, color=C_FAINT, bg=C_INK, align="center", italic=True)
    ws.row_dimensions[row].height = 14

    # Column widths
    for i in range(1, 13):
        ws.column_dimensions[get_column_letter(i)].width = 14
    ws.column_dimensions["A"].width = 14


def _build_pl_sheet(wb, pl_data):
    if not pl_data: return
    ws = wb.create_sheet("P&L Analysis")
    ws.sheet_view.showGridLines = False

    s = pl_data.get("summary", {})
    r = pl_data.get("ratios", {})
    bd = pl_data.get("breakdown", {})

    # ── Title ─────────────────────────────────────────────────────────────────
    ws.merge_cells("A1:H1")
    _set(ws, 1, 1, "PROFIT & LOSS — LINE ITEM ANALYSIS", bold=True, size=14,
         color=C_WHITE, bg=C_INK, align="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:H2")
    _set(ws, 2, 1, f"Period: {pl_data.get('period','N/A')}", size=9, color=C_FAINT, bg=C_INK, align="center")
    ws.row_dimensions[2].height = 14

    row = 4

    # ── Section helper ────────────────────────────────────────────────────────
    def write_section(title, items, color, section_key):
        nonlocal row
        if not items: return None, None
        _set(ws, row, 1, title, bold=True, size=10, color=C_WHITE, bg=color)
        for c in range(2, 9):
            _set(ws, row, c, bg=color)
        ws.row_dimensions[row].height = 18
        header_row = row + 1
        _set(ws, header_row, 1, "Line Item",  bold=True, size=9, color=C_INK,   bg=C_CREAM2)
        _set(ws, header_row, 2, "Amount",     bold=True, size=9, color=C_INK,   bg=C_CREAM2, align="right")
        _set(ws, header_row, 3, "% of Revenue",bold=True, size=9, color=C_INK,  bg=C_CREAM2, align="right")
        _set(ws, header_row, 4, "Category",   bold=True, size=9, color=C_INK,   bg=C_CREAM2)
        ws.row_dimensions[header_row].height = 16
        row += 2

        data_start = row
        total_rev = s.get("total_revenue", 1) or 1
        for item in items:
            pct = item["value"] / total_rev * 100
            _set(ws, row, 1, f"  {item['label']}", size=10, color=C_INK)
            c2 = ws.cell(row=row, column=2, value=item["value"]); c2.number_format = '$#,##0.00'; c2.font = _font(size=10); c2.alignment = _align(h="right")
            c3 = ws.cell(row=row, column=3, value=pct/100);       c3.number_format = '0.0%';      c3.font = _font(size=10, color=C_MUTED); c3.alignment = _align(h="right")
            _set(ws, row, 4, section_key, size=9, color=C_MUTED)
            # Alternating bg
            bg = C_CREAM if row % 2 == 0 else C_WHITE
            for c in range(1, 5):
                ws.cell(row=row, column=c).fill = _fill(bg)
            ws.row_dimensions[row].height = 15
            row += 1

        data_end = row - 1

        # Total row
        total = sum(i["value"] for i in items)
        _set(ws, row, 1, f"  TOTAL {title.upper()}", bold=True, size=10, color=C_WHITE, bg=color)
        c2 = ws.cell(row=row, column=2, value=total); c2.number_format='$#,##0.00'; c2.font=_font(bold=True,size=10,color=C_WHITE); c2.fill=_fill(color); c2.alignment=_align(h="right")
        c3 = ws.cell(row=row, column=3, value=total/total_rev); c3.number_format='0.0%'; c3.font=_font(bold=True,size=10,color=C_WHITE); c3.fill=_fill(color); c3.alignment=_align(h="right")
        _set(ws, row, 4, "", bg=color)
        ws.row_dimensions[row].height = 16
        row += 2

        return data_start, data_end

    # Write all sections
    inc_s, inc_e = write_section("Income / Revenue",   bd.get("income",[]),             C_FOREST,  "Income")
    cog_s, cog_e = write_section("Cost of Goods Sold", bd.get("cogs",[]),               C_AMBER,   "COGS")
    op_s,  op_e  = write_section("Operating Expenses", bd.get("operating_expenses",[]), C_CRIMSON, "Op. Expense")
    oi_s,  oi_e  = write_section("Other Income",       bd.get("other_income",[]),       C_OCEAN,   "Other Income")
    oe_s,  oe_e  = write_section("Other Expenses",     bd.get("other_expenses",[]),     "7C3AED",  "Other Expense")

    # ── Net Income summary ────────────────────────────────────────────────────
    _set(ws, row, 1, "NET INCOME / PROFIT", bold=True, size=12, color=C_WHITE, bg=C_INK)
    net = s.get("net_profit", 0)
    c2 = ws.cell(row=row, column=2, value=net); c2.number_format='$#,##0.00'; c2.font=_font(bold=True,size=12,color=C_WHITE); c2.fill=_fill(C_INK); c2.alignment=_align(h="right")
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=1)
    for c in range(3, 9): _set(ws, row, c, bg=C_INK)
    ws.row_dimensions[row].height = 22
    row += 2

    # ── Ratios table ──────────────────────────────────────────────────────────
    _section_header(ws, row, 1, 4, "Financial Ratios")
    row += 1
    ratio_data = [
        ("Gross Margin",       f"{r.get('gross_margin',0):.1f}%",      "> 30%", r.get('gross_margin',0) >= 30),
        ("Operating Margin",   f"{r.get('operating_margin',0):.1f}%",  "> 10%", r.get('operating_margin',0) >= 10),
        ("Net Profit Margin",  f"{r.get('net_profit_margin',0):.1f}%", "> 10%", r.get('net_profit_margin',0) >= 10),
        ("Expense Ratio",      f"{r.get('expense_ratio',0):.1f}%",     "< 80%", r.get('expense_ratio',0) < 80),
        ("COGS Ratio",         f"{r.get('cogs_ratio',0):.1f}%",        "< 40%", r.get('cogs_ratio',0) < 40),
    ]
    headers = ["Ratio", "Value", "Benchmark", "Status"]
    for ci, h in enumerate(headers, 1):
        _set(ws, row, ci, h, bold=True, size=9, color=C_INK, bg=C_CREAM2, align="center" if ci>1 else "left")
    ws.row_dimensions[row].height = 16
    row += 1

    ratio_table_start = row
    for label, val, bench, ok in ratio_data:
        bg = C_GREEN_BG if ok else C_ROSE
        vc = C_FOREST   if ok else C_CRIMSON
        _set(ws, row, 1, label, size=10, color=C_INK, bg=bg)
        _set(ws, row, 2, val,   size=10, color=vc,    bg=bg, align="right", bold=True)
        _set(ws, row, 3, bench, size=9,  color=C_MUTED,bg=bg, align="center")
        _set(ws, row, 4, "✓" if ok else "✗", size=10, color=vc, bg=bg, align="center", bold=True)
        ws.row_dimensions[row].height = 16
        row += 1

    # ── Bar chart: Revenue vs Expenses ────────────────────────────────────────
    chart_data = [
        ["Category",        "Amount"],
        ["Revenue",         s.get("total_revenue",0)],
        ["COGS",            s.get("total_cogs",0)],
        ["Op. Expenses",    s.get("total_op_expenses",0)],
        ["Net Profit",      s.get("net_profit",0)],
    ]
    chart_col = 6
    chart_row_start = 4
    for i, r_data in enumerate(chart_data):
        for j, v in enumerate(r_data):
            c = ws.cell(row=chart_row_start+i, column=chart_col+j, value=v)
            if i == 0:
                c.font = _font(bold=True, size=9, color=C_WHITE); c.fill = _fill(C_INK)
            elif isinstance(v, (int, float)):
                c.number_format = '$#,##0'

    bar = BarChart()
    bar.type = "col"; bar.grouping = "clustered"
    bar.title = "Revenue vs Expenses"; bar.style = 2
    bar.y_axis.title = "Amount ($)"; bar.x_axis.title = "Category"
    bar.width = 16; bar.height = 10
    data_ref  = Reference(ws, min_col=chart_col+1, min_row=chart_row_start, max_row=chart_row_start+4)
    cats_ref  = Reference(ws, min_col=chart_col,   min_row=chart_row_start+1, max_row=chart_row_start+4)
    bar.add_data(data_ref, titles_from_data=True)
    bar.set_categories(cats_ref)
    bar.series[0].graphicalProperties.solidFill = C_CRIMSON
    ws.add_chart(bar, f"{get_column_letter(chart_col)}{chart_row_start+6}")

    # ── Expense pie ───────────────────────────────────────────────────────────
    all_exp = bd.get("cogs",[]) + bd.get("operating_expenses",[])
    if all_exp:
        pie_colors = [C_CRIMSON, C_AMBER, C_OCEAN, C_FOREST, "7C3AED", "0891B2", "BE123C", "1D4ED8"]
        pie_row = chart_row_start
        for i, item in enumerate(all_exp[:8]):
            ws.cell(row=pie_row+i, column=chart_col+3, value=item["label"])
            c = ws.cell(row=pie_row+i, column=chart_col+4, value=item["value"])
            c.number_format = '$#,##0'
        pie = PieChart()
        pie.title = "Expense Composition"
        pie.style = 2; pie.width = 14; pie.height = 10
        pd_ref = Reference(ws, min_col=chart_col+4, min_row=pie_row, max_row=pie_row+min(len(all_exp),8)-1)
        pl_ref = Reference(ws, min_col=chart_col+3, min_row=pie_row, max_row=pie_row+min(len(all_exp),8)-1)
        pie.add_data(pd_ref); pie.set_categories(pl_ref)
        for i, s_obj in enumerate(pie.series):
            for j in range(min(len(all_exp),8)):
                dp = DataPoint(idx=j)
                dp.graphicalProperties.solidFill = pie_colors[j % len(pie_colors)]
                s_obj.dPt.append(dp)
        ws.add_chart(pie, f"{get_column_letter(chart_col+3)}{chart_row_start+6}")

    # Column widths
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 14
    ws.column_dimensions["E"].width = 3
    for i in range(6, 13):
        ws.column_dimensions[get_column_letter(i)].width = 13
    ws.freeze_panes = "A3"


def _build_bs_sheet(wb, bs_data):
    if not bs_data: return
    ws = wb.create_sheet("Balance Sheet")
    ws.sheet_view.showGridLines = False

    s = bs_data.get("summary", {})
    r = bs_data.get("ratios",  {})
    bd = bs_data.get("breakdown", {})

    ws.merge_cells("A1:G1")
    _set(ws, 1, 1, "BALANCE SHEET — STRUCTURED ANALYSIS", bold=True, size=14,
         color=C_WHITE, bg=C_INK, align="center")
    ws.row_dimensions[1].height = 28
    ws.merge_cells("A2:G2")
    _set(ws, 2, 1, f"Period: {bs_data.get('period','N/A')}", size=9, color=C_FAINT, bg=C_INK, align="center")
    ws.row_dimensions[2].height = 14

    row = 4

    def write_bs_section(title, items, color):
        nonlocal row
        if not items: return
        _set(ws, row, 1, title, bold=True, size=10, color=C_WHITE, bg=color)
        for c in range(2,8): _set(ws, row, c, bg=color)
        ws.row_dimensions[row].height = 18
        _set(ws, row+1, 1, "Line Item",   bold=True, size=9, color=C_INK, bg=C_CREAM2)
        _set(ws, row+1, 2, "Amount ($)",  bold=True, size=9, color=C_INK, bg=C_CREAM2, align="right")
        _set(ws, row+1, 3, "% of Total",  bold=True, size=9, color=C_INK, bg=C_CREAM2, align="right")
        ws.row_dimensions[row+1].height = 15
        row += 2

        total_assets = s.get("total_assets", 1) or 1
        for item in items:
            pct = item["value"] / total_assets * 100
            bg  = C_CREAM if row % 2 == 0 else C_WHITE
            _set(ws, row, 1, f"  {item['label']}", size=10, bg=bg)
            c2 = ws.cell(row=row, column=2, value=item["value"]); c2.number_format='$#,##0.00'; c2.font=_font(size=10); c2.fill=_fill(bg); c2.alignment=_align(h="right")
            c3 = ws.cell(row=row, column=3, value=pct/100);       c3.number_format='0.0%';      c3.font=_font(size=10,color=C_MUTED); c3.fill=_fill(bg); c3.alignment=_align(h="right")
            ws.row_dimensions[row].height = 15
            row += 1

        total = sum(i["value"] for i in items)
        _set(ws, row, 1, f"  TOTAL {title.upper()}", bold=True, size=10, color=C_WHITE, bg=color)
        c2 = ws.cell(row=row, column=2, value=total); c2.number_format='$#,##0.00'; c2.font=_font(bold=True,size=10,color=C_WHITE); c2.fill=_fill(color); c2.alignment=_align(h="right")
        _set(ws, row, 3, "", bg=color)
        ws.row_dimensions[row].height = 16
        row += 2

    write_bs_section("Current Assets",        bd.get("current_assets",[]),        C_FOREST)
    write_bs_section("Fixed Assets",          bd.get("fixed_assets",[]),          "2D9150")
    write_bs_section("Other Assets",          bd.get("other_assets",[]),          C_OCEAN)
    write_bs_section("Current Liabilities",   bd.get("current_liabilities",[]),   C_CRIMSON)
    write_bs_section("Long-Term Liabilities", bd.get("long_term_liabilities",[]), "9E1830")
    write_bs_section("Equity",                bd.get("equity",[]),                C_AMBER)

    # ── Ratios ────────────────────────────────────────────────────────────────
    _section_header(ws, row, 1, 3, "Balance Sheet Ratios")
    row += 1
    bs_ratios = [
        ("Current Ratio",   f"{r.get('current_ratio') or 0:.2f}x",   "> 1.5x", (r.get("current_ratio") or 0) >= 1.5),
        ("Debt-to-Equity",  f"{r.get('debt_to_equity') or 0:.2f}x",  "< 1.5x", (r.get("debt_to_equity") or 0) <= 1.5),
        ("Debt-to-Assets",  f"{r.get('debt_to_assets') or 0:.2f}x",  "< 0.5x", (r.get("debt_to_assets") or 0) <= 0.5),
        ("Equity Ratio",    f"{r.get('equity_ratio') or 0:.1f}%",     "> 50%",  (r.get("equity_ratio") or 0) >= 50),
    ]
    for ci, h in enumerate(["Ratio","Value","Benchmark","Status"],1):
        _set(ws, row, ci, h, bold=True, size=9, bg=C_CREAM2, align="center" if ci>1 else "left")
    row += 1
    for label, val, bench, ok in bs_ratios:
        bg = C_GREEN_BG if ok else C_ROSE; vc = C_FOREST if ok else C_CRIMSON
        _set(ws, row, 1, label, size=10, bg=bg)
        _set(ws, row, 2, val,   size=10, color=vc, bg=bg, align="right", bold=True)
        _set(ws, row, 3, bench, size=9,  color=C_MUTED, bg=bg, align="center")
        _set(ws, row, 4, "✓" if ok else "✗", size=10, color=vc, bg=bg, align="center", bold=True)
        ws.row_dimensions[row].height = 16; row += 1

    # ── BS chart ──────────────────────────────────────────────────────────────
    chart_labels = ["Current Assets","Fixed Assets","Other Assets","Cur. Liab","LT Liab","Equity"]
    chart_values = [s.get("current_assets",0),s.get("fixed_assets",0),s.get("other_assets",0),
                    s.get("current_liabilities",0),s.get("long_term_liabilities",0),s.get("equity",0)]
    chart_colors = [C_FOREST,"2D9150",C_OCEAN,C_CRIMSON,"9E1830",C_AMBER]
    for i,(lbl,val) in enumerate(zip(chart_labels,chart_values)):
        ws.cell(row=4+i, column=5, value=lbl)
        c = ws.cell(row=4+i, column=6, value=val); c.number_format='$#,##0'

    bar = BarChart()
    bar.type="col"; bar.title="Balance Sheet Structure"; bar.style=2
    bar.width=18; bar.height=11
    bar.y_axis.title="Amount ($)"
    data_r = Reference(ws, min_col=6, min_row=4, max_row=9)
    cats_r = Reference(ws, min_col=5, min_row=4, max_row=9)
    bar.add_data(data_r, titles_from_data=False)
    bar.set_categories(cats_r)
    for i, clr in enumerate(chart_colors):
        dp = DataPoint(idx=i); dp.graphicalProperties.solidFill = clr
        bar.series[0].dPt.append(dp)
    ws.add_chart(bar, "E11")

    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 12
    ws.freeze_panes = "A3"


def _build_pl_table_sheet(wb, pl_data):
    """Flat filterable table of all P&L line items — this is the 'slicer' sheet."""
    if not pl_data: return
    ws = wb.create_sheet("P&L Data Table")
    ws.sheet_view.showGridLines = False

    bd = pl_data.get("breakdown", {})
    s  = pl_data.get("summary", {})
    total_rev = s.get("total_revenue", 1) or 1

    ws.merge_cells("A1:F1")
    _set(ws, 1, 1, "P&L LINE ITEMS — FILTERABLE TABLE  (Use dropdown arrows to filter by Category or Section)", bold=True, size=11, color=C_WHITE, bg=C_INK, align="left")
    ws.row_dimensions[1].height = 22

    headers = ["Section", "Category", "Line Item", "Amount ($)", "% of Revenue", "Type"]
    for ci, h in enumerate(headers, 1):
        _set(ws, 2, ci, h, bold=True, size=10, color=C_WHITE, bg=C_CRIMSON)
    ws.row_dimensions[2].height = 18

    row = 3
    sections = [
        ("Income",              "Revenue",       C_GREEN_BG,  pl_data.get("breakdown",{}).get("income",[])),
        ("Cost of Goods Sold",  "COGS",          C_AMBER_BG,  pl_data.get("breakdown",{}).get("cogs",[])),
        ("Operating Expenses",  "Op. Expense",   C_ROSE,      pl_data.get("breakdown",{}).get("operating_expenses",[])),
        ("Other Income",        "Other Income",  C_BLUE_BG,   pl_data.get("breakdown",{}).get("other_income",[])),
        ("Other Expenses",      "Other Expense", C_CREAM,     pl_data.get("breakdown",{}).get("other_expenses",[])),
    ]

    data_start = row
    for section_name, cat, bg, items in sections:
        for item in items:
            pct = item["value"] / total_rev
            row_bg = C_WHITE if row % 2 == 0 else C_CREAM
            _set(ws, row, 1, section_name, size=10, bg=row_bg)
            _set(ws, row, 2, cat,           size=10, bg=row_bg)
            _set(ws, row, 3, item["label"], size=10, bg=row_bg)
            c4 = ws.cell(row=row, column=4, value=item["value"]); c4.number_format='$#,##0.00'; c4.font=_font(size=10); c4.fill=_fill(row_bg); c4.alignment=_align(h="right")
            c5 = ws.cell(row=row, column=5, value=pct);            c5.number_format='0.0%';      c5.font=_font(size=10,color=C_MUTED); c5.fill=_fill(row_bg); c5.alignment=_align(h="right")
            type_val = "Revenue" if cat in ("Revenue","Other Income") else "Expense"
            _set(ws, row, 6, type_val, size=9, color=C_FOREST if type_val=="Revenue" else C_CRIMSON, bg=row_bg)
            ws.row_dimensions[row].height = 15
            row += 1

    data_end = row - 1

    # ── Excel Table with AutoFilter (acts as slicer) ──────────────────────────
    if data_end >= data_start:
        table = Table(
            displayName="PLLineItems",
            ref=f"A2:{get_column_letter(6)}{data_end}"
        )
        style = TableStyleInfo(
            name="TableStyleMedium2", showFirstColumn=False,
            showLastColumn=False, showRowStripes=True, showColumnStripes=False
        )
        table.tableStyleInfo = style
        ws.add_table(table)

    # Conditional formatting: amount column — data bar
    ws.conditional_formatting.add(
        f"D3:D{data_end}",
        DataBarRule(start_type='min', start_value=0,
                    end_type='max', end_value=None,
                    color=C_OCEAN)
    )

    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 36
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 14
    ws.column_dimensions["F"].width = 12
    ws.freeze_panes = "A3"


def _build_bs_table_sheet(wb, bs_data):
    """Flat filterable table of all BS line items."""
    if not bs_data: return
    ws = wb.create_sheet("BS Data Table")
    ws.sheet_view.showGridLines = False

    bd = bs_data.get("breakdown", {})
    s  = bs_data.get("summary", {})
    total_assets = s.get("total_assets", 1) or 1

    ws.merge_cells("A1:F1")
    _set(ws, 1, 1, "BALANCE SHEET LINE ITEMS — FILTERABLE TABLE  (Use dropdown arrows to filter)", bold=True, size=11, color=C_WHITE, bg=C_INK)
    ws.row_dimensions[1].height = 22

    headers = ["Section", "Sub-Section", "Line Item", "Amount ($)", "% of Assets", "Type"]
    for ci, h in enumerate(headers, 1):
        _set(ws, 2, ci, h, bold=True, size=10, color=C_WHITE, bg=C_OCEAN)
    ws.row_dimensions[2].height = 18

    row = 3
    sections = [
        ("Assets",      "Current Assets",        bd.get("current_assets",[])),
        ("Assets",      "Fixed Assets",           bd.get("fixed_assets",[])),
        ("Assets",      "Other Assets",           bd.get("other_assets",[])),
        ("Liabilities", "Current Liabilities",    bd.get("current_liabilities",[])),
        ("Liabilities", "Long-Term Liabilities",  bd.get("long_term_liabilities",[])),
        ("Equity",      "Equity",                 bd.get("equity",[])),
    ]

    data_start = row
    for main_cat, sub_cat, items in sections:
        for item in items:
            pct = item["value"] / total_assets
            row_bg = C_WHITE if row % 2 == 0 else C_CREAM
            _set(ws, row, 1, main_cat,    size=10, bg=row_bg)
            _set(ws, row, 2, sub_cat,     size=10, bg=row_bg)
            _set(ws, row, 3, item["label"],size=10, bg=row_bg)
            c4 = ws.cell(row=row, column=4, value=item["value"]); c4.number_format='$#,##0.00'; c4.font=_font(size=10); c4.fill=_fill(row_bg); c4.alignment=_align(h="right")
            c5 = ws.cell(row=row, column=5, value=pct);            c5.number_format='0.0%';      c5.font=_font(size=10,color=C_MUTED); c5.fill=_fill(row_bg); c5.alignment=_align(h="right")
            vc = C_FOREST if main_cat=="Assets" else (C_CRIMSON if main_cat=="Liabilities" else C_AMBER)
            _set(ws, row, 6, main_cat, size=9, color=vc, bg=row_bg)
            ws.row_dimensions[row].height = 15
            row += 1

    data_end = row - 1
    if data_end >= data_start:
        table = Table(displayName="BSLineItems", ref=f"A2:{get_column_letter(6)}{data_end}")
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium1", showRowStripes=True)
        ws.add_table(table)

    ws.conditional_formatting.add(f"D3:D{data_end}", DataBarRule(start_type='min',start_value=0,end_type='max',end_value=None,color=C_FOREST))

    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 36
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 14
    ws.column_dimensions["F"].width = 12
    ws.freeze_panes = "A3"


def _build_tax_sheet(wb, tax_data):
    if not tax_data or tax_data.get("tax") is None: return
    ws = wb.create_sheet("Tax Estimate")
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:E1")
    _set(ws, 1, 1, "TAX ESTIMATE", bold=True, size=14, color=C_WHITE, bg=C_INK, align="center")
    ws.row_dimensions[1].height = 28
    ws.merge_cells("A2:E2")
    _set(ws, 2, 1, f"{tax_data.get('country_description','')}  |  Entity: {tax_data.get('entity_type','')}  |  Filing: {tax_data.get('filing_status','')}",
         size=9, color=C_FAINT, bg=C_INK, align="center")
    ws.row_dimensions[2].height = 14

    row = 4
    # KPI row
    kpis = [
        ("Gross Profit",     tax_data.get("gross_profit",0),     C_CREAM,    C_INK),
        ("Total Deductions", tax_data.get("total_deductions",0), C_GREEN_BG, C_FOREST),
        ("Taxable Income",   tax_data.get("taxable_income",0),   C_AMBER_BG, C_AMBER),
        ("Federal Tax Est.", tax_data.get("tax",0),              C_ROSE,     C_CRIMSON),
        ("After-Tax Profit", (tax_data.get("gross_profit",0) - tax_data.get("tax",0)), C_BLUE_BG, C_OCEAN),
    ]
    for i, (lbl, val, bg, vc) in enumerate(kpis):
        _set(ws, row,   i+1, lbl, size=8, color=C_MUTED, bg=bg, align="center")
        c = ws.cell(row=row+1, column=i+1, value=val); c.number_format='$#,##0'; c.font=_font(bold=True,size=14,color=vc); c.fill=_fill(bg); c.alignment=_align(h="center",v="center")
        ws.row_dimensions[row].height   = 18
        ws.row_dimensions[row+1].height = 28
    row += 3

    # Effective rate
    _section_header(ws, row, 1, 5, "Effective Tax Rate")
    row += 1
    eff = tax_data.get("effective_rate", 0)
    _set(ws, row, 1, "Effective Rate on Gross Profit", size=11, color=C_INK)
    c = ws.cell(row=row, column=2, value=eff/100); c.number_format='0.0%'; c.font=_font(bold=True,size=14,color=C_AMBER); c.alignment=_align(h="center",v="center")
    ws.row_dimensions[row].height = 22
    row += 2

    # Deductions
    ded_log = tax_data.get("deduction_breakdown", [])
    if ded_log:
        _section_header(ws, row, 1, 5, "Deductions Applied")
        row += 1
        for ci, h in enumerate(["Deduction Item","Amount Deducted","Note"],1):
            _set(ws, row, ci, h, bold=True, size=9, bg=C_CREAM2)
        ws.row_dimensions[row].height = 15; row += 1
        ded_start = row
        for d in ded_log:
            bg = C_GREEN_BG if row % 2 == 0 else C_WHITE
            _set(ws, row, 1, d["item"], size=10, bg=bg)
            c = ws.cell(row=row, column=2, value=d["amount"]); c.number_format='$#,##0.00'; c.font=_font(size=10,color=C_FOREST); c.fill=_fill(bg); c.alignment=_align(h="right")
            _set(ws, row, 3, d.get("note",""), size=9, color=C_MUTED, bg=bg, wrap=True)
            ws.row_dimensions[row].height = 28; row += 1
        if row-1 >= ded_start:
            table = Table(displayName="TaxDeductions", ref=f"A{row-len(ded_log)-1}:C{row-1}")
            table.tableStyleInfo = TableStyleInfo(name="TableStyleLight1",showRowStripes=True)
            ws.add_table(table)
        row += 1

    # Brackets
    brackets = tax_data.get("bracket_breakdown", [])
    if brackets:
        _section_header(ws, row, 1, 4, "Tax Bracket Breakdown")
        row += 1
        for ci, h in enumerate(["Bracket","Rate","Taxable Amount","Tax"],1):
            _set(ws, row, ci, h, bold=True, size=9, bg=C_CREAM2, align="right" if ci>1 else "left")
        ws.row_dimensions[row].height = 15; row += 1
        for b in brackets:
            bg = C_WHITE if row % 2 == 0 else C_CREAM
            _set(ws, row, 1, b["bracket"], size=10, bg=bg)
            _set(ws, row, 2, b["rate"],    size=10, color=C_AMBER, bg=bg, align="right", bold=True)
            c3 = ws.cell(row=row, column=3, value=b["taxable_amount"]); c3.number_format='$#,##0.00'; c3.font=_font(size=10); c3.fill=_fill(bg); c3.alignment=_align(h="right")
            c4 = ws.cell(row=row, column=4, value=abs(b["tax"]));       c4.number_format='$#,##0.00'; c4.font=_font(size=10,color=C_CRIMSON if b["tax"]>=0 else C_FOREST,bold=True); c4.fill=_fill(bg); c4.alignment=_align(h="right")
            ws.row_dimensions[row].height = 15; row += 1

    # Disclaimer
    row += 1
    ws.merge_cells(f"A{row}:E{row}")
    _set(ws, row, 1, tax_data.get("disclaimer",""), size=9, color=C_FAINT, bg=C_INK, align="left", italic=True, wrap=True)
    ws.row_dimensions[row].height = 28

    for col, w in [("A",30),("B",18),("C",50),("D",18),("E",12)]:
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A3"


def _build_monthly_sheet(wb, monthly_data):
    """Monthly trend + anomaly sheet."""
    if not monthly_data: return
    ws = wb.create_sheet("Monthly Trends")
    ws.sheet_view.showGridLines = False

    months   = monthly_data.get("months",[])
    revenue  = monthly_data.get("revenue",[])
    expenses = monthly_data.get("expenses",[])
    profit   = monthly_data.get("profit",[])
    anomalies = monthly_data.get("anomalies",[])

    ws.merge_cells("A1:F1")
    _set(ws, 1, 1, "MONTHLY P&L TRENDS — DATA TABLE & CHARTS", bold=True, size=14, color=C_WHITE, bg=C_INK, align="center")
    ws.row_dimensions[1].height = 28

    # ── Monthly data table ────────────────────────────────────────────────────
    headers = ["Month","Revenue","Expenses","Profit","Margin %","vs Avg Profit"]
    for ci, h in enumerate(headers, 1):
        _set(ws, 2, ci, h, bold=True, size=9, color=C_WHITE, bg=C_CRIMSON, align="center" if ci>1 else "left")
    ws.row_dimensions[2].height = 18

    active = [(m,r,e,p) for m,r,e,p in zip(months,revenue,expenses,profit) if r>0 or e>0]
    avg_profit = sum(p for _,_,_,p in active) / len(active) if active else 0

    data_start = 3
    for i, (m,r,e,p) in enumerate(active):
        row = 3 + i
        bg  = C_WHITE if i%2==0 else C_CREAM
        margin = p/r*100 if r else 0
        diff   = p - avg_profit
        _set(ws, row, 1, m, size=10, bg=bg)
        for ci, (val, fmt_str, vc) in enumerate([
            (r, '$#,##0', C_FOREST), (e, '$#,##0', C_CRIMSON),
            (p, '$#,##0', C_FOREST if p>=0 else C_CRIMSON),
            (margin/100, '0.0%', C_OCEAN),
            (diff, '$#,##0', C_FOREST if diff>=0 else C_CRIMSON),
        ], 2):
            c = ws.cell(row=row, column=ci, value=val)
            c.number_format = fmt_str; c.font=_font(size=10,color=vc); c.fill=_fill(bg); c.alignment=_align(h="right")
        ws.row_dimensions[row].height = 15

    data_end = 2 + len(active)

    # Total row
    tot_row = data_end + 1
    _set(ws, tot_row, 1, "TOTAL / AVERAGE", bold=True, size=10, color=C_WHITE, bg=C_INK)
    totals = [sum(r for _,r,_,_ in active), sum(e for _,_,e,_ in active), sum(p for _,_,_,p in active)]
    for ci, (val, fmt_str) in enumerate([(totals[0],'$#,##0'),(totals[1],'$#,##0'),(totals[2],'$#,##0')],2):
        c = ws.cell(row=tot_row, column=ci, value=val)
        c.number_format=fmt_str; c.font=_font(bold=True,size=10,color=C_WHITE); c.fill=_fill(C_INK); c.alignment=_align(h="right")
    ws.row_dimensions[tot_row].height = 18

    # Table with AutoFilter
    if data_end >= data_start:
        table = Table(displayName="MonthlyTrends", ref=f"A2:F{data_end}")
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium3", showRowStripes=True)
        ws.add_table(table)

    # Conditional formatting on profit column
    ws.conditional_formatting.add(
        f"D3:D{data_end}",
        ColorScaleRule(start_type='min', start_color='FECDD3', mid_type='percentile', mid_value=50, mid_color='FFFFFF', end_type='max', end_color='BBF7D0')
    )
    ws.conditional_formatting.add(f"D3:D{data_end}", DataBarRule(start_type='min',start_value=0,end_type='max',end_value=None,color=C_FOREST))

    # ── Line chart ────────────────────────────────────────────────────────────
    line = LineChart()
    line.title = "Monthly Revenue vs Expenses vs Profit"
    line.style = 2; line.width = 22; line.height = 12
    line.y_axis.title = "Amount ($)"; line.x_axis.title = "Month"
    line.y_axis.numFmt = '$#,##0'

    rev_ref = Reference(ws, min_col=2, min_row=2, max_row=data_end)
    exp_ref = Reference(ws, min_col=3, min_row=2, max_row=data_end)
    pro_ref = Reference(ws, min_col=4, min_row=2, max_row=data_end)
    cat_ref = Reference(ws, min_col=1, min_row=3, max_row=data_end)

    line.add_data(rev_ref, titles_from_data=True)
    line.add_data(exp_ref, titles_from_data=True)
    line.add_data(pro_ref, titles_from_data=True)
    line.set_categories(cat_ref)

    line.series[0].graphicalProperties.line.solidFill = C_FOREST
    line.series[0].graphicalProperties.line.width = 20000
    line.series[1].graphicalProperties.line.solidFill = C_CRIMSON
    line.series[1].graphicalProperties.line.width = 20000
    line.series[2].graphicalProperties.line.solidFill = C_OCEAN
    line.series[2].graphicalProperties.line.width = 20000
    line.series[2].graphicalProperties.line.dashDot = "dash"

    ws.add_chart(line, f"H2")

    # ── Anomaly table ─────────────────────────────────────────────────────────
    anom_row = tot_row + 3
    if anomalies:
        _section_header(ws, anom_row, 1, 6, f"Anomaly Detection — {len(anomalies)} Anomalies Found")
        anom_row += 1
        for ci, h in enumerate(["Month","Metric","Value","Z-Score","Severity","Description"],1):
            _set(ws, anom_row, ci, h, bold=True, size=9, bg=C_CREAM2)
        ws.row_dimensions[anom_row].height = 15; anom_row += 1
        anom_start = anom_row
        for a in anomalies:
            bg = "#FECDD3" if a["severity"]=="high" else "#FDE68A"
            vc = C_CRIMSON if a["severity"]=="high" else C_AMBER
            _set(ws, anom_row, 1, a["month"],                 size=10, bg=bg)
            _set(ws, anom_row, 2, a["metric"],                size=10, bg=bg)
            c3 = ws.cell(row=anom_row, column=3, value=a["value"]); c3.number_format='$#,##0'; c3.font=_font(size=10,color=vc,bold=True); c3.fill=_fill(bg); c3.alignment=_align(h="right")
            _set(ws, anom_row, 4, f"{a['z_score']:.2f}",       size=10, color=vc, bg=bg, align="center", bold=True)
            _set(ws, anom_row, 5, a["severity"].upper(),        size=9,  color=C_WHITE, bg=C_CRIMSON if a["severity"]=="high" else C_AMBER, align="center", bold=True)
            _set(ws, anom_row, 6, a.get("message","")[:80],    size=9,  color=C_MUTED, bg=bg, wrap=True)
            ws.row_dimensions[anom_row].height = 24; anom_row += 1

        anom_end = anom_row - 1
        if anom_end >= anom_start:
            table = Table(displayName="AnomalyTable", ref=f"A{anom_start-1}:F{anom_end}")
            table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True)
            ws.add_table(table)

    for col,w in [("A",14),("B",14),("C",14),("D",14),("E",12),("F",60)]:
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A3"


# ── Main export function ──────────────────────────────────────────────────────

def generate_excel(results: dict, monthly_data: dict = None) -> bytes:
    """
    Build a full multi-sheet Excel workbook and return as bytes.
    results: the full analysis dict from /analyze/pl, /analyze/bs, or /analyze/full
    monthly_data: optional, from /analyze/monthly
    """
    wb = Workbook()

    pl_data = results.get("pl_analysis") or (results.get("analysis") if results.get("analysis",{}).get("type")=="pl" else None)
    bs_data = results.get("bs_current")  or (results.get("analysis") if results.get("analysis",{}).get("type")=="bs" else None)
    tax_data = results.get("tax")

    _build_summary_sheet(wb, results)
    _build_pl_sheet(wb, pl_data)
    _build_bs_sheet(wb, bs_data)
    _build_pl_table_sheet(wb, pl_data)
    _build_bs_table_sheet(wb, bs_data)
    _build_tax_sheet(wb, tax_data)
    if monthly_data:
        _build_monthly_sheet(wb, monthly_data)

    # Remove any empty sheets (sheets with no data added)
    sheets_to_remove = []
    for sh in wb.worksheets:
        if sh.max_row <= 1 and sh.title not in ("Executive Summary",):
            sheets_to_remove.append(sh.title)
    for title in sheets_to_remove:
        del wb[title]

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()
