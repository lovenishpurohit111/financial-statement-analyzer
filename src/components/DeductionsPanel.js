import React, { useState } from 'react';

const DEDUCTIONS = [
  {
    key: 'health_insurance',
    label: 'Self-Employed Health Insurance',
    icon: '🏥',
    placeholder: '0',
    type: 'dollar',
    note: '100% deductible (Sec 162(l)). Premiums for you, spouse & dependents.',
    maxNote: 'Cannot exceed net self-employment income.',
  },
  {
    key: 'sep_ira',
    label: 'SEP-IRA Contribution',
    icon: '🏦',
    placeholder: '0',
    type: 'dollar',
    note: '2024: up to 25% of net earnings or $69,000, whichever is less.',
  },
  {
    key: 'solo_401k',
    label: 'Solo 401(k) Contribution',
    icon: '📈',
    placeholder: '0',
    type: 'dollar',
    note: '2024: employee deferral $23,000 + employer up to 25% comp. Total max $69,000.',
  },
  {
    key: 'home_office',
    label: 'Home Office (sq ft)',
    icon: '🏠',
    placeholder: '0',
    type: 'sqft',
    note: 'Simplified method: $5/sq ft, max 300 sq ft = $1,500 deduction (Sec 280A).',
    maxSqFt: 300,
  },
  {
    key: 'vehicle_miles',
    label: 'Business Miles Driven',
    icon: '🚗',
    placeholder: '0',
    type: 'miles',
    note: '2024 IRS rate: 67¢ per business mile. Keep a mileage log.',
  },
  {
    key: 'section_179',
    label: 'Section 179 Equipment',
    icon: '🖥️',
    placeholder: '0',
    type: 'dollar',
    note: '2024: immediately expense up to $1,220,000 of qualifying business equipment.',
  },
  {
    key: 'meals_entertainment',
    label: 'Business Meals (full cost)',
    icon: '🍽️',
    placeholder: '0',
    type: 'dollar',
    note: '50% deductible post-TCJA. Enter total spent — we apply the 50% rule.',
    deductiblePct: 0.5,
  },
  {
    key: 'other_deductions',
    label: 'Other Business Deductions',
    icon: '📋',
    placeholder: '0',
    type: 'dollar',
    note: 'Other ordinary & necessary expenses not already captured in your P&L.',
  },
];

const FILING_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married Filing Jointly' },
];

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function computePreview(values) {
  let total = 0;
  if (values.health_insurance) total += Number(values.health_insurance) || 0;
  if (values.sep_ira)          total += Number(values.sep_ira) || 0;
  if (values.solo_401k)        total += Number(values.solo_401k) || 0;
  if (values.home_office)      total += Math.min((Number(values.home_office) || 0), 300) * 5;
  if (values.vehicle_miles)    total += (Number(values.vehicle_miles) || 0) * 0.67;
  if (values.section_179)      total += Math.min(Number(values.section_179) || 0, 1220000);
  if (values.meals_entertainment) total += (Number(values.meals_entertainment) || 0) * 0.5;
  if (values.other_deductions) total += Number(values.other_deductions) || 0;
  return Math.round(total);
}

export default function DeductionsPanel({ country, entityType, netProfit, onDeductionsChange }) {
  const [open, setOpen]       = useState(false);
  const [values, setValues]   = useState({});
  const [filing, setFiling]   = useState('single');

  const isUS = country === 'US';
  const isPassThrough = ['sole_proprietorship','partnership','s_corp'].includes(entityType);

  if (!isUS || !entityType || !isPassThrough) {
    // For non-US or C-Corp, show simplified panel
    if (!entityType || !netProfit) return null;
    return (
      <div className="glass-sm p-4 mt-3" style={{ border:'1px solid rgba(51,65,85,0.5)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span>📋</span>
          <span className="text-slate-400 text-sm font-medium">Additional Deductions</span>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-mono mb-1 block">Other Business Deductions ($)</label>
          <input type="number" min="0" placeholder="0"
            className="w-full px-3 py-2 rounded-lg text-sm text-slate-300 focus:outline-none"
            style={{ background:'#0a0f1e', border:'1px solid #334155' }}
            onChange={e => {
              const v = { other_deductions: Number(e.target.value) || 0, filing_status: filing };
              onDeductionsChange(v);
            }} />
          <p className="text-slate-600 text-xs mt-1">Ordinary business expenses not already in your P&L.</p>
        </div>
      </div>
    );
  }

  const preview = computePreview(values);

  const update = (key, val) => {
    const next = { ...values, [key]: val };
    setValues(next);
    onDeductionsChange({ ...next, filing_status: filing });
  };

  const updateFiling = (f) => {
    setFiling(f);
    onDeductionsChange({ ...values, filing_status: f });
  };

  const inputStyle = {
    background:'#0a0f1e', border:'1px solid #334155', borderRadius:8,
    color:'#e2e8f0', padding:'7px 10px', fontSize:13, width:'100%', outline:'none',
  };

  return (
    <div className="mt-3" style={{ border:'1px solid rgba(251,191,36,0.2)', borderRadius:12, overflow:'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/20 transition-colors"
        style={{ background:'rgba(251,191,36,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize:18 }}>💸</span>
          <div>
            <p className="text-amber-400 font-semibold text-sm">US Tax Deductions (2024)</p>
            <p className="text-slate-500 text-xs">
              {preview > 0 ? `${fmt(preview)} in deductions entered` : 'Click to enter deductions and reduce your tax estimate'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {preview > 0 && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full text-emerald-400"
              style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)' }}>
              −{fmt(preview)}
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ color:'#64748b', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4" style={{ borderTop:'1px solid rgba(51,65,85,0.4)' }}>
          {/* Filing status */}
          <div>
            <label className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5 block">Filing Status</label>
            <div className="flex gap-2">
              {FILING_OPTIONS.map(o => (
                <button key={o.value} onClick={() => updateFiling(o.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: filing === o.value ? 'rgba(251,191,36,0.12)' : 'rgba(15,23,42,0.5)',
                    border: `1px solid ${filing === o.value ? 'rgba(251,191,36,0.35)' : '#334155'}`,
                    color: filing === o.value ? '#fbbf24' : '#64748b',
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deduction inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEDUCTIONS.map(d => {
              const computedDed = d.type === 'sqft'
                ? Math.min((Number(values[d.key]) || 0), 300) * 5
                : d.type === 'miles'
                ? (Number(values[d.key]) || 0) * 0.67
                : d.deductiblePct
                ? (Number(values[d.key]) || 0) * d.deductiblePct
                : Number(values[d.key]) || 0;

              return (
                <div key={d.key} className="glass-sm p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ fontSize:14 }}>{d.icon}</span>
                    <label className="text-slate-300 text-xs font-medium">{d.label}</label>
                  </div>
                  <input
                    type="number" min="0"
                    placeholder={d.placeholder}
                    value={values[d.key] || ''}
                    onChange={e => update(d.key, e.target.value)}
                    style={inputStyle}
                  />
                  {computedDed > 0 && (
                    <p className="text-emerald-400 text-xs font-mono mt-1">
                      → {fmt(computedDed)} deduction
                    </p>
                  )}
                  <p className="text-slate-600 text-xs mt-1 leading-snug">{d.note}</p>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {preview > 0 && (
            <div className="rounded-xl p-3 flex items-center justify-between"
              style={{ background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)' }}>
              <span className="text-slate-400 text-sm">Total Deductions Applied</span>
              <span className="font-mono font-bold text-emerald-400">{fmt(preview)}</span>
            </div>
          )}

          <p className="text-slate-600 text-xs leading-relaxed">
            ⚠️ Deductions that already appear in your P&L (rent, salaries, software, etc.) should NOT be entered again here — they are already reducing your net profit. Only enter <strong className="text-slate-500">additional personal/business deductions</strong> not captured in the uploaded file.
          </p>
        </div>
      )}
    </div>
  );
}
