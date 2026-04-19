import React, { useState, useRef } from 'react';
import axios from 'axios';
import API from '../config';
import DeductionsPanel from './DeductionsPanel';
import MonthlyDashboard from './MonthlyDashboard';

const ENTITY_OPTIONS = [
  { value: '', label: 'Not Specified (skip tax)' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 's_corp', label: 'S-Corp' },
  { value: 'c_corp', label: 'C-Corp' },
];

const COUNTRY_OPTIONS = [
  { value: '', label: 'Select country...' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'UK', label: '🇬🇧 United Kingdom' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'DE', label: '🇩🇪 Germany' },
];

// ── Reusable file upload slot ────────────────────────────────────────────────
function FileSlot({ label, description, accept, onParsed, slotKey, parsed }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const inputRef = useRef();

  const upload = async (file) => {
    setLoading(true); setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post(`${API}/upload`, form);
      onParsed(slotKey, res.data);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Upload failed. Check file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  };

  const isOk = !!parsed;
  const borderColor = isOk ? '#34d399' : dragging ? '#22d3ee' : '#334155';
  const bg = isOk ? 'rgba(52,211,153,0.05)' : dragging ? 'rgba(34,211,238,0.04)' : 'transparent';

  return (
    <div>
      <div
        className="upload-zone p-6 text-center cursor-pointer transition-all"
        style={{ borderColor, background: bg }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isOk && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); }} />

        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <div style={{ width:32, height:32, border:'3px solid #1e293b', borderTop:'3px solid #34d399', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <p className="text-slate-400 text-sm">Detecting file type...</p>
          </div>
        ) : isOk ? (
          <div className="flex flex-col items-center gap-2">
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✓</div>
            <p className="text-emerald-400 font-semibold text-sm">{parsed.detected_label}</p>
            <p className="text-slate-500 text-xs font-mono">{parsed.filename} · {parsed.period}</p>
            <button className="text-xs text-slate-500 hover:text-slate-300 underline"
              onClick={(e) => { e.stopPropagation(); onParsed(slotKey, null); setError(null); }}>
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(30,41,59,0.8)', border:'1px solid #334155', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-slate-300 text-sm font-medium">{label}</p>
            <p className="text-slate-500 text-xs">{description}</p>
            <p className="text-slate-600 text-xs">CSV · XLSX · XLS</p>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-400 px-1">⚠ {error}</p>}
    </div>
  );
}

// ── Monthly-specific upload slot ─────────────────────────────────────────────
function MonthlyFileSlot({ onMonthlyData }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [filename, setFilename] = useState(null);
  const inputRef = useRef();

  const upload = async (file) => {
    setLoading(true); setError(null); setFilename(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post(`${API}/analyze/monthly`, form);
      onMonthlyData(res.data);
      setFilename(file.name);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Monthly analysis failed. Ensure file has Jan–Dec columns.');
      onMonthlyData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  };

  const borderColor = filename ? '#34d399' : dragging ? '#fbbf24' : '#334155';

  return (
    <div>
      <div
        className="upload-zone p-8 text-center cursor-pointer"
        style={{ borderColor, background: filename ? 'rgba(52,211,153,0.04)' : 'transparent' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
          onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); }} />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div style={{ width:36, height:36, border:'3px solid #1e293b', borderTop:'3px solid #fbbf24', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <p className="text-amber-400 text-sm font-medium">Detecting anomalies & building forecast...</p>
          </div>
        ) : filename ? (
          <div className="flex flex-col items-center gap-2">
            <div style={{ width:48, height:48, borderRadius:12, background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>✓</div>
            <p className="text-emerald-400 font-semibold">Analysis complete</p>
            <p className="text-slate-500 text-xs font-mono">{filename}</p>
            <button className="text-xs text-slate-500 hover:text-slate-300 underline mt-1"
              onClick={(e) => { e.stopPropagation(); setFilename(null); onMonthlyData(null); }}>
              Upload different file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span style={{ fontSize:40 }}>📅</span>
            <div>
              <p className="text-slate-300 font-medium">Drop your monthly P&L here</p>
              <p className="text-slate-500 text-sm mt-1">QuickBooks export with Jan–Dec columns · CSV or XLSX</p>
            </div>
            <div className="flex gap-2 mt-1">
              {['.CSV', '.XLSX', '.XLS'].map(ext => (
                <span key={ext} className="px-2 py-0.5 rounded text-xs font-mono text-slate-500"
                  style={{ background:'rgba(51,65,85,0.5)', border:'1px solid #334155' }}>
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">⚠ {error}</p>}
    </div>
  );
}

// ── Main Upload Page ──────────────────────────────────────────────────────────
export default function UploadPage({ onAnalysisDone }) {
  const [parsed, setParsed]         = useState({ pl: null, bsCurrent: null, bsPrevious: null });
  const [entity, setEntity]         = useState('');
  const [country, setCountry]       = useState('');
  const [deductions, setDeductions] = useState({});
  const [mode, setMode]             = useState('quick'); // 'quick' | 'full' | 'monthly'
  const [monthlyData, setMonthlyData] = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [error, setError]           = useState(null);

  const handleParsed = (key, data) => {
    setParsed(p => ({ ...p, [key]: data }));
    setError(null); // BUG FIX: clear stale errors when a file is added/removed
  };

  // BUG FIX: clear error when mode changes
  const handleModeChange = (m) => {
    setMode(m);
    setError(null);
  };

  // BUG FIX: canAnalyze is mode-aware — monthly mode has its own upload flow
  const canAnalyze = mode === 'monthly'
    ? false  // monthly mode doesn't use the main analyze button
    : mode === 'full'
      ? !!(parsed.pl && parsed.bsCurrent)
      : !!(parsed.pl || parsed.bsCurrent);

  const analyze = async () => {
    // BUG FIX: guard against running in monthly mode
    if (mode === 'monthly') return;
    setAnalyzing(true); setError(null);
    try {
      let result = {};

      if (mode === 'full' && parsed.pl && parsed.bsCurrent) {
        const res = await axios.post(`${API}/analyze/full`, {
          pl_data:          parsed.pl.parsed_data,
          bs_current_data:  parsed.bsCurrent.parsed_data,
          bs_previous_data: parsed.bsPrevious?.parsed_data || null,
          entity_type: entity || null,
          country:     country || null,
          deductions:  Object.keys(deductions).length ? deductions : null,
        });
        result = { mode: 'full', ...res.data };

      } else if (parsed.pl) {
        const res = await axios.post(`${API}/analyze/pl`, {
          parsed_data: parsed.pl.parsed_data,
          entity_type: entity || null,
          country:     country || null,
          deductions:  Object.keys(deductions).length ? deductions : null,
        });
        result = { mode: 'pl', ...res.data };

      } else if (parsed.bsCurrent) {
        const res = await axios.post(`${API}/analyze/bs`, {
          parsed_data: parsed.bsCurrent.parsed_data,
        });
        result = { mode: 'bs', ...res.data };
      }

      onAnalysisDone(result);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Analysis failed. Please check your files and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const inputStyle = {
    background:'#0f172a', border:'1px solid #334155', borderRadius:8,
    color:'#e2e8f0', padding:'8px 12px', fontSize:13, width:'100%', outline:'none',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10 fade-up">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#34d399,#22d3ee)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20v-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-slate-300 text-lg" style={{ fontFamily:'DM Serif Display' }}>FinAnalyzer</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3" style={{ fontFamily:'DM Serif Display', lineHeight:1.15 }}>
          Financial Statement<br/><span className="gradient-text">Analyzer</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto">
          Upload QuickBooks exports — get instant P&L, Balance Sheet insights, financial ratios, and tax estimates.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap gap-2 mb-6 fade-up-1 justify-center">
        {[
          ['quick',   'Quick Analysis',   'One file · instant insights'],
          ['full',    'Full Analysis',    'P&L + Balance Sheet + Cash Flow'],
          ['monthly', 'Monthly Analysis', 'Anomaly detection + profit prediction'],
        ].map(([m, title, sub]) => (
          <button key={m} onClick={() => handleModeChange(m)}
            className="px-5 py-3 rounded-xl text-sm font-medium transition-all text-left"
            style={{
              background: mode === m ? 'rgba(52,211,153,0.12)' : 'rgba(15,23,42,0.6)',
              border: mode === m ? '1px solid rgba(52,211,153,0.35)' : '1px solid #334155',
              color: mode === m ? '#34d399' : '#94a3b8',
            }}>
            <div className="font-semibold">{title}</div>
            <div className="text-xs opacity-70 mt-0.5">{sub}</div>
          </button>
        ))}
      </div>

      {/* ── MONTHLY MODE: separate, self-contained UI ─────────────────────── */}
      {mode === 'monthly' && (
        <div className="glass w-full max-w-2xl p-6 fade-up-2">
          <MonthlyFileSlot onMonthlyData={setMonthlyData} />
          {monthlyData && (
            <div className="mt-6">
              <MonthlyDashboard data={monthlyData} />
            </div>
          )}
        </div>
      )}

      {/* ── QUICK / FULL MODE: standard file slots + entity + analyze ──────── */}
      {mode !== 'monthly' && (
        <div className="glass w-full max-w-2xl p-6 fade-up-2">
          {/* File slots */}
          <div className={`grid gap-4 mb-5 ${mode === 'full' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <FileSlot
              slotKey="pl" label="Profit & Loss" description="P&L or Income Statement"
              accept=".csv,.xlsx,.xls" onParsed={handleParsed} parsed={parsed.pl}
            />
            <FileSlot
              slotKey="bsCurrent" label="Balance Sheet" description="Current period"
              accept=".csv,.xlsx,.xls" onParsed={handleParsed} parsed={parsed.bsCurrent}
            />
            {mode === 'full' && (
              <FileSlot
                slotKey="bsPrevious" label="Balance Sheet (Prev)" description="Previous period (optional)"
                accept=".csv,.xlsx,.xls" onParsed={handleParsed} parsed={parsed.bsPrevious}
              />
            )}
          </div>

          {/* Entity + Country */}
          <div className="grid grid-cols-2 gap-3 mb-4 pt-4" style={{ borderTop:'1px solid rgba(51,65,85,0.4)' }}>
            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">Entity Type</label>
              <select value={entity} onChange={e => { setEntity(e.target.value); if (!e.target.value) setCountry(''); }} style={inputStyle}>
                {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!entity && <p className="text-xs text-amber-500/70 mt-1">Select entity type to unlock tax insights</p>}
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">Country</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                disabled={!entity} style={{ ...inputStyle, opacity: entity ? 1 : 0.5, cursor: entity ? 'auto' : 'not-allowed' }}>
                {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Deductions panel (US pass-through only) */}
          <DeductionsPanel
            country={country}
            entityType={entity}
            netProfit={null}
            onDeductionsChange={setDeductions}
          />

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm text-rose-300"
              style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)' }}>
              ⚠ {error}
            </div>
          )}

          {/* Analyze button — BUG FIX: label is mode-aware */}
          <button onClick={analyze} disabled={!canAnalyze || analyzing}
            className="mt-4 w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: canAnalyze && !analyzing ? 'linear-gradient(135deg,#34d399,#22d3ee)' : 'rgba(51,65,85,0.5)',
              color: canAnalyze && !analyzing ? '#0a0f1e' : '#475569',
              cursor: canAnalyze && !analyzing ? 'pointer' : 'not-allowed',
              border: 'none', letterSpacing: '0.02em',
            }}>
            {analyzing
              ? 'Analyzing...'
              : mode === 'full'
                ? 'Run Full Analysis →'
                : 'Run Quick Analysis →'}
          </button>
        </div>
      )}

      {/* Hint */}
      <p className="mt-6 text-slate-600 text-xs text-center fade-up-3">
        Sample files in GitHub repo · Supports QuickBooks Online exports (XLSX/CSV)
        {mode === 'monthly' && ' · Use a multi-column monthly export (Jan–Dec columns)'}
      </p>
    </div>
  );
}
