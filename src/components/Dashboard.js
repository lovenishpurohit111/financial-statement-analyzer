import React, { useState } from 'react';
import SummaryCards from './SummaryCards';
import ChartsPanel from './ChartsPanel';
import InsightsPanel from './InsightsPanel';
import TaxPanel from './TaxPanel';
import BreakdownTable from './BreakdownTable';

const TABS = [
  { id:'overview',   label:'Overview',   icon:'📊' },
  { id:'insights',   label:'Insights',   icon:'💡' },
  { id:'breakdown',  label:'Breakdown',  icon:'📋' },
  { id:'tax',        label:'Tax',        icon:'🧾' },
];

const fmt = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,notation:'compact'}).format(n??0);

function HealthMeter({ score }) {
  if (score == null) return null;
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#22d3ee' : score >= 40 ? '#fbbf24' : '#fb7185';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const circumference = 2 * Math.PI * 38;
  const dash = (score / 100) * circumference;

  return (
    <div className="glass p-5 flex items-center gap-5">
      <div style={{ position:'relative', width:90, height:90, flexShrink:0 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="38" fill="none" stroke="#1e293b" strokeWidth="7" />
          <circle cx="45" cy="45" r="38" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={circumference * 0.25}
            strokeLinecap="round" style={{ transition:'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'JetBrains Mono', fontSize:20, fontWeight:700, color }}>{score}</span>
          <span style={{ fontSize:9, color:'#64748b', fontFamily:'JetBrains Mono' }}>/100</span>
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-1">Financial Health</p>
        <p className="text-2xl font-bold" style={{ fontFamily:'DM Serif Display', color }}>{label}</p>
        <p className="text-slate-500 text-xs mt-1">Profitability · Liquidity · Leverage · Efficiency</p>
      </div>
    </div>
  );
}

function BSComparison({ comparison, bsPrev }) {
  if (!comparison || !bsPrev) return null;
  const items = [
    { label:'Total Assets', key:'total_assets_change', icon:'🏦' },
    { label:'Total Liabilities', key:'total_liabilities_change', icon:'📋' },
    { label:'Equity', key:'equity_change', icon:'💎' },
    { label:'Working Capital', key:'working_capital_change', icon:'🔄' },
  ];

  return (
    <div className="glass p-5">
      <h3 className="text-white font-semibold mb-4" style={{ fontFamily:'DM Serif Display', fontSize:'1.1rem' }}>
        📅 Period-over-Period Changes
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(item => {
          const val = comparison[item.key];
          if (val == null) return null;
          const color = val >= 0 ? '#34d399' : '#fb7185';
          return (
            <div key={item.key} className="glass-sm p-3 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-slate-500 text-xs mb-1">{item.label}</p>
              <p className="font-mono font-bold text-base" style={{ color }}>{val >= 0 ? '+' : ''}{val.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RatioTable({ pl, bs }) {
  const rows = [];
  if (pl?.ratios) {
    const r = pl.ratios;
    rows.push({ label:'Gross Margin',        value:`${r.gross_margin?.toFixed(1)}%`,      benchmark:'> 30%',  ok: r.gross_margin >= 30 });
    rows.push({ label:'Operating Margin',     value:`${r.operating_margin?.toFixed(1)}%`,  benchmark:'> 10%',  ok: r.operating_margin >= 10 });
    rows.push({ label:'Net Profit Margin',    value:`${r.net_profit_margin?.toFixed(1)}%`, benchmark:'> 10%',  ok: r.net_profit_margin >= 10 });
    rows.push({ label:'Expense Ratio',        value:`${r.expense_ratio?.toFixed(1)}%`,     benchmark:'< 80%',  ok: r.expense_ratio < 80 });
    rows.push({ label:'COGS Ratio',           value:`${r.cogs_ratio?.toFixed(1)}%`,        benchmark:'< 40%',  ok: r.cogs_ratio < 40 });
  }
  if (bs?.ratios) {
    const r = bs.ratios;
    if (r.current_ratio != null) rows.push({ label:'Current Ratio',   value:`${r.current_ratio?.toFixed(2)}x`,   benchmark:'> 1.5',  ok: r.current_ratio >= 1.5 });
    if (r.debt_to_equity != null) rows.push({ label:'Debt-to-Equity', value:`${r.debt_to_equity?.toFixed(2)}x`,  benchmark:'< 1.5',  ok: r.debt_to_equity <= 1.5 });
    if (r.debt_to_assets != null) rows.push({ label:'Debt-to-Assets', value:`${r.debt_to_assets?.toFixed(2)}x`,  benchmark:'< 0.5',  ok: r.debt_to_assets <= 0.5 });
    if (r.equity_ratio != null) rows.push({ label:'Equity Ratio',     value:`${r.equity_ratio?.toFixed(1)}%`,    benchmark:'> 50%',  ok: r.equity_ratio >= 50 });
  }
  if (!rows.length) return null;

  return (
    <div className="glass p-5">
      <h3 className="text-white font-semibold mb-4" style={{ fontFamily:'DM Serif Display', fontSize:'1.1rem' }}>
        📐 Financial Ratios
      </h3>
      <table className="w-full data-table">
        <thead><tr><th className="text-left">Ratio</th><th className="text-right">Value</th><th className="text-right">Benchmark</th><th className="text-center">Status</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="text-slate-300 text-sm">{r.label}</td>
              <td className="text-right font-mono text-sm font-semibold" style={{ color: r.ok ? '#34d399' : '#fb7185' }}>{r.value}</td>
              <td className="text-right text-slate-500 text-xs font-mono">{r.benchmark}</td>
              <td className="text-center text-sm">{r.ok ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard({ results, onReset }) {
  const [activeTab, setActiveTab] = useState('overview');

  const mode = results?.mode;
  const pl   = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs   = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);
  const insights = results?.insights || [];
  const tax      = results?.tax;
  const health   = results?.health_score;
  const cf       = results?.cash_flow;
  const comparison = results?.balance_sheet_comparison;
  const bsPrev   = results?.bs_previous;

  // Nav info
  const detectedLabel = mode === 'full' ? 'Full Analysis' : pl ? 'Profit & Loss' : 'Balance Sheet';
  const period = pl?.period || bs?.period || 'N/A';

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between mb-6 fade-up">
        <div className="flex items-center gap-3">
          <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#34d399,#22d3ee)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20v-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold" style={{ fontFamily:'DM Serif Display', fontSize:'1.1rem' }}>FinAnalyzer</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded-full text-emerald-400" style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)' }}>
                {detectedLabel}
              </span>
              <span className="text-slate-500 text-xs font-mono">· {period}</span>
            </div>
          </div>
        </div>
        <button onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
          style={{ background:'rgba(30,41,59,0.6)', border:'1px solid #334155' }}>
          ← New Analysis
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 fade-up-1">
        {TABS.map(tab => {
          // BUG FIX: show tax tab whenever a tax object exists (even locked state)
          if (tab.id === 'tax' && !tax) return null;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(52,211,153,0.12)' : 'rgba(15,23,42,0.5)',
                border: activeTab === tab.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid #334155',
                color: activeTab === tab.id ? '#34d399' : '#64748b',
              }}>
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary Cards — always visible */}
      <div className="mb-6 fade-up-1">
        <SummaryCards results={results} />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {health != null && <HealthMeter score={health} />}
          <ChartsPanel results={results} />
          {comparison && <BSComparison comparison={comparison} bsPrev={bsPrev} />}
          <RatioTable pl={pl} bs={bs} />
        </div>
      )}

      {activeTab === 'insights' && (
        insights.length > 0
          ? <InsightsPanel insights={insights} />
          : (
            <div className="glass p-10 text-center">
              <div style={{fontSize:48,marginBottom:12}}>💡</div>
              <p className="text-slate-400 font-semibold">No insights generated yet</p>
              <p className="text-slate-600 text-sm mt-2">Try running a Full Analysis (P&L + Balance Sheet) for comprehensive insights.</p>
            </div>
          )
      )}

      {activeTab === 'breakdown' && (
        <BreakdownTable results={results} />
      )}

      {activeTab === 'tax' && tax && (
        <div className="space-y-4">
          <TaxPanel tax={tax} />
        </div>
      )}
    </div>
  );
}
