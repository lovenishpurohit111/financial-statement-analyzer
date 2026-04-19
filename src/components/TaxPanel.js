import React, { useState } from 'react';

const fmt  = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n??0);
const fmtC = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n??0);

export default function TaxPanel({ tax }) {
  const [showBrackets,    setShowBrackets]    = useState(false);
  const [showDeductions,  setShowDeductions]  = useState(true);
  if (!tax) return null;

  // Locked / no entity
  if (tax.tax === null && tax.prompt) {
    return (
      <div className="glass p-5" style={{ border:'1px solid rgba(251,191,36,0.2)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span style={{fontSize:20}}>🔒</span>
          <h3 className="text-white font-semibold" style={{fontFamily:'DM Serif Display'}}>Tax Insights Locked</h3>
        </div>
        <p className="text-amber-400/80 text-sm">{tax.prompt}</p>
        <p className="text-slate-500 text-xs mt-2">{tax.disclaimer}</p>
      </div>
    );
  }

  if (tax.tax === 0) {
    return (
      <div className="glass p-5">
        <h3 className="text-white font-semibold mb-2" style={{fontFamily:'DM Serif Display'}}>🧾 Tax Estimate</h3>
        <p className="text-emerald-400 text-sm">{tax.message}</p>
        <p className="text-slate-500 text-xs mt-2">{tax.disclaimer}</p>
      </div>
    );
  }

  if (tax.tax === null) {
    return (
      <div className="glass p-5">
        <h3 className="text-white font-semibold mb-2" style={{fontFamily:'DM Serif Display'}}>🧾 Tax Estimate</h3>
        <p className="text-slate-400 text-sm">{tax.message}</p>
        {tax.supported_countries && <p className="text-slate-500 text-xs mt-2">Supported: {tax.supported_countries.join(', ')}</p>}
        <p className="text-slate-600 text-xs mt-2">{tax.disclaimer}</p>
      </div>
    );
  }

  // BUG FIX: after-tax profit = original gross profit minus total tax owed
  const afterTax = (tax.gross_profit ?? tax.net_profit ?? 0) - (tax.tax ?? 0);
  const brackets = tax.bracket_breakdown || [];
  const dedLog   = tax.deduction_breakdown || [];

  return (
    <div className="glass p-6 space-y-5" style={{border:'1px solid rgba(251,191,36,0.15)'}}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{width:40,height:40,borderRadius:10,background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🧾</div>
        <div>
          <h3 className="text-white font-semibold" style={{fontFamily:'DM Serif Display',fontSize:'1.15rem'}}>Tax Estimate</h3>
          <p className="text-slate-500 text-xs font-mono">{tax.country_description} · {tax.entity_type} · {tax.filing_status}</p>
        </div>
      </div>

      {/* Income → Deductions → Taxable → Tax flow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Gross Profit',    value: fmtC(tax.gross_profit),   color:'#34d399', icon:'💰'},
          {label:'Total Deductions',value: fmtC(tax.total_deductions),color:'#22d3ee', icon:'➖'},
          {label:'Taxable Income',  value: fmtC(tax.taxable_income),  color:'#fbbf24', icon:'📊'},
          {label:'Est. Federal Tax', value: fmtC(tax.tax),            color:'#fb7185', icon:'🏛️'},
        ].map((item,i)=>(
          <div key={i} className="glass-sm p-3 text-center">
            <div style={{fontSize:20,marginBottom:6}}>{item.icon}</div>
            <p className="text-slate-500 text-xs font-mono mb-1">{item.label}</p>
            <p className="font-bold" style={{fontFamily:'JetBrains Mono',color:item.color,fontSize:'0.95rem'}}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Effective rate bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">Effective Rate on Gross Profit</span>
          <span className="font-mono font-bold text-amber-400">{tax.effective_rate?.toFixed(1)}%</span>
        </div>
        <div style={{height:8,background:'#1e293b',borderRadius:4,overflow:'hidden'}}>
          <div style={{width:`${Math.min(tax.effective_rate,60)*100/60}%`,height:'100%',background:'linear-gradient(90deg,#fbbf24,#f59e0b)',borderRadius:4,transition:'width 0.8s'}} />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
          <span>0%</span><span>30%</span><span>60%</span>
        </div>
      </div>

      {/* After-tax profit */}
      <div className="rounded-xl p-4 flex items-center justify-between"
        style={{background:'rgba(52,211,153,0.06)',border:'1px solid rgba(52,211,153,0.2)'}}>
        <div>
          <p className="text-slate-400 text-xs font-mono mb-0.5">After-Tax Profit (estimated)</p>
          <p className="text-2xl font-bold" style={{fontFamily:'JetBrains Mono',color: afterTax >= 0 ? '#34d399':'#fb7185'}}>
            {fmtC(afterTax)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-xs font-mono">You keep</p>
          <p className="text-xl font-bold text-emerald-400">
            {tax.gross_profit > 0 ? ((afterTax/tax.gross_profit)*100).toFixed(1) : 0}%
          </p>
          <p className="text-slate-600 text-xs">of gross profit</p>
        </div>
      </div>

      {/* Deduction breakdown */}
      {dedLog.length > 0 && (
        <div>
          <button onClick={()=>setShowDeductions(!showDeductions)}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <span>📉 Deduction Breakdown ({dedLog.length} items, {fmtC(tax.total_deductions)} total)</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              style={{color:'#475569',transform:showDeductions?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}>
              <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showDeductions && (
            <div className="space-y-2 mt-2">
              {dedLog.map((d,i)=>(
                <div key={i} className="glass-sm p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-slate-300 text-sm font-medium">{d.item}</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-snug">{d.note}</p>
                    </div>
                    <p className="font-mono font-bold text-emerald-400 flex-shrink-0">−{fmtC(d.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bracket breakdown */}
      {brackets.length > 0 && (
        <div>
          <button onClick={()=>setShowBrackets(!showBrackets)}
            className="text-xs text-slate-500 hover:text-slate-300 underline">
            {showBrackets ? 'Hide' : 'Show'} tax bracket breakdown
          </button>
          {showBrackets && (
            <table className="w-full data-table mt-3">
              <thead><tr><th>Bracket / Item</th><th>Rate</th><th>Taxable Amount</th><th>Tax</th></tr></thead>
              <tbody>
                {brackets.map((b,i)=>(
                  <tr key={i}>
                    <td className="text-slate-400 text-xs">{b.bracket}</td>
                    <td className="font-mono text-amber-400 text-xs">{b.rate}</td>
                    <td className="font-mono text-slate-300 text-xs">{fmt(b.taxable_amount)}</td>
                    <td className="font-mono text-rose-400 text-xs">{b.tax < 0 ? '−' : ''}{fmt(Math.abs(b.tax))}</td>
                  </tr>
                ))}
                <tr style={{borderTop:'1px solid #334155'}}>
                  <td colSpan="3" className="text-slate-400 text-xs font-semibold">Total Federal Tax</td>
                  <td className="font-mono font-bold text-rose-400 text-sm">{fmt(tax.tax)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Explanation */}
      <div className="glass-sm p-3">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">Tax Rule Source</p>
        <p className="text-slate-400 text-sm leading-relaxed">{tax.explanation}</p>
      </div>

      {/* State tax reminder (US only) */}
      {tax.country === 'US' && (
        <div className="rounded-lg p-3" style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
          <p className="text-amber-400/80 text-xs">
            💡 <strong>State taxes not included.</strong> Add 0–13% depending on your state.
            CA: 8.84% (C-Corp) / up to 13.3% (individuals). TX/WY/NV: 0%. NY: ~6.5%–10.9%.
          </p>
        </div>
      )}

      <p className="text-slate-600 text-xs leading-relaxed">{tax.disclaimer}</p>
    </div>
  );
}
