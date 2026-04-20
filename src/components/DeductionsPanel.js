import React, { useState } from 'react';

const DEDUCTIONS = [
  { key:'health_insurance',    label:'Self-Employed Health Insurance', icon:'🏥', type:'dollar', note:'100% deductible (Sec 162(l)). Premiums for you, spouse & dependents. Cannot exceed net SE income.' },
  { key:'sep_ira',             label:'SEP-IRA Contribution',           icon:'🏦', type:'dollar', note:'2024: up to 25% of net earnings or $69,000 max.' },
  { key:'solo_401k',           label:'Solo 401(k) Contribution',       icon:'📈', type:'dollar', note:'2024: employee deferral $23,000 + employer up to 25% comp. Total max $69,000.' },
  { key:'home_office',         label:'Home Office (sq ft)',             icon:'🏠', type:'sqft',   note:'Simplified method: $5/sq ft, max 300 sq ft = $1,500 deduction (Sec 280A).' },
  { key:'vehicle_miles',       label:'Business Miles Driven',           icon:'🚗', type:'miles',  note:'2024 IRS rate: 67¢ per business mile. Keep a mileage log.' },
  { key:'section_179',         label:'Section 179 Equipment',           icon:'🖥️', type:'dollar', note:'2024: immediately expense up to $1,220,000 of qualifying business equipment.' },
  { key:'meals_entertainment', label:'Business Meals (full cost)',       icon:'🍽️', type:'dollar', deductiblePct:0.5, note:'50% deductible post-TCJA. Enter total — we apply the 50% rule.' },
  { key:'other_deductions',    label:'Other Business Deductions',       icon:'📋', type:'dollar', note:'Other ordinary & necessary expenses not already in your P&L.' },
];

const FILING_OPTIONS = [
  { value:'single',  label:'Single' },
  { value:'married', label:'Married Filing Jointly' },
];

function computePreview(values) {
  let t = 0;
  if (values.health_insurance)    t += Number(values.health_insurance)||0;
  if (values.sep_ira)             t += Number(values.sep_ira)||0;
  if (values.solo_401k)           t += Number(values.solo_401k)||0;
  if (values.home_office)         t += Math.min((Number(values.home_office)||0),300)*5;
  if (values.vehicle_miles)       t += (Number(values.vehicle_miles)||0)*0.67;
  if (values.section_179)         t += Math.min(Number(values.section_179)||0,1220000);
  if (values.meals_entertainment) t += (Number(values.meals_entertainment)||0)*0.5;
  if (values.other_deductions)    t += Number(values.other_deductions)||0;
  return Math.round(t);
}

const fmtC = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);

export default function DeductionsPanel({ country, entityType, onDeductionsChange }) {
  const [open,   setOpen]   = useState(false);
  const [values, setValues] = useState({});
  const [filing, setFiling] = useState('single');

  const isUS          = country === 'US';
  const isPassThrough = ['sole_proprietorship','partnership','s_corp'].includes(entityType);

  // Non-US or C-Corp: show simple other-deductions input only
  if (!isUS || !entityType) {
    if (!entityType) return null;
    return (
      <div style={{background:'#FAF8F4',border:'1px solid #E2DDD4',padding:'14px 16px',marginTop:12,borderRadius:4}}>
        <label style={{display:'block',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Additional Deductions ($)</label>
        <input type="number" min="0" placeholder="0"
          style={{width:'100%',border:'1.5px solid #C4BAA8',borderRadius:2,padding:'8px 10px',fontSize:13,fontFamily:'IBM Plex Mono',color:'#1A1009',background:'#FFFFFF',outline:'none'}}
          onChange={e => onDeductionsChange({ other_deductions: Number(e.target.value)||0 })} />
        <p style={{margin:'5px 0 0',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>Business expenses not already captured in your P&L.</p>
      </div>
    );
  }

  if (!isPassThrough) {
    // C-Corp: Section 179 + other
    return (
      <div style={{background:'#FAF8F4',border:'1px solid #E2DDD4',padding:'14px 16px',marginTop:12,borderRadius:4}}>
        <p style={{margin:'0 0 10px',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.08em',textTransform:'uppercase'}}>C-Corp Deductions (optional)</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[{key:'section_179',label:'Section 179 ($)',note:'Max $1,220,000'},{key:'other_deductions',label:'Other Deductions ($)',note:'Not already in P&L'}].map(d=>(
            <div key={d.key}>
              <label style={{display:'block',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',marginBottom:4}}>{d.label}</label>
              <input type="number" min="0" placeholder="0"
                style={{width:'100%',border:'1.5px solid #C4BAA8',borderRadius:2,padding:'7px 10px',fontSize:13,fontFamily:'IBM Plex Mono',color:'#1A1009',background:'#FFFFFF',outline:'none'}}
                onChange={e => { const v={...values,[d.key]:e.target.value}; setValues(v); onDeductionsChange({...v,filing_status:filing}); }}/>
              <p style={{margin:'3px 0 0',fontSize:10,color:'#C4BAA8',fontFamily:'IBM Plex Sans'}}>{d.note}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const preview = computePreview(values);
  const update  = (key,val) => { const n={...values,[key]:val}; setValues(n); onDeductionsChange({...n,filing_status:filing}); };
  const updFil  = f => { setFiling(f); onDeductionsChange({...values,filing_status:f}); };

  const inp = { width:'100%', border:'1.5px solid #C4BAA8', borderRadius:2, padding:'7px 10px', fontSize:13, fontFamily:'IBM Plex Mono', color:'#1A1009', background:'#FFFFFF', outline:'none' };

  return (
    <div style={{marginTop:12,border:'1px solid #E2DDD4',borderRadius:4,overflow:'hidden'}}>
      {/* Header toggle */}
      <button onClick={()=>setOpen(!open)}
        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 16px',background:'#FAF8F4',border:'none',cursor:'pointer',fontFamily:'IBM Plex Sans',borderBottom:open?'1px solid #E2DDD4':'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:15}}>💸</span>
          <div style={{textAlign:'left'}}>
            <p style={{margin:0,fontWeight:600,fontSize:13,color:'#1A1009'}}>US Tax Deductions — 2024</p>
            <p style={{margin:'2px 0 0',fontSize:11,color:'#8A7F70',fontFamily:'IBM Plex Sans'}}>
              {preview>0?`${fmtC(preview)} in deductions entered`:'Click to enter deductions and reduce your tax estimate'}
            </p>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {preview>0 && <span style={{fontSize:11,fontFamily:'IBM Plex Mono',background:'#EAF6EE',color:'#1B6535',padding:'3px 10px',borderRadius:2,fontWeight:700}}>−{fmtC(preview)}</span>}
          <span style={{fontSize:10,color:'#8A7F70',fontFamily:'IBM Plex Mono'}}>{open?'▲ COLLAPSE':'▼ EXPAND'}</span>
        </div>
      </button>

      {open && (
        <div style={{padding:16,background:'#FFFFFF'}}>
          {/* Filing status */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:11,fontFamily:'IBM Plex Mono',color:'#8A7F70',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8}}>Filing Status</label>
            <div style={{display:'flex',gap:8}}>
              {FILING_OPTIONS.map(o=>(
                <button key={o.value} onClick={()=>updFil(o.value)}
                  style={{padding:'7px 16px',border:`1.5px solid ${filing===o.value?'#C41E3A':'#C4BAA8'}`,borderRadius:2,background:filing===o.value?'#FCEEF1':'#FFFFFF',color:filing===o.value?'#C41E3A':'#8A7F70',fontSize:12,fontFamily:'IBM Plex Sans',fontWeight:filing===o.value?600:400,cursor:'pointer',transition:'all 0.15s'}}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deduction inputs grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
            {DEDUCTIONS.map(d => {
              const raw = Number(values[d.key])||0;
              const ded = d.type==='sqft' ? Math.min(raw,300)*5 : d.type==='miles' ? raw*0.67 : d.deductiblePct ? raw*d.deductiblePct : raw;
              return (
                <div key={d.key} style={{background:'#FAF8F4',border:'1px solid #E2DDD4',padding:'12px 14px',borderRadius:4}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                    <span style={{fontSize:14}}>{d.icon}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'#1A1009',fontFamily:'IBM Plex Sans'}}>{d.label}</span>
                  </div>
                  <input type="number" min="0" placeholder="0" value={values[d.key]||''} onChange={e=>update(d.key,e.target.value)} style={inp}/>
                  {ded>0 && <p style={{margin:'4px 0 0',fontSize:11,fontFamily:'IBM Plex Mono',color:'#1B6535',fontWeight:600}}>→ {fmtC(ded)} deduction</p>}
                  <p style={{margin:'4px 0 0',fontSize:10,color:'#8A7F70',fontFamily:'IBM Plex Sans',lineHeight:1.5}}>{d.note}</p>
                </div>
              );
            })}
          </div>

          {preview>0 && (
            <div style={{marginTop:14,display:'flex',justifyContent:'space-between',alignItems:'center',background:'#EAF6EE',border:'1px solid #1B6535',padding:'10px 16px',borderRadius:4}}>
              <span style={{fontSize:13,color:'#1A1009',fontFamily:'IBM Plex Sans',fontWeight:600}}>Total Deductions Applied</span>
              <span style={{fontFamily:'IBM Plex Mono',fontWeight:700,fontSize:16,color:'#1B6535'}}>{fmtC(preview)}</span>
            </div>
          )}

          <div style={{marginTop:12,background:'#FEF3C7',border:'1px solid #FCD34D',padding:'10px 14px',borderRadius:4,fontSize:11,color:'#92400E',fontFamily:'IBM Plex Sans',lineHeight:1.6}}>
            ⚠ <strong>Do not double-count:</strong> Deductions already in your P&L (rent, salaries, software) are already reducing net profit. Only enter <em>additional personal/business deductions</em> not in the uploaded file.
          </div>
        </div>
      )}
    </div>
  );
}
