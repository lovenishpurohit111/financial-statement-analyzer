import React, { useState } from 'react';
import axios from 'axios';
import API from '../config';

function Spinner({ color = '#C41E3A' }) {
  return (
    <div style={{ width:14, height:14, border:`2px solid ${color}33`,
      borderTop:`2px solid ${color}`, borderRadius:'50%',
      animation:'spin 0.7s linear infinite', flexShrink:0 }} />
  );
}

/** Read a File object as base64 string. Returns null if no file. */
async function fileToBase64(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]); // strip data:...;base64,
    reader.onerror = () => resolve(null); // don't block export if file read fails
    reader.readAsDataURL(file);
  });
}

export default function ExportButtons({ results, monthlyData, dashboardRef, sourceFile }) {
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(null);

  const hasData = !!(results?.analysis || results?.pl_analysis || results?.bs_current);
  const period  = results?.pl_analysis?.period
                || results?.analysis?.period
                || results?.bs_current?.period
                || 'Report';

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 5000);
  };

  // ── Excel export (JSON POST with optional base64 source file) ─────────────
  const exportExcel = async () => {
    if (!hasData) return;
    setExcelLoading(true); setError(null); setSuccess(null);
    try {
      // Encode source file as base64 if available
      const b64  = await fileToBase64(sourceFile);
      const name = sourceFile?.name || null;

      const res = await axios.post(
        `${API}/export/excel`,
        {
          results,
          monthly_data:    monthlyData || null,
          source_file_b64: b64,
          source_filename: name,
        },
        { responseType: 'blob', timeout: 60000 }
      );

      const url  = URL.createObjectURL(new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `financial-analysis-${period.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash('Excel downloaded — 7 sheets: Summary · P&L · BS · Data Tables · Formulas · Tax · Source File');
    } catch (e) {
      const msg = e.response?.data
        ? (typeof e.response.data === 'string' ? e.response.data : 'Export failed')
        : e.message || 'Export failed';
      flash(msg, true);
      console.error('Excel export error:', e);
    } finally {
      setExcelLoading(false);
    }
  };

  // ── PDF export (html2canvas capture) ─────────────────────────────────────
  const exportPDF = async () => {
    if (!hasData) return;
    setPdfLoading(true); setError(null); setSuccess(null);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const el = dashboardRef?.current;
      if (!el) { flash('Could not capture dashboard.', true); return; }

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'visible';

      const canvas = await html2canvas(el, {
        scale: 1.8,
        useCORS: true,
        backgroundColor: '#F7F4EE',
        logging: false,
        windowWidth:  el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      document.body.style.overflow = prevOverflow;

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = pdf.internal.pageSize.getHeight();
      const imgH    = canvas.height * pdfW / canvas.width;
      let   yPos    = 0;

      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, imgH);
        yPos += pdfH;
      }

      pdf.save(`financial-analysis-${period.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.pdf`);
      flash('PDF downloaded successfully');
    } catch (e) {
      flash('PDF export failed. Try again.', true);
      console.error('PDF export error:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const btnStyle = (color, disabled) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 18px',
    background: '#FFFFFF',
    border: `1.5px solid ${disabled ? '#C4BAA8' : color}`,
    borderRadius: 2,
    color: disabled ? '#C4BAA8' : color,
    fontSize: 12,
    fontFamily: 'IBM Plex Sans',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: '0.03em',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.55 : 1,
  });

  const ExcelIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const PDFIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="13" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="9 16 12 19 15 16" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>

        {/* Excel */}
        <button
          onClick={exportExcel}
          disabled={!hasData || excelLoading}
          style={btnStyle('#1B6535', !hasData || excelLoading)}
          title="7-sheet Excel: Summary · P&L Charts · Balance Sheet · Filterable Data Tables · SUMIF Formulas · Tax · Raw Source File"
        >
          {excelLoading ? <Spinner color="#1B6535" /> : <ExcelIcon />}
          {excelLoading ? 'Building Excel…' : 'Export Excel'}
        </button>

        {/* PDF */}
        <button
          onClick={exportPDF}
          disabled={!hasData || pdfLoading}
          style={btnStyle('#C41E3A', !hasData || pdfLoading)}
          title="Download full dashboard as PDF"
        >
          {pdfLoading ? <Spinner color="#C41E3A" /> : <PDFIcon />}
          {pdfLoading ? 'Generating PDF…' : 'Export PDF'}
        </button>
      </div>

      {/* Status messages */}
      {success && (
        <p style={{ fontSize:11, color:'#1B6535', fontFamily:'IBM Plex Sans',
          background:'#EAF6EE', padding:'4px 10px', borderRadius:2,
          border:'1px solid #1B6535', maxWidth:360, textAlign:'right' }}>
          ✓ {success}
        </p>
      )}
      {error && (
        <p style={{ fontSize:11, color:'#C41E3A', fontFamily:'IBM Plex Sans',
          background:'#FCEEF1', padding:'4px 10px', borderRadius:2,
          border:'1px solid #C41E3A', maxWidth:360, textAlign:'right' }}>
          ⚠ {error}
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
