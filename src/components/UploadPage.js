import React, { useState, useRef } from 'react';
import axios from 'axios';
import API from '../config';
import DeductionsPanel from './DeductionsPanel';
import MonthlyDashboard from './MonthlyDashboard';

const ENTITY_OPTIONS = [
  { value: '', label: 'Not specified — skip tax estimation' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership',         label: 'Partnership' },
  { value: 's_corp',              label: 'S-Corporation' },
  { value: 'c_corp',              label: 'C-Corporation' },
];

const COUNTRY_OPTIONS = [
  { value: '', label: 'Select country…' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'UK', label: '🇬🇧 United Kingdom' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'DE', label: '🇩🇪 Germany' },
];

const INDUSTRY_OPTIONS = [
  { value: '',                      label: 'Select industry (optional)…' },
  { value: 'saas',                  label: '💻 SaaS / Software' },
  { value: 'professional_services', label: '💼 Professional Services' },
  { value: 'retail',                label: '🛍️ Retail (General)' },
  { value: 'ecommerce',             label: '🛒 E-Commerce' },
  { value: 'restaurant',            label: '🍽️ Restaurant / Food Service' },
  { value: 'healthcare',            label: '🏥 Healthcare / Medical' },
  { value: 'construction',          label: '🏗️ Construction' },
  { value: 'manufacturing',         label: '🏭 Manufacturing' },
  { value: 'real_estate_services',  label: '🏘️ Real Estate Services' },
  { value: 'technology_it',         label: '💡 Technology / IT Services' },
  { value: 'logistics',             label: '🚛 Logistics / Transportation' },
  { value: 'marketing_agency',      label: '🎯 Marketing / Creative Agency' },
  { value: 'fintech',               label: '💳 FinTech / Financial Services' },
  { value: 'education',             label: '📚 Education / Training' },
  { value: 'nonprofit',             label: '🤝 Non-Profit / NGO' },
];

function FileSlot({ label, sublabel, slotKey, parsed, onParsed, expectedType }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [drag,    setDrag]    = useState(false);
  const inputRef = useRef();

  const upload = async (file) => {
    setLoading(true); setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post(`${API}/upload`, form);
      if (expectedType && res.data.detected_type !== expectedType) {
        setError(`Expected ${expectedType === 'pl' ? 'P&L' : 'Balance Sheet'}, got: ${res.data.detected_label}. Upload the correct file.`);
        return;
      }
      onParsed(slotKey, res.data, file);  // pass File object for Excel export
      setError(null);
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Upload failed — check file format.');
    } finally { setLoading(false); }
  };

  const drop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); };
  const isOk = !!parsed;

  return (
    <div>
      <div
        className="upload-zone"
        style={{ padding:24, textAlign:'center', cursor: isOk ? 'default' : 'pointer',
          borderColor: isOk ? '#1B6535' : drag ? '#C41E3A' : '#C4BAA8',
          background:  isOk ? '#EAF6EE'  : drag ? '#FCEEF1'  : '#FFFFFF' }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={drop}
        onClick={() => !isOk && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}}
          onChange={e => { if (e.target.files[0]) upload(e.target.files[0]); }} />

        {loading ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:28,height:28,border:'2px solid #EDE9DF',borderTop:'2px solid #C41E3A',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
            <span style={{fontSize:13,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>Detecting file type…</span>
          </div>
        ) : isOk ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{width:36,height:36,borderRadius:4,background:'#1B6535',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:18,fontWeight:700}}>✓</div>
            <span style={{fontWeight:600,fontSize:13,color:'#1B6535',fontFamily:'IBM Plex Sans'}}>{parsed.detected_label}</span>
            <span style={{fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>{parsed.filename} · {parsed.period}</span>
            <button style={{fontSize:11,color:'#C41E3A',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontFamily:'IBM Plex Sans'}}
              onClick={e => { e.stopPropagation(); onParsed(slotKey, null); setError(null); }}>
              Remove
            </button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <div style={{width:40,height:40,borderRadius:4,border:'1.5px solid #C4BAA8',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF8F4'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#8A7F70" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke="#8A7F70" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="#8A7F70" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{margin:0,fontWeight:600,fontSize:13,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>{label}</p>
              <p style={{margin:'3px 0 0',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>{sublabel}</p>
            </div>
            <span style={{fontSize:10,color:'#C4BAA8',fontFamily:'IBM Plex Mono',letterSpacing:'0.08em'}}>CSV · XLSX · XLS</span>
          </div>
        )}
      </div>
      {error && <p style={{marginTop:6,fontSize:11,color:'#C41E3A',fontFamily:'IBM Plex Sans'}}>⚠ {error}</p>}
    </div>
  );
}

function MonthlyFileSlot({ onMonthlyData }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [filename, setFilename] = useState(null);
  const [drag,     setDrag]     = useState(false);
  const inputRef = useRef();

  const upload = async (file) => {
    setLoading(true); setError(null); setFilename(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post(`${API}/analyze/monthly`, form);
      onMonthlyData(res.data); setFilename(file.name);
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Analysis failed — ensure file has Jan–Dec columns.');
      onMonthlyData(null);
    } finally { setLoading(false); }
  };

  const drop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f); };

  return (
    <div>
      <div className="upload-zone"
        style={{ padding:40, textAlign:'center', cursor:'pointer',
          borderColor: filename ? '#1B6535' : drag ? '#C41E3A' : '#C4BAA8',
          background:  filename ? '#EAF6EE'  : drag ? '#FCEEF1'  : '#FFFFFF' }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={drop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}}
          onChange={e => { if (e.target.files[0]) upload(e.target.files[0]); }} />

        {loading ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
            <div style={{width:32,height:32,border:'2px solid #EDE9DF',borderTop:'2px solid #C41E3A',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
            <p style={{margin:0,fontSize:14,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>Running anomaly detection & forecast model…</p>
          </div>
        ) : filename ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <div style={{width:48,height:48,borderRadius:4,background:'#1B6535',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:22}}>✓</div>
            <p style={{margin:0,fontWeight:600,fontSize:14,color:'#1B6535',fontFamily:'IBM Plex Sans'}}>Analysis complete</p>
            <p style={{margin:0,fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>{filename}</p>
            <button style={{fontSize:11,color:'#C41E3A',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',marginTop:4,fontFamily:'IBM Plex Sans'}}
              onClick={e => { e.stopPropagation(); setFilename(null); onMonthlyData(null); }}>
              Upload different file
            </button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
            <div style={{fontSize:36}}>📅</div>
            <div>
              <p style={{margin:0,fontWeight:600,fontSize:14,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>Drop your monthly P&L here</p>
              <p style={{margin:'4px 0 0',fontSize:12,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>QuickBooks export with Jan–Dec columns</p>
            </div>
          </div>
        )}
      </div>
      {error && <p style={{marginTop:8,fontSize:12,color:'#C41E3A',fontFamily:'IBM Plex Sans'}}>⚠ {error}</p>}
    </div>
  );
}

const sel = { width:'100%', background:'#FFFFFF', border:'1.5px solid #C4BAA8', borderRadius:2, color:'#1A1009', padding:'9px 12px', fontSize:13, fontFamily:'IBM Plex Sans', outline:'none' };

export default function UploadPage({ onAnalysisDone }) {
  const [parsed,      setParsed]      = useState({ pl:null, bsCurrent:null, bsPrevious:null });
  const [entity,      setEntity]      = useState('');
  const [country,     setCountry]     = useState('');
  const [industry,    setIndustry]    = useState('');
  const [deductions,  setDeductions]  = useState({});
  const [mode,        setMode]        = useState('quick');
  const [monthlyData, setMonthlyData] = useState(null);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [error,       setError]       = useState(null);

  const [sourceFiles, setSourceFiles] = useState({});
  const handleParsed = (k, v, file) => {
    setParsed(p => ({...p, [k]: v}));
    if (file) setSourceFiles(sf => ({...sf, [k]: file}));  // store File object
    setError(null);
  };
  const handleModeChange  = (m)    => { setMode(m); setError(null); };

  const canAnalyze = mode === 'monthly' ? false
    : mode === 'full' ? !!(parsed.pl && parsed.bsCurrent)
    : !!(parsed.pl || parsed.bsCurrent);

  const analyze = async () => {
    if (mode === 'monthly') return;
    setAnalyzing(true); setError(null);
    try {
      let result = {};
      if (mode === 'full' && parsed.pl && parsed.bsCurrent) {
        const r = await axios.post(`${API}/analyze/full`, { pl_data:parsed.pl.parsed_data, bs_current_data:parsed.bsCurrent.parsed_data, bs_previous_data:parsed.bsPrevious?.parsed_data||null, entity_type:entity||null, country:country||null, deductions:Object.keys(deductions).length?deductions:null });
        result = { mode:'full', ...r.data };
      } else if (parsed.pl) {
        const r = await axios.post(`${API}/analyze/pl`, { parsed_data:parsed.pl.parsed_data, entity_type:entity||null, country:country||null, deductions:Object.keys(deductions).length?deductions:null });
        result = { mode:'pl', ...r.data };
      } else if (parsed.bsCurrent) {
        const r = await axios.post(`${API}/analyze/bs`, { parsed_data:parsed.bsCurrent.parsed_data });
        result = { mode:'bs', ...r.data };
      }
      onAnalysisDone(result, sourceFiles, industry);
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Analysis failed. Please check your files and try again.');
    } finally { setAnalyzing(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F7F4EE' }}>
      {/* Hero */}
      <div style={{ background:'#1A1009', color:'#F7F4EE', padding:'56px 24px 48px', textAlign:'center' }}>
        <p className="section-label" style={{ color:'#C41E3A', marginBottom:16 }}>Financial Intelligence Platform</p>
        <h1 className="headline" style={{ fontSize:'clamp(2rem,5vw,3.5rem)', color:'#F7F4EE', margin:'0 0 16px', lineHeight:1.1 }}>
          Financial Statement<br />
          <span style={{ color:'#C41E3A' }}>Analyzer</span>
        </h1>
        <p style={{ maxWidth:520, margin:'0 auto', fontSize:15, color:'#8A7F70', lineHeight:1.7, fontFamily:'IBM Plex Sans' }}>
          Upload QuickBooks exports. Get instant profitability insights, financial ratios, anomaly detection, and 2024/25 tax estimates — in seconds.
        </p>

        {/* Mode tabs */}
        <div style={{ display:'flex', justifyContent:'center', gap:4, marginTop:32, flexWrap:'wrap' }}>
          {[['quick','Quick Analysis','One file · instant insights'],
            ['full','Full Analysis','P&L + Balance Sheet + Cash Flow'],
            ['monthly','Monthly Analysis','Anomaly detection + forecast']].map(([m, title, sub]) => (
            <button key={m} onClick={() => handleModeChange(m)}
              style={{ padding:'10px 20px', background: mode===m ? '#C41E3A' : 'rgba(255,255,255,0.06)', border: mode===m ? '1px solid #C41E3A' : '1px solid rgba(255,255,255,0.12)', color: mode===m ? '#FFFFFF' : '#8A7F70', borderRadius:2, cursor:'pointer', fontFamily:'IBM Plex Sans', fontSize:13, fontWeight: mode===m ? 600 : 400, textAlign:'left', transition:'all 0.15s', minWidth:160 }}>
              <div style={{ fontWeight:600, marginBottom:2 }}>{title}</div>
              <div style={{ fontSize:11, opacity:0.75 }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 24px' }}>

        {/* Monthly mode */}
        {mode === 'monthly' && (
          <div className="fade-up">
            <div style={{ borderBottom:'1px solid #E2DDD4', paddingBottom:16, marginBottom:24 }}>
              <h2 className="headline" style={{ fontSize:22, margin:0 }}>Monthly P&L Analysis</h2>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'#8A7F70', fontFamily:'IBM Plex Sans' }}>
                Upload a QuickBooks P&L export with monthly columns (Jan–Dec) to detect anomalies and forecast profit.
              </p>
            </div>
            <MonthlyFileSlot onMonthlyData={setMonthlyData} />
            {monthlyData && <div style={{ marginTop:32 }}><MonthlyDashboard data={monthlyData} /></div>}
          </div>
        )}

        {/* Quick / Full mode */}
        {mode !== 'monthly' && (
          <div className="fade-up">
            <div style={{ borderBottom:'1px solid #E2DDD4', paddingBottom:16, marginBottom:24 }}>
              <h2 className="headline" style={{ fontSize:22, margin:0 }}>
                {mode === 'full' ? 'Full Financial Analysis' : 'Quick Analysis'}
              </h2>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'#8A7F70', fontFamily:'IBM Plex Sans' }}>
                {mode === 'full' ? 'Upload P&L and Balance Sheet for ROA, ROE, cash flow, and period comparison.' : 'Upload a single P&L or Balance Sheet for immediate insights.'}
              </p>
            </div>

            {/* File slots */}
            <div style={{ display:'grid', gridTemplateColumns: mode==='full' ? 'repeat(3,1fr)' : 'repeat(2,1fr)', gap:16, marginBottom:28 }}>
              <FileSlot slotKey="pl"         label="Profit & Loss"       sublabel="P&L or Income Statement"    onParsed={handleParsed} parsed={parsed.pl}         expectedType="pl" />
              <FileSlot slotKey="bsCurrent"  label="Balance Sheet"       sublabel="Current period"              onParsed={handleParsed} parsed={parsed.bsCurrent}  expectedType="bs" />
              {mode === 'full' && <FileSlot slotKey="bsPrevious" label="Balance Sheet (Prev)" sublabel="Prior period — optional" onParsed={handleParsed} parsed={parsed.bsPrevious} expectedType="bs" />}
            </div>

            {/* Industry selector */}
            <div style={{ background:'#FFFFFF', border:'1px solid #E2DDD4', borderTop:'3px solid #1B6535', padding:20, marginBottom:16 }}>
              <p className="section-label" style={{ marginBottom:6, color:'#1B6535' }}>Industry Benchmark (Optional)</p>
              <p style={{ margin:'0 0 12px', fontSize:12, color:'#8A7F70', fontFamily:'IBM Plex Sans' }}>Select your industry to unlock peer benchmarking in the dashboard.</p>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={sel}>
                {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Entity + Country */}
            <div style={{ background:'#FFFFFF', border:'1px solid #E2DDD4', borderTop:'3px solid #1A1009', padding:20, marginBottom:16 }}>
              <p className="section-label" style={{ marginBottom:14 }}>Tax Estimation (Optional)</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontFamily:'IBM Plex Mono', color:'#8A7F70', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Entity Type</label>
                  <select value={entity} onChange={e => { setEntity(e.target.value); if (!e.target.value) setCountry(''); }} style={sel}>
                    {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!entity && <p style={{ margin:'4px 0 0', fontSize:11, color:'#B45309', fontFamily:'IBM Plex Sans' }}>Select entity type to unlock tax insights</p>}
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontFamily:'IBM Plex Mono', color:'#8A7F70', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} disabled={!entity}
                    style={{ ...sel, opacity: entity ? 1 : 0.5, cursor: entity ? 'auto' : 'not-allowed' }}>
                    {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <DeductionsPanel country={country} entityType={entity} netProfit={null} onDeductionsChange={setDeductions} />

            {/* Error */}
            {error && (
              <div style={{ margin:'16px 0', padding:'12px 16px', background:'#FCEEF1', border:'1px solid #E8536A', borderLeft:'3px solid #C41E3A', borderRadius:2, fontSize:13, color:'#C41E3A', fontFamily:'IBM Plex Sans' }}>
                ⚠ {error}
              </div>
            )}

            {/* Analyze button */}
            <button onClick={analyze} disabled={!canAnalyze || analyzing} className="btn-primary"
              style={{ width:'100%', padding:'14px', fontSize:14, letterSpacing:'0.05em', marginTop:8, opacity: canAnalyze && !analyzing ? 1 : 0.5 }}>
              {analyzing ? 'Analyzing…' : mode === 'full' ? 'RUN FULL ANALYSIS →' : 'RUN QUICK ANALYSIS →'}
            </button>
          </div>
        )}


        {/* Sample file downloads */}
        <div style={{ marginTop:40, border:'1px solid #E2DDD4', borderRadius:4, overflow:'hidden', background:'#FFFFFF' }}>
          {/* Header */}
          <div style={{ background:'#1A1009', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <p style={{ margin:'0 0 3px', fontSize:11, fontFamily:'IBM Plex Mono', color:'#C41E3A', letterSpacing:'0.1em', textTransform:'uppercase' }}>Try before you upload</p>
              <h3 style={{ margin:0, fontFamily:'Playfair Display', fontSize:18, fontWeight:700, color:'#F7F4EE' }}>Download Sample Files</h3>
            </div>
            <p style={{ margin:0, fontSize:12, color:'#8A7F70', fontFamily:'IBM Plex Sans', maxWidth:360, lineHeight:1.6 }}>
              Real-format QuickBooks export samples — load them instantly to explore every feature without needing your own data.
            </p>
          </div>

          {/* Cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:0 }}>
            {[
              {
                file:  '/sample_pl.xlsx',
                name:  'sample_pl.xlsx',
                icon:  '📊',
                title: 'Profit & Loss',
                badge: 'Quick / Full Analysis',
                badgeColor: '#C41E3A',
                badgeBg:   '#FCEEF1',
                desc:  'Acme Consulting LLC — 2024 annual P&L with revenue, COGS, operating expenses, and other items.',
                rows:  '~40 line items',
                color: '#C41E3A',
              },
              {
                file:  '/sample_bs_current.xlsx',
                name:  'sample_bs_current.xlsx',
                icon:  '🏦',
                title: 'Balance Sheet (Current)',
                badge: 'Quick / Full Analysis',
                badgeColor: '#1E40AF',
                badgeBg:   '#EFF6FF',
                desc:  'Balance sheet as of Dec 31, 2024 — assets, liabilities, and equity with typical QuickBooks layout.',
                rows:  '~30 line items',
                color: '#1E40AF',
              },
              {
                file:  '/sample_bs_previous.xlsx',
                name:  'sample_bs_previous.xlsx',
                icon:  '📅',
                title: 'Balance Sheet (Prior Year)',
                badge: 'Full Analysis only',
                badgeColor: '#B45309',
                badgeBg:   '#FEF3C7',
                desc:  'Prior-year balance sheet (Dec 31, 2023) — use alongside Current BS for period-over-period comparison.',
                rows:  '~30 line items',
                color: '#B45309',
              },
              {
                file:  '/sample_pl_monthly_2025.xlsx',
                name:  'sample_pl_monthly_2025.xlsx',
                icon:  '📈',
                title: 'Monthly P&L (Jan–Dec)',
                badge: 'Monthly Analysis',
                badgeColor: '#1B6535',
                badgeBg:   '#EAF6EE',
                desc:  '12-month columnar P&L — use in Monthly Analysis mode for anomaly detection and profit forecasting.',
                rows:  '12 month columns',
                color: '#1B6535',
              },
            ].map((s, i) => (
              <div key={i} style={{ borderRight:'1px solid #EDE9DF', borderBottom:'1px solid #EDE9DF', padding:'20px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                {/* Icon + title */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:6, background:'#F7F4EE', border:`1.5px solid ${s.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{s.icon}</div>
                  <div>
                    <p style={{ margin:0, fontWeight:700, fontSize:13, color:'#1A1009', fontFamily:'IBM Plex Sans' }}>{s.title}</p>
                    <span style={{ fontSize:10, fontFamily:'IBM Plex Mono', color:s.badgeColor, background:s.badgeBg, padding:'2px 7px', borderRadius:2, fontWeight:600, letterSpacing:'0.06em' }}>{s.badge}</span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ margin:0, fontSize:12, color:'#8A7F70', fontFamily:'IBM Plex Sans', lineHeight:1.6, flex:1 }}>{s.desc}</p>

                {/* Meta row */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <span style={{ fontSize:10, fontFamily:'IBM Plex Mono', color:'#C4BAA8' }}>XLSX · {s.rows}</span>

                  {/* Download button */}
                  <a href={s.file} download={s.name}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:s.color, color:'#FFFFFF', textDecoration:'none', borderRadius:2, fontSize:11, fontFamily:'IBM Plex Sans', fontWeight:600, letterSpacing:'0.04em', transition:'opacity 0.15s', whiteSpace:'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Tip bar */}
          <div style={{ background:'#F7F4EE', borderTop:'1px solid #EDE9DF', padding:'12px 24px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:14 }}>💡</span>
            <p style={{ margin:0, fontSize:12, color:'#8A7F70', fontFamily:'IBM Plex Sans', lineHeight:1.6 }}>
              <strong style={{ color:'#3D3525' }}>Tip:</strong> For a Full Analysis demo, download the P&L + Balance Sheet (Current) + Balance Sheet (Prior Year) and upload all three at once. For monthly trends, use the Monthly P&L in Monthly Analysis mode.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign:'center', marginTop:24, fontSize:11, color:'#C4BAA8', fontFamily:'IBM Plex Mono', letterSpacing:'0.04em' }}>
          SUPPORTS QUICKBOOKS ONLINE EXPORTS · XLSX · CSV
        </p>
      </div>
    </div>
  );
}
