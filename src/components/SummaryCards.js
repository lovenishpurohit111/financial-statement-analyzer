import React from 'react';

const fmt  = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,notation:'compact'}).format(n ?? 0);
const fmtF = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n ?? 0);
const pct  = (n) => `${((n ?? 0)).toFixed(1)}%`;

function Card({ label, value, sub, color, icon, delay, fmtFull }) {
  return (
    <div className="glass p-5" style={{ animationDelay: delay, animation: 'fadeUp 0.4s ease both' }}>
      <div className="flex items-start justify-between mb-3">
        <div style={{ width:36, height:36, borderRadius:10, background:`rgba(${color},0.12)`, border:`1px solid rgba(${color},0.25)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
          {icon}
        </div>
        {sub && (
          <span className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background:`rgba(${color},0.1)`, color:`rgb(${color})`, border:`1px solid rgba(${color},0.2)` }}>
            {sub}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ fontFamily:'JetBrains Mono', color:`rgb(${color})` }}>
        {value}
      </p>
      {fmtFull && <p className="text-slate-600 text-xs font-mono mt-0.5">{fmtFull}</p>}
    </div>
  );
}

export default function SummaryCards({ results }) {
  // BUG FIX: always type-check before assigning pl vs bs
  // results.analysis exists for quick single-file analysis and its .type determines which it is
  const pl = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);
  const full = results?.returns;

  const cards = [];

  if (pl?.summary) {
    const s = pl.summary, r = pl.ratios;
    const totalExp = (s.total_cogs ?? 0) + (s.total_op_expenses ?? 0);
    cards.push({ label:'Total Revenue',     value: fmt(s.total_revenue),    fmtFull: fmtF(s.total_revenue),  color:'52,211,153',  icon:'💰', sub:'Income',  delay:'0.1s' });
    cards.push({ label:'Net Profit',        value: fmt(s.net_profit),       fmtFull: fmtF(s.net_profit),     color: (s.net_profit ?? 0) >= 0 ? '52,211,153' : '251,113,133', icon: (s.net_profit ?? 0) >= 0 ? '📈' : '📉', sub: (s.net_profit ?? 0) >= 0 ? '▲ Profit' : '▼ Loss', delay:'0.2s' });
    cards.push({ label:'Gross Margin',      value: pct(r?.gross_margin),    color:'34,211,238',  icon:'📊', sub:'Gross', delay:'0.3s' });
    cards.push({ label:'Net Profit Margin', value: pct(r?.net_profit_margin), color: (r?.net_profit_margin ?? 0) >= 10 ? '52,211,153' : (r?.net_profit_margin ?? 0) >= 0 ? '251,191,36' : '251,113,133', icon:'🎯', delay:'0.35s' });
    cards.push({ label:'Total Expenses',    value: fmt(totalExp),           fmtFull: fmtF(totalExp),         color:'251,113,133', icon:'💸', sub:'Costs', delay:'0.4s' });
    cards.push({ label:'Expense Ratio',     value: pct(r?.expense_ratio),   color: (r?.expense_ratio ?? 100) < 75 ? '52,211,153' : (r?.expense_ratio ?? 100) < 90 ? '251,191,36' : '251,113,133', icon:'📉', delay:'0.45s' });
  }

  if (bs?.summary) {
    const s = bs.summary, r = bs.ratios;
    cards.push({ label:'Total Assets',      value: fmt(s.total_assets),       fmtFull: fmtF(s.total_assets),     color:'34,211,238',  icon:'🏦', delay:'0.1s' });
    cards.push({ label:'Total Liabilities', value: fmt(s.total_liabilities),  fmtFull: fmtF(s.total_liabilities),color:'251,113,133', icon:'📋', delay:'0.15s' });
    cards.push({ label:'Equity',            value: fmt(s.equity),             fmtFull: fmtF(s.equity),           color: (s.equity ?? 0) >= 0 ? '52,211,153' : '251,113,133', icon:'💎', delay:'0.2s' });
    cards.push({ label:'Working Capital',   value: fmt(s.working_capital),    fmtFull: fmtF(s.working_capital),  color: (s.working_capital ?? 0) >= 0 ? '52,211,153' : '251,113,133', icon:'🔄', delay:'0.25s' });
    if (r?.current_ratio != null)  cards.push({ label:'Current Ratio',  value: r.current_ratio.toFixed(2),  color: r.current_ratio >= 1.5 ? '52,211,153' : r.current_ratio >= 1 ? '251,191,36' : '251,113,133', icon:'💧', sub: r.current_ratio >= 1.5 ? 'Liquid' : r.current_ratio >= 1 ? 'Tight' : 'At Risk', delay:'0.3s' });
    if (r?.debt_to_equity != null) cards.push({ label:'Debt-to-Equity', value: r.debt_to_equity.toFixed(2) + 'x', color: r.debt_to_equity <= 1 ? '52,211,153' : r.debt_to_equity <= 2 ? '251,191,36' : '251,113,133', icon:'⚖️', delay:'0.35s' });
  }

  if (full) {
    if (full.roa != null) cards.push({ label:'Return on Assets',  value: pct(full.roa), color: full.roa >= 10 ? '52,211,153' : full.roa >= 5 ? '251,191,36' : '251,113,133', icon:'🏭', delay:'0.5s' });
    if (full.roe != null) cards.push({ label:'Return on Equity',  value: pct(full.roe), color: full.roe >= 15 ? '52,211,153' : full.roe >= 8 ? '251,191,36' : '251,113,133', icon:'👑', delay:'0.55s' });
  }

  if (results?.health_score != null) {
    const hs = results.health_score;
    cards.push({ label:'Health Score', value:`${hs}/100`, color: hs >= 80 ? '52,211,153' : hs >= 60 ? '34,211,238' : hs >= 40 ? '251,191,36' : '251,113,133', icon:'❤️', sub: hs >= 80 ? 'Excellent' : hs >= 60 ? 'Good' : hs >= 40 ? 'Fair' : 'Poor', delay:'0.6s' });
  }

  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => <Card key={i} {...c} />)}
    </div>
  );
}
