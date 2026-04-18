import React, { useState } from 'react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:2 }).format(n ?? 0);

export default function TaxPanel({ tax }) {
  const [showBrackets, setShowBrackets] = useState(false);
  if (!tax) return null;

  // No entity type provided
  if (tax.tax === null && tax.prompt) {
    return (
      <div className="glass p-5" style={{ border:'1px solid rgba(251,191,36,0.2)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize:20 }}>🔒</span>
          <h3 className="text-white font-semibold" style={{ fontFamily:'DM Serif Display' }}>Tax Insights Locked</h3>
        </div>
        <p className="text-amber-400/80 text-sm">{tax.prompt}</p>
        <p className="text-slate-500 text-xs mt-2">{tax.disclaimer}</p>
      </div>
    );
  }

  // Tax = 0 (no taxable income)
  if (tax.tax === 0) {
    return (
      <div className="glass p-5">
        <h3 className="text-white font-semibold mb-2" style={{ fontFamily:'DM Serif Display' }}>🧾 Tax Estimate</h3>
        <p className="text-emerald-400 text-sm">{tax.message}</p>
        <p className="text-slate-500 text-xs mt-2">{tax.disclaimer}</p>
      </div>
    );
  }

  // Error / unsupported
  if (tax.tax === null) {
    return (
      <div className="glass p-5">
        <h3 className="text-white font-semibold mb-2" style={{ fontFamily:'DM Serif Display' }}>🧾 Tax Estimate</h3>
        <p className="text-slate-400 text-sm">{tax.message}</p>
        {tax.supported_countries && (
          <p className="text-slate-500 text-xs mt-2">Supported: {tax.supported_countries.join(', ')}</p>
        )}
        <p className="text-slate-600 text-xs mt-2">{tax.disclaimer}</p>
      </div>
    );
  }

  // Full tax result
  const netAfterTax = (tax.net_profit ?? 0) - (tax.tax ?? 0);
  const brackets = tax.bracket_breakdown || [];

  return (
    <div className="glass p-5" style={{ border:'1px solid rgba(251,191,36,0.15)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🧾</div>
          <div>
            <h3 className="text-white font-semibold" style={{ fontFamily:'DM Serif Display' }}>Tax Estimate</h3>
            <p className="text-slate-500 text-xs font-mono">{tax.country_description} · {tax.entity_type}</p>
          </div>
        </div>
      </div>

      {/* Main figures */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label:'Net Profit', value: fmt(tax.net_profit), color:'#34d399' },
          { label:'Est. Tax', value: fmt(tax.tax), color:'#fb7185' },
          { label:'After-Tax Profit', value: fmt(netAfterTax), color: netAfterTax >= 0 ? '#22d3ee' : '#fb7185' },
        ].map((item, i) => (
          <div key={i} className="glass-sm p-3 text-center">
            <p className="text-slate-500 text-xs font-mono mb-1">{item.label}</p>
            <p className="font-bold text-base" style={{ fontFamily:'JetBrains Mono', color:item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Effective rate */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'#1e293b' }}>
          <div style={{ width:`${Math.min(tax.effective_rate, 50) * 2}%`, height:'100%', background:'linear-gradient(90deg,#fbbf24,#f59e0b)', borderRadius:4, transition:'width 0.8s' }} />
        </div>
        <span className="font-mono text-sm font-bold text-amber-400">{tax.effective_rate?.toFixed(1)}% effective rate</span>
      </div>

      {/* Explanation */}
      <p className="text-slate-400 text-sm leading-relaxed mb-3">{tax.explanation}</p>

      {/* Bracket breakdown toggle */}
      {brackets.length > 0 && (
        <div>
          <button onClick={() => setShowBrackets(!showBrackets)}
            className="text-xs text-slate-500 hover:text-slate-300 underline mb-2">
            {showBrackets ? 'Hide' : 'Show'} bracket breakdown
          </button>
          {showBrackets && (
            <table className="w-full data-table mt-1">
              <thead>
                <tr><th>Bracket</th><th>Rate</th><th>Taxable</th><th>Tax</th></tr>
              </thead>
              <tbody>
                {brackets.map((b, i) => (
                  <tr key={i}>
                    <td className="text-slate-400 text-xs">{b.bracket}</td>
                    <td className="font-mono text-amber-400 text-xs">{b.rate}</td>
                    <td className="font-mono text-slate-300 text-xs">{fmt(b.taxable_amount)}</td>
                    <td className="font-mono text-rose-400 text-xs">{fmt(b.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="text-slate-600 text-xs mt-3 leading-relaxed">{tax.disclaimer}</p>
    </div>
  );
}
