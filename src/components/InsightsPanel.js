import React, { useState, useEffect } from 'react';

const CFG = {
  positive: { border:'#1B6535', bg:'#EAF6EE', icon:'✓', iconBg:'#1B6535', iconColor:'#fff', tagColor:'#1B6535', tagBg:'#D1FAE5' },
  warning:  { border:'#B45309', bg:'#FEF3C7', icon:'!', iconBg:'#B45309', iconColor:'#fff', tagColor:'#92400E', tagBg:'#FDE68A' },
  critical: { border:'#C41E3A', bg:'#FCEEF1', icon:'!', iconBg:'#C41E3A', iconColor:'#fff', tagColor:'#C41E3A', tagBg:'#FECDD3' },
  info:     { border:'#1E40AF', bg:'#EFF6FF', icon:'i', iconBg:'#1E40AF', iconColor:'#fff', tagColor:'#1E40AF', tagBg:'#BFDBFE' },
};

export default function InsightsPanel({ insights = [] }) {
  const [filter, setFilter] = useState('all');
  useEffect(() => { setFilter('all'); }, [insights.length]);
  if (!insights?.length) return null;

  const counts  = insights.reduce((a,i) => { a[i.level]=(a[i.level]||0)+1; return a; }, {});
  const filtered = filter === 'all' ? insights : insights.filter(i => i.level === filter);

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #1A1009', paddingBottom:12, marginBottom:20 }}>
        <div>
          <h2 className="headline" style={{ fontSize:20, margin:0 }}>Financial Insights</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'#8A7F70', fontFamily:'IBM Plex Mono' }}>{insights.length} findings generated</p>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {['all','critical','warning','positive','info'].map(f => {
            const cnt = f === 'all' ? insights.length : counts[f]||0;
            if (f !== 'all' && !cnt) return null;
            const c = CFG[f] || { border:'#C4BAA8', tagColor:'#8A7F70', tagBg:'#EDE9DF' };
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'4px 12px', border:`1.5px solid ${active ? c.border : '#C4BAA8'}`, borderRadius:2, background: active ? c.tagBg : '#FFFFFF', color: active ? c.tagColor : '#8A7F70', fontSize:11, fontFamily:'IBM Plex Mono', cursor:'pointer', textTransform:'capitalize', transition:'all 0.15s', fontWeight: active ? 600 : 400, letterSpacing:'0.04em' }}>
                {f === 'all' ? `ALL (${cnt})` : `${f.toUpperCase()} (${cnt})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map((ins, i) => {
          const c = CFG[ins.level] || CFG.info;
          return (
            <div key={i} className="slide-in" style={{ animationDelay:`${i*0.04}s`, background:c.bg, borderLeft:`3px solid ${c.border}`, padding:'14px 18px', borderRadius:'0 4px 4px 0' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:22, height:22, borderRadius:3, background:c.iconBg, color:c.iconColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, marginTop:1 }}>
                  {c.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:10, fontFamily:'IBM Plex Mono', color:c.tagColor, background:c.tagBg, padding:'2px 7px', borderRadius:2, letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:600 }}>{ins.category}</span>
                  </div>
                  <p style={{ margin:'0 0 4px', fontWeight:600, fontSize:13, color:'#1A1009', fontFamily:'IBM Plex Sans' }}>{ins.title}</p>
                  <p style={{ margin:0, fontSize:13, color:'#3D3525', fontFamily:'IBM Plex Sans', lineHeight:1.6 }}>{ins.message}</p>
                  {ins.action && <p style={{ margin:'8px 0 0', fontSize:12, color:c.border, fontFamily:'IBM Plex Sans', fontWeight:500 }}>→ {ins.action}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
