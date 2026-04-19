import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#34d399','#22d3ee','#fbbf24','#fb7185','#a78bfa','#f97316','#38bdf8','#4ade80'];

const fmtK = (n) => {
  if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8, padding:'10px 14px', fontFamily:'DM Sans' }}>
      {label && <p style={{ color:'#64748b', fontSize:11, fontFamily:'JetBrains Mono', marginBottom:6 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:2 }}>
          <span style={{ color:p.color||'#94a3b8', fontSize:12 }}>{p.name}</span>
          <span style={{ color:p.color||'#e2e8f0', fontSize:13, fontFamily:'JetBrains Mono', fontWeight:700 }}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="glass p-5">
      <h3 className="text-white font-semibold mb-1" style={{ fontFamily:'DM Serif Display', fontSize:'1.05rem' }}>{title}</h3>
      {subtitle && <p className="text-slate-500 text-xs font-mono mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function RevenueVsExpenses({ pl }) {
  if (!pl?.summary) return null;
  const s = pl.summary;
  const data = [
    { name:'Revenue', value: s.total_revenue },
    { name:'COGS', value: s.total_cogs },
    { name:'Operating Exp', value: s.total_op_expenses },
    { name:'Other Exp', value: s.total_other_expenses },
    { name:'Net Profit', value: s.net_profit },
  ].filter(d => d.value !== 0);

  return (
    <ChartCard title="Revenue vs Expenses" subtitle="P&L breakdown">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top:4, right:4, left:-10, bottom:0 }} barSize={30}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="barNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10, fontFamily:'DM Sans' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fill:'#64748b', fontSize:9, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <Tooltip content={<TT />} cursor={{ fill:'rgba(51,65,85,0.2)' }} />
          <Bar dataKey="value" radius={[6,6,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.value >= 0 ? 'url(#barGrad)' : 'url(#barNeg)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ExpensePie({ pl }) {
  if (!pl?.breakdown) return null;
  const items = [
    ...pl.breakdown.cogs.map(i => ({ name: i.label, value: i.value })),
    ...pl.breakdown.operating_expenses.map(i => ({ name: i.label, value: i.value })),
  ].filter(d => d.value > 0).slice(0, 8);

  if (!items.length) return null;

  return (
    <ChartCard title="Expense Composition" subtitle="By line item">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={items} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
            paddingAngle={3} dataKey="value"
            label={({ percent }) => percent > 0.07 ? `${(percent*100).toFixed(0)}%` : ''}
            labelLine={false}>
            {items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />)}
          </Pie>
          <Tooltip content={<TT />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-1">
        {items.slice(0,6).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div style={{ width:6, height:6, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
            <span className="text-slate-400 truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function AssetsLiabilitiesBar({ bs }) {
  if (!bs?.summary) return null;
  const s = bs.summary;
  const data = [
    { name:'Current Assets', value: s.current_assets },
    { name:'Fixed Assets',   value: s.fixed_assets },
    { name:'Other Assets',   value: s.other_assets },
    { name:'Current Liab',   value: s.current_liabilities },
    { name:'LT Liab',        value: s.long_term_liabilities },
    { name:'Equity',         value: s.equity },
  ].filter(d => d.value > 0);

  return (
    <ChartCard title="Balance Sheet Structure" subtitle="Assets vs Liabilities vs Equity">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top:4, right:4, left:-10, bottom:0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:9, fontFamily:'DM Sans' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fill:'#64748b', fontSize:9, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <Tooltip content={<TT />} cursor={{ fill:'rgba(51,65,85,0.2)' }} />
          <Bar dataKey="value" radius={[6,6,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CashFlowBar({ cashFlow }) {
  if (!cashFlow) return null;
  const data = [
    { name:'Operating', value: cashFlow.operating },
    { name:'Investing',  value: cashFlow.investing },
    { name:'Net CF',     value: cashFlow.net_cash_flow },
  ].filter(d => d.value != null);

  return (
    <ChartCard title="Estimated Cash Flow" subtitle="Indirect method · approximated">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top:4, right:4, left:-10, bottom:0 }} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11, fontFamily:'DM Sans' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fill:'#64748b', fontSize:9, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <Tooltip content={<TT />} cursor={{ fill:'rgba(51,65,85,0.2)' }} />
          <Bar dataKey="value" radius={[6,6,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.value >= 0 ? '#34d399' : '#fb7185'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-slate-600 text-xs mt-2">{cashFlow.notes}</p>
    </ChartCard>
  );
}

function RatioRadar({ pl, bs }) {
  const data = [];
  if (pl?.ratios) {
    const r = pl.ratios;
    data.push({ metric:'Net Margin', value: Math.max(0, r.net_profit_margin), max:30 });
    data.push({ metric:'Gross Margin', value: Math.max(0, r.gross_margin), max:80 });
  }
  if (bs?.ratios) {
    const r = bs.ratios;
    if (r.current_ratio) data.push({ metric:'Current Ratio', value: Math.min(r.current_ratio*20, 100), max:100 });
  }
  if (!data.length) return null;

  return (
    <ChartCard title="Key Ratios" subtitle="Normalized 0–100 scale">
      <div className="space-y-3 mt-2">
        {data.map((d, i) => {
          const pct = Math.min((d.value / d.max) * 100, 100);
          return (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{d.metric}</span>
                <span className="font-mono text-slate-300">{d.value.toFixed(1)}{d.metric.includes('Ratio') ? 'x' : '%'}</span>
              </div>
              <div style={{ height:6, background:'#1e293b', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', borderRadius:3, background:`linear-gradient(90deg,${COLORS[i % COLORS.length]},${COLORS[(i+1) % COLORS.length]})`, transition:'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export default function ChartsPanel({ results }) {
  // BUG FIX: type-check before assigning to avoid P&L data being treated as BS
  const pl  = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs  = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);
  const cf  = results?.cash_flow;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {pl?.type === 'pl' && <RevenueVsExpenses pl={pl} />}
      {pl?.type === 'pl' && <ExpensePie pl={pl} />}
      {bs?.type === 'bs' && <AssetsLiabilitiesBar bs={bs} />}
      {cf && <CashFlowBar cashFlow={cf} />}
      <RatioRadar pl={pl?.type === 'pl' ? pl : null} bs={bs?.type === 'bs' ? bs : null} />
    </div>
  );
}
