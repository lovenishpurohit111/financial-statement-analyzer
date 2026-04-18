import React, { useState } from 'react';

const LEVEL_CONFIG = {
  positive: { color:'#34d399', bg:'rgba(52,211,153,0.08)', border:'rgba(52,211,153,0.2)', icon:'✓', label:'Positive' },
  warning:  { color:'#fbbf24', bg:'rgba(251,191,36,0.08)',  border:'rgba(251,191,36,0.2)',  icon:'⚠', label:'Warning'  },
  critical: { color:'#fb7185', bg:'rgba(251,113,133,0.08)', border:'rgba(251,113,133,0.2)', icon:'!', label:'Critical' },
  info:     { color:'#22d3ee', bg:'rgba(34,211,238,0.08)',  border:'rgba(34,211,238,0.2)',  icon:'i', label:'Info'     },
};

function InsightCard({ insight, delay }) {
  const cfg = LEVEL_CONFIG[insight.level] || LEVEL_CONFIG.info;
  return (
    <div className={`insight-${insight.level} rounded-xl p-4 fade-up`}
      style={{ animationDelay: delay, borderLeft: `3px solid ${cfg.color}`, background: cfg.bg }}>
      <div className="flex items-start gap-3">
        <div style={{ width:24, height:24, borderRadius:6, background:`rgba(${cfg.color === '#34d399' ? '52,211,153' : cfg.color === '#fbbf24' ? '251,191,36' : cfg.color === '#fb7185' ? '251,113,133' : '34,211,238'},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0, marginTop:1 }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background:`rgba(${cfg.color === '#34d399' ? '52,211,153' : cfg.color === '#fbbf24' ? '251,191,36' : cfg.color === '#fb7185' ? '251,113,133' : '34,211,238'},0.12)`, color:cfg.color }}>
              {insight.category}
            </span>
          </div>
          <p className="text-white font-semibold text-sm mb-1">{insight.title}</p>
          <p className="text-slate-400 text-sm leading-relaxed">{insight.message}</p>
          {insight.action && (
            <p className="mt-2 text-sm" style={{ color:cfg.color }}>
              → {insight.action}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightsPanel({ insights = [] }) {
  const [filter, setFilter] = useState('all');

  if (!insights.length) return null;

  const counts = insights.reduce((acc, i) => { acc[i.level] = (acc[i.level]||0)+1; return acc; }, {});
  const filtered = filter === 'all' ? insights : insights.filter(i => i.level === filter);

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-bold" style={{ fontFamily:'DM Serif Display', fontSize:'1.2rem' }}>
            💡 Financial Insights
          </h2>
          <p className="text-slate-500 text-xs font-mono mt-0.5">{insights.length} insights generated</p>
        </div>
        <div className="flex gap-2">
          {['all','critical','warning','positive','info'].map(f => {
            const cnt = f === 'all' ? insights.length : counts[f] || 0;
            if (f !== 'all' && !cnt) return null;
            const cfg = f === 'all' ? { color:'#94a3b8' } : LEVEL_CONFIG[f];
            return (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: filter === f ? `rgba(${f==='all'?'148,163,184':f==='positive'?'52,211,153':f==='warning'?'251,191,36':f==='critical'?'251,113,133':'34,211,238'},0.15)` : 'rgba(15,23,42,0.5)',
                  border: `1px solid ${filter === f ? cfg.color : '#334155'}`,
                  color: filter === f ? cfg.color : '#64748b',
                }}>
                {f === 'all' ? `All (${cnt})` : `${f} (${cnt})`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((ins, i) => (
          <InsightCard key={i} insight={ins} delay={`${i * 0.05}s`} />
        ))}
      </div>
    </div>
  );
}
