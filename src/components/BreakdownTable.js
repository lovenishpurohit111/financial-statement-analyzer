import React, { useState } from 'react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0 }).format(n ?? 0);

function Section({ title, items, color, maxVal }) {
  const [open, setOpen] = useState(true);
  if (!items?.length) return null;
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="mb-2">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-800/30 transition-colors rounded-lg">
        <div className="flex items-center gap-2">
          <div style={{ width:8, height:8, borderRadius:'50%', background:`rgb(${color})`, flexShrink:0 }} />
          <span className="text-slate-300 font-medium text-sm">{title}</span>
          <span className="text-xs font-mono text-slate-500">({items.length} items)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold" style={{ color:`rgb(${color})` }}>{fmt(total)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color:'#475569', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="pl-4 space-y-1 mt-1">
          {items.map((item, i) => {
            const barPct = maxVal ? Math.min(item.value / maxVal * 100, 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg group hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div style={{ width:100, height:4, background:'#1e293b', borderRadius:2, overflow:'hidden', flexShrink:0 }}>
                    <div style={{ width:`${barPct}%`, height:'100%', background:`rgba(${color},0.6)`, borderRadius:2 }} />
                  </div>
                  <span className="text-slate-400 text-sm truncate">{item.label}</span>
                </div>
                <span className="font-mono text-sm text-slate-300 ml-3 flex-shrink-0">{fmt(item.value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BreakdownTable({ results }) {
  const pl = results?.analysis?.type === 'pl' ? results.analysis : results?.pl_analysis;
  const bs = results?.analysis?.type === 'bs' ? results.analysis : results?.bs_current;

  // BUG FIX: guard against missing breakdown sections
  const rawPlBreakdown = pl?.breakdown;
  const plBreakdown = rawPlBreakdown && (
    (rawPlBreakdown.income?.length > 0) ||
    (rawPlBreakdown.cogs?.length > 0) ||
    (rawPlBreakdown.operating_expenses?.length > 0)
  ) ? rawPlBreakdown : null;
  const bsBreakdown = bs?.breakdown;

  const allValues = plBreakdown
    ? [...(plBreakdown.income||[]), ...(plBreakdown.cogs||[]), ...(plBreakdown.operating_expenses||[])].map(i => i.value)
    : bsBreakdown
    ? Object.values(bsBreakdown).flat().map(i => i.value)
    : [];
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="glass p-5">
      <h2 className="text-white font-bold mb-4" style={{ fontFamily:'DM Serif Display', fontSize:'1.2rem' }}>
        📋 Line Item Breakdown
      </h2>

      {plBreakdown && (
        <>
          <Section title="Income / Revenue"    items={plBreakdown.income}              color="52,211,153"  maxVal={maxVal} />
          <Section title="Cost of Goods Sold"  items={plBreakdown.cogs}               color="251,191,36"  maxVal={maxVal} />
          <Section title="Operating Expenses"  items={plBreakdown.operating_expenses}  color="251,113,133" maxVal={maxVal} />
          <Section title="Other Income"        items={plBreakdown.other_income}        color="34,211,238"  maxVal={maxVal} />
          <Section title="Other Expenses"      items={plBreakdown.other_expenses}      color="167,139,250" maxVal={maxVal} />
        </>
      )}

      {bsBreakdown && (
        <>
          <Section title="Current Assets"         items={bsBreakdown.current_assets}        color="52,211,153"  maxVal={maxVal} />
          <Section title="Fixed Assets"            items={bsBreakdown.fixed_assets}          color="34,211,238"  maxVal={maxVal} />
          <Section title="Other Assets"            items={bsBreakdown.other_assets}          color="167,139,250" maxVal={maxVal} />
          <Section title="Current Liabilities"     items={bsBreakdown.current_liabilities}   color="251,191,36"  maxVal={maxVal} />
          <Section title="Long-Term Liabilities"   items={bsBreakdown.long_term_liabilities} color="251,113,133" maxVal={maxVal} />
          <Section title="Equity"                  items={bsBreakdown.equity}                color="251,113,133" maxVal={maxVal} />
        </>
      )}
    </div>
  );
}
