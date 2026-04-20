import React from 'react';

const fmt  = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,notation:'compact'}).format(n??0);
const fmtF = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n??0);
const pct  = (n) => `${((n??0)).toFixed(1)}%`;

const COLORS = {
  pos:  { bg:'#EAF6EE', border:'#1B6535', text:'#1B6535', label:'#2D9150' },
  neg:  { bg:'#FCEEF1', border:'#C41E3A', text:'#C41E3A', label:'#E8536A' },
  blue: { bg:'#EFF6FF', border:'#1E40AF', text:'#1E40AF', label:'#2563EB' },
  ink:  { bg:'#F7F4EE', border:'#3D3525', text:'#1A1009', label:'#3D3525' },
  amber:{ bg:'#FEF3C7', border:'#B45309', text:'#B45309', label:'#D97706' },
};

function Card({ label, value, sub, scheme, fmtFull, delay }) {
  const c = COLORS[scheme] || COLORS.ink;
  return (
    <div className="fade-up" style={{ animationDelay: delay, background:'#FFFFFF', border:`1px solid #E2DDD4`, borderTop:`3px solid ${c.border}`, padding:'16px 18px', borderRadius:'0 0 4px 4px' }}>
      <p style={{ margin:'0 0 8px', fontSize:10, fontFamily:'IBM Plex Mono', letterSpacing:'0.1em', textTransform:'uppercase', color:'#8A7F70' }}>{label}</p>
      <p className="num" style={{ margin:0, fontSize:20, fontWeight:600, color:c.text, lineHeight:1.1 }}>{value}</p>
      {fmtFull && <p style={{ margin:'3px 0 0', fontSize:10, fontFamily:'IBM Plex Mono', color:'#C4BAA8' }}>{fmtFull}</p>}
      {sub && <p style={{ margin:'6px 0 0', fontSize:11, color:c.label, fontFamily:'IBM Plex Sans', fontWeight:500 }}>{sub}</p>}
    </div>
  );
}

export default function SummaryCards({ results }) {
  const pl   = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs   = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);
  const full = results?.returns;
  const cards = [];

  if (pl?.summary) {
    const s = pl.summary, r = pl.ratios;
    const totalExp = (s.total_cogs??0)+(s.total_op_expenses??0);
    cards.push({ label:'Total Revenue',     value:fmt(s.total_revenue),    fmtFull:fmtF(s.total_revenue),  scheme:'pos',  delay:'0.05s' });
    cards.push({ label:'Net Profit',        value:fmt(s.net_profit),       fmtFull:fmtF(s.net_profit),     scheme:(s.net_profit??0)>=0?'pos':'neg', sub:(s.net_profit??0)>=0?'▲ Profitable':'▼ Loss', delay:'0.1s' });
    cards.push({ label:'Gross Margin',      value:pct(r?.gross_margin),    scheme:'blue', delay:'0.15s' });
    cards.push({ label:'Net Profit Margin', value:pct(r?.net_profit_margin),scheme:(r?.net_profit_margin??0)>=10?'pos':(r?.net_profit_margin??0)>=0?'amber':'neg', delay:'0.18s' });
    cards.push({ label:'Total Expenses',    value:fmt(totalExp),           fmtFull:fmtF(totalExp), scheme:'neg', delay:'0.2s' });
    cards.push({ label:'Expense Ratio',     value:pct(r?.expense_ratio),   scheme:(r?.expense_ratio??100)<75?'pos':(r?.expense_ratio??100)<90?'amber':'neg', delay:'0.23s' });
  }

  if (bs?.summary) {
    const s = bs.summary, r = bs.ratios;
    cards.push({ label:'Total Assets',      value:fmt(s.total_assets),      fmtFull:fmtF(s.total_assets),      scheme:'blue', delay:'0.05s' });
    cards.push({ label:'Total Liabilities', value:fmt(s.total_liabilities),  fmtFull:fmtF(s.total_liabilities), scheme:'neg',  delay:'0.1s'  });
    cards.push({ label:'Equity',            value:fmt(s.equity),             fmtFull:fmtF(s.equity),            scheme:(s.equity??0)>=0?'pos':'neg', delay:'0.15s' });
    cards.push({ label:'Working Capital',   value:fmt(s.working_capital),    fmtFull:fmtF(s.working_capital),   scheme:(s.working_capital??0)>=0?'pos':'neg', delay:'0.18s' });
    if (r?.current_ratio!=null) cards.push({ label:'Current Ratio', value:r.current_ratio.toFixed(2)+'x', scheme:r.current_ratio>=1.5?'pos':r.current_ratio>=1?'amber':'neg', sub:r.current_ratio>=1.5?'Liquid':r.current_ratio>=1?'Tight':'At Risk', delay:'0.2s' });
    if (r?.debt_to_equity!=null) cards.push({ label:'Debt-to-Equity', value:r.debt_to_equity.toFixed(2)+'x', scheme:r.debt_to_equity<=1?'pos':r.debt_to_equity<=2?'amber':'neg', delay:'0.23s' });
  }

  if (full) {
    if (full.roa!=null) cards.push({ label:'Return on Assets', value:pct(full.roa), scheme:full.roa>=10?'pos':full.roa>=5?'amber':'neg', delay:'0.26s' });
    if (full.roe!=null) cards.push({ label:'Return on Equity', value:pct(full.roe), scheme:full.roe>=15?'pos':full.roe>=8?'amber':'neg', delay:'0.29s' });
  }

  if (results?.health_score!=null) {
    const hs = results.health_score;
    cards.push({ label:'Financial Health Score', value:`${hs}/100`, scheme:hs>=80?'pos':hs>=60?'blue':hs>=40?'amber':'neg', sub:hs>=80?'Excellent':hs>=60?'Good':hs>=40?'Fair':'Poor', delay:'0.32s' });
  }

  if (!cards.length) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
      {cards.map((c,i) => <Card key={i} {...c} />)}
    </div>
  );
}
