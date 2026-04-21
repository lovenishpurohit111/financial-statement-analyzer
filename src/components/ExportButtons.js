import React, { useState, useRef } from 'react';
import axios from 'axios';
import API from '../config';

const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n??0);

function Spinner({ color = '#C41E3A' }) {
  return (
    <div style={{ width:14, height:14, border:`2px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
  );
}

export default function ExportButtons({ results, monthlyData, dashboardRef, sourceFile }) {
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(null);

  const hasData = !!(results?.analysis || results?.pl_analysis || results?.bs_current);
  const period  = results?.pl_analysis?.period || results?.analysis?.period || results?.bs_current?.period || 'Report';

  const flash = (msg, isErr=false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  };

  // ── Excel export ──────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (!hasData) return;
    setExcelLoading(true); setError(null); setSuccess(null);
    try {
      // Build multipart form — pass results as JSON string + optional source file
      const form = new FormData();
      form.append('results', JSON.stringify(results));
      form.append('monthly_data', monthlyData ? JSON.stringify(monthlyData) : 'null');
      // Attach source file if stored in component props
      if (sourceFile) form.append('source_file', sourceFile);
      const res = await axios.post(
        `${API}/export/excel`,
        form,
        { responseType: 'blob', timeout: 60000,
          headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `financial-analysis-${period.replace(/[^a-z0-9]/gi,'-').slice(0,30)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash('Excel report downloaded — 6 sheets with charts, tables & filters');
    } catch (e) {
      flash('Excel export failed. Please try again.', true);
      console.error(e);
    } finally {
      setExcelLoading(false);
    }
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!hasData) return;
    setPdfLoading(true); setError(null); setSuccess(null);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const el = dashboardRef?.current;
      if (!el) { flash('Could not capture dashboard. Try scrolling to the top.', true); return; }

      // Temporarily expand for full capture
      const prevOverflow = el.style.overflow;
      el.style.overflow = 'visible';

      const canvas = await html2canvas(el, {
        scale: 1.8,
        useCORS: true,
        backgroundColor: '#F7F4EE',
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      el.style.overflow = prevOverflow;

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = pdf.internal.pageSize.getHeight();
      const ratio   = canvas.width / pdfW;
      const imgH    = canvas.height / ratio;

      let yPos = 0;
      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, imgH);
        yPos += pdfH;
      }

      pdf.save(`financial-analysis-${period.replace(/[^a-z0-9]/gi,'-').slice(0,30)}.pdf`);
      flash('PDF downloaded successfully');
    } catch (e) {
      flash('PDF export failed. Try again.', true);
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  const btnStyle = (color, borderColor, disabled) => ({
    display:        'flex',
    alignItems:     'center',
    gap:            8,
    padding:        '8px 18px',
    background:     '#FFFFFF',
    border:         `1.5px solid ${disabled ? '#C4BAA8' : borderColor}`,
    borderRadius:   2,
    color:          disabled ? '#C4BAA8' : color,
    fontSize:       12,
    fontFamily:     'IBM Plex Sans',
    fontWeight:     600,
    cursor:         disabled ? 'not-allowed' : 'pointer',
    letterSpacing:  '0.03em',
    transition:     'all 0.15s',
    whiteSpace:     'nowrap',
    opacity:        disabled ? 0.6 : 1,
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>

        {/* Excel button */}
        <button
          onClick={exportExcel}
          disabled={!hasData || excelLoading}
          style={btnStyle('#1B6535', '#1B6535', !hasData || excelLoading)}
          title="Export 6-sheet Excel workbook: Summary · P&L Charts · Balance Sheet · Data Tables (filterable) · Tax · Monthly Trends"
        >
          {excelLoading ? <Spinner color="#1B6535" /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 8l4 4 4-4M8 16l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {excelLoading ? 'Building Excel…' : 'Export Excel'}
        </button>

        {/* PDF button */}
        <button
          onClick={exportPDF}
          disabled={!hasData || pdfLoading}
          style={btnStyle('#C41E3A', '#C41E3A', !hasData || pdfLoading)}
          title="Download dashboard as PDF"
        >
          {pdfLoading ? <Spinner color="#C41E3A" /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="13" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="9 16 12 19 15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {pdfLoading ? 'Generating PDF…' : 'Export PDF'}
        </button>
      </div>

      {/* Status messages */}
      {success && (
        <p style={{ fontSize:11, color:'#1B6535', fontFamily:'IBM Plex Sans', background:'#EAF6EE', padding:'4px 10px', borderRadius:2, border:'1px solid #1B6535' }}>
          ✓ {success}
        </p>
      )}
      {error && (
        <p style={{ fontSize:11, color:'#C41E3A', fontFamily:'IBM Plex Sans', background:'#FCEEF1', padding:'4px 10px', borderRadius:2, border:'1px solid #C41E3A' }}>
          ⚠ {error}
        </p>
      )}

      {/* Excel contents tooltip */}
      {!hasData && (
        <p style={{ fontSize:10, color:'#C4BAA8', fontFamily:'IBM Plex Mono', letterSpacing:'0.04em' }}>
          UPLOAD A FILE TO ENABLE EXPORTS
        </p>
      )}
    </div>
  );
}
