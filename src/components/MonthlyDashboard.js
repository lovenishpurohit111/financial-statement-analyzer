import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts';

const fmtK = (n) => {
  if (n == null) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmt = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n??0);

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:'10px 14px'}}>
      <p style={{color:'#64748b',fontSize:11,fontFamily:'JetBrains Mono',marginBottom:6}}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{display:'flex',justifyContent:'space-between',gap:16,marginBottom:2}}>
          <span style={{color:p.color,fontSize:12}}>{p.name}</span>
          <span style={{color:p.color,fontSize:13,fontFamily:'JetBrains Mono',fontWeight:700}}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function AnomalyCard({ anomaly }) {
  const colors = { high: '#fb7185', medium: '#fbbf24' };
  const icons  = { spike: '↑', drop: '↓' };
  const color  = colors[anomaly.severity] || '#fbbf24';

  return (
    <div style={{
      background: `rgba(${anomaly.severity==='high'?'251,113,133':'251,191,36'},0.07)`,
      border: `1px solid rgba(${anomaly.severity==='high'?'251,113,133':'251,191,36'},0.25)`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10, padding: '12px 16px',
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span style={{fontSize:16}}>{anomaly.direction==='spike'?'📈':'📉'}</span>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{background:`rgba(${anomaly.severity==='high'?'251,113,133':'251,191,36'},0.15)`,color}}>
              {anomaly.severity.toUpperCase()} · {anomaly.metric}
            </span>
            <span className="text-slate-500 text-xs font-mono">{anomaly.month}</span>
          </div>
          <p className="text-white text-sm font-medium mb-1">{anomaly.message}</p>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span style={{color}}>
              {icons[anomaly.direction]} {anomaly.pct_from_avg}% {anomaly.direction==='spike'?'above':'below'} avg
            </span>
            <span className="text-slate-500">Z-score: {anomaly.z_score}</span>
            <span className="text-slate-500">Avg: {fmt(anomaly.average)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-slate-500 text-xs font-mono">Value</p>
          <p className="font-mono font-bold text-lg" style={{color}}>{fmt(anomaly.value)}</p>
        </div>
      </div>
    </div>
  );
}

function PredictionCard({ prediction }) {
  if (!prediction || prediction.predicted == null) return null;

  const isPos = prediction.predicted >= 0;
  const range = prediction.confidence_high - prediction.confidence_low;

  return (
    <div className="glass p-5" style={{border:'1px solid rgba(52,211,153,0.2)'}}>
      <div className="flex items-center gap-3 mb-4">
        <div style={{width:40,height:40,borderRadius:10,background:'rgba(52,211,153,0.12)',border:'1px solid rgba(52,211,153,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🔮</div>
        <div>
          <h3 className="text-white font-bold" style={{fontFamily:'DM Serif Display',fontSize:'1.1rem'}}>
            Profit Prediction — {prediction.next_period_label}
          </h3>
          <p className="text-slate-500 text-xs font-mono">Based on {prediction.months_used} months of data · Blended model</p>
        </div>
      </div>

      {/* Main prediction */}
      <div className="flex items-center gap-6 mb-5 p-4 rounded-xl" style={{background:'rgba(52,211,153,0.06)'}}>
        <div>
          <p className="text-slate-400 text-xs font-mono mb-1">Predicted Profit</p>
          <p className="text-3xl font-bold" style={{fontFamily:'JetBrains Mono',color: isPos ? '#34d399' : '#fb7185'}}>
            {fmt(prediction.predicted)}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-slate-400 text-xs font-mono mb-2">95% Confidence Interval</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-slate-300">{fmt(prediction.confidence_low)}</span>
            <div style={{flex:1,height:6,background:'#1e293b',borderRadius:3,overflow:'hidden'}}>
              <div style={{width:'100%',height:'100%',background:'linear-gradient(90deg,rgba(52,211,153,0.3),rgba(52,211,153,0.8),rgba(52,211,153,0.3))',borderRadius:3}} />
            </div>
            <span className="font-mono text-sm text-slate-300">{fmt(prediction.confidence_high)}</span>
          </div>
          <p className="text-slate-600 text-xs mt-1 font-mono">±{fmt(range/2)} confidence range</p>
        </div>
      </div>

      {/* Model breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {label:'Linear Regression',  value: prediction.linear_prediction, color:'#34d399', pct:'50%'},
          {label:'3-Month Moving Avg', value: prediction.ma3_prediction,    color:'#22d3ee', pct:'30%'},
          {label:'6-Month Moving Avg', value: prediction.ma6_prediction,    color:'#a78bfa', pct:'20%'},
        ].map((m,i) => (
          <div key={i} className="glass-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div style={{width:6,height:6,borderRadius:'50%',background:m.color}} />
              <span className="text-slate-500 text-xs">{m.pct} weight</span>
            </div>
            <p className="text-slate-400 text-xs mb-1">{m.label}</p>
            <p className="font-mono font-bold text-sm" style={{color:m.color}}>{fmt(m.value)}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div className="flex items-center gap-3 p-3 rounded-lg" style={{background:'rgba(30,41,59,0.4)'}}>
        <span style={{fontSize:18}}>{prediction.trend_slope >= 0 ? '📈' : '📉'}</span>
        <div>
          <p className="text-slate-300 text-sm font-medium">Trend Analysis</p>
          <p className="text-slate-500 text-xs">{prediction.trend_description}</p>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-3 leading-relaxed">
        ⚠️ Prediction based on historical data only. External factors (seasonality, market conditions, new clients) may impact actual results.
      </p>
    </div>
  );
}

export default function MonthlyDashboard({ data }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'anomalies' | 'prediction'

  if (!data) return null;

  const { months, revenue, expenses, profit, summary, anomalies, prediction, period } = data;

  // Build chart data — only non-zero months
  const chartData = months.map((m, i) => ({
    month: m.replace(' 2025','').replace(' 2024',''),
    revenue: revenue[i] || 0,
    expenses: expenses[i] || 0,
    profit: profit[i] || 0,
  })).filter(d => d.revenue > 0 || d.expenses > 0);

  // Add prediction point
  const chartWithPred = prediction?.predicted != null ? [
    ...chartData,
    {
      month: prediction.next_period_label?.split(' ')[0] || 'Next',
      revenue: null, expenses: null,
      profit: null,
      predicted: prediction.predicted,
      ci_low: prediction.confidence_low,
      ci_high: prediction.confidence_high,
      isPrediction: true,
    },
  ] : chartData;

  const anomalyCount = anomalies?.length || 0;
  const criticalCount = anomalies?.filter(a => a.severity === 'high').length || 0;

  const TABS = [
    { id:'overview',   label:'📊 Overview',     badge: null },
    { id:'anomalies',  label:'⚠️ Anomalies',    badge: anomalyCount || null },
    { id:'prediction', label:'🔮 Prediction',   badge: null },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white font-bold" style={{fontFamily:'DM Serif Display',fontSize:'1.3rem'}}>
              Monthly P&L Analysis
            </h2>
            <p className="text-slate-500 text-xs font-mono mt-0.5">{period} · {data.active_months} months with data</p>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{background:'rgba(251,113,133,0.1)',border:'1px solid rgba(251,113,133,0.3)'}}>
              <span style={{fontSize:14}}>🚨</span>
              <span className="text-rose-400 text-xs font-semibold">{criticalCount} Critical Anomal{criticalCount===1?'y':'ies'}</span>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {label:'Total Revenue',  value:fmt(summary.total_revenue),  color:'#34d399', icon:'💰'},
            {label:'Total Expenses', value:fmt(summary.total_expenses), color:'#fb7185', icon:'💸'},
            {label:'Total Profit',   value:fmt(summary.total_profit),   color: summary.total_profit>=0?'#22d3ee':'#fb7185', icon:'📈'},
            {label:'Profit Margin',  value:`${summary.profit_margin?.toFixed(1)}%`, color: summary.profit_margin>=15?'#34d399':summary.profit_margin>=5?'#fbbf24':'#fb7185', icon:'🎯'},
          ].map((c,i) => (
            <div key={i} className="glass-sm p-3 text-center">
              <div style={{fontSize:20,marginBottom:4}}>{c.icon}</div>
              <p className="text-slate-500 text-xs font-mono mb-1">{c.label}</p>
              <p className="font-bold" style={{fontFamily:'JetBrains Mono',color:c.color,fontSize:'0.95rem'}}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab===t.id ? 'rgba(52,211,153,0.12)' : 'rgba(15,23,42,0.5)',
              border: `1px solid ${tab===t.id ? 'rgba(52,211,153,0.3)' : '#334155'}`,
              color: tab===t.id ? '#34d399' : '#64748b',
            }}>
            {t.label}
            {t.badge && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{background:'rgba(251,113,133,0.2)',color:'#fb7185'}}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Line chart */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-1" style={{fontFamily:'DM Serif Display'}}>Monthly Trend</h3>
            <p className="text-slate-500 text-xs font-mono mb-4">Revenue · Expenses · Profit over time</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartWithPred} margin={{top:4,right:8,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtK} tick={{fill:'#64748b',fontSize:9,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT />}/>
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4"/>
                <Legend wrapperStyle={{paddingTop:12,fontSize:12}} formatter={v => <span style={{color:'#94a3b8'}}>{v}</span>}/>
                <Line type="monotone" dataKey="revenue"   name="Revenue"   stroke="#34d399" strokeWidth={2.5} dot={{r:4,fill:'#34d399',strokeWidth:0}} activeDot={{r:6}}/>
                <Line type="monotone" dataKey="expenses"  name="Expenses"  stroke="#fb7185" strokeWidth={2.5} dot={{r:4,fill:'#fb7185',strokeWidth:0}} activeDot={{r:6}}/>
                <Line type="monotone" dataKey="profit"    name="Profit"    stroke="#22d3ee" strokeWidth={2.5} strokeDasharray="6 3" dot={{r:4,fill:'#22d3ee',strokeWidth:0}} activeDot={{r:6}}/>
                {prediction?.predicted != null && (
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" dot={{r:6,fill:'#fbbf24',strokeWidth:2,stroke:'#0f172a'}} activeDot={{r:8}}/>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-1" style={{fontFamily:'DM Serif Display'}}>Monthly Profit</h3>
            <p className="text-slate-500 text-xs font-mono mb-4">Green = profit · Red = loss</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{top:4,right:4,left:-10,bottom:0}} barSize={28}>
                <defs>
                  <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#22d3ee"/></linearGradient>
                  <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185"/><stop offset="100%" stopColor="#f43f5e"/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtK} tick={{fill:'#64748b',fontSize:9,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT />} cursor={{fill:'rgba(51,65,85,0.2)'}}/>
                <ReferenceLine y={0} stroke="#334155"/>
                <Bar dataKey="profit" name="Profit" radius={[6,6,0,0]}>
                  {chartData.map((d,i) => <Cell key={i} fill={d.profit>=0?'url(#gPos)':'url(#gNeg)'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Best / Worst */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-sm p-4">
              <p className="text-slate-500 text-xs font-mono mb-2">🏆 Best Month</p>
              <p className="text-xl font-bold text-emerald-400" style={{fontFamily:'DM Serif Display'}}>{summary.best_month}</p>
              <p className="text-slate-400 text-xs mt-1">Avg monthly profit: {fmt(summary.avg_monthly_profit)}</p>
            </div>
            <div className="glass-sm p-4">
              <p className="text-slate-500 text-xs font-mono mb-2">📉 Lowest Month</p>
              <p className="text-xl font-bold text-rose-400" style={{fontFamily:'DM Serif Display'}}>{summary.worst_month}</p>
              <p className="text-slate-400 text-xs mt-1">Avg monthly revenue: {fmt(summary.avg_monthly_revenue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Anomalies */}
      {tab === 'anomalies' && (
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold" style={{fontFamily:'DM Serif Display',fontSize:'1.1rem'}}>⚠️ Anomaly Detection</h3>
              <p className="text-slate-500 text-xs font-mono mt-0.5">Z-score analysis · Threshold: 1.8σ from mean</p>
            </div>
            <div className="flex gap-2 text-xs font-mono">
              <span className="px-2 py-1 rounded" style={{background:'rgba(251,113,133,0.1)',color:'#fb7185',border:'1px solid rgba(251,113,133,0.2)'}}>
                {anomalies.filter(a=>a.severity==='high').length} High
              </span>
              <span className="px-2 py-1 rounded" style={{background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.2)'}}>
                {anomalies.filter(a=>a.severity==='medium').length} Medium
              </span>
            </div>
          </div>

          {anomalies.length === 0 ? (
            <div className="text-center py-10">
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <p className="text-emerald-400 font-semibold">No anomalies detected</p>
              <p className="text-slate-500 text-sm mt-2">All revenue, expense, and profit values are within normal statistical ranges.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a,i) => <AnomalyCard key={i} anomaly={a}/>)}
            </div>
          )}

          <div className="mt-5 p-3 rounded-lg" style={{background:'rgba(34,211,238,0.05)',border:'1px solid rgba(34,211,238,0.15)'}}>
            <p className="text-cyan-400/70 text-xs">
              <strong>How it works:</strong> Z-score measures how many standard deviations a value is from the historical average.
              Z &gt; 2.5 = High severity, Z &gt; 1.8 = Medium. Both spikes (unusually high) and drops (unusually low) are flagged.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Prediction */}
      {tab === 'prediction' && <PredictionCard prediction={prediction}/>}
    </div>
  );
}
