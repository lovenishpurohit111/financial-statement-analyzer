import React, { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import axios from 'axios';
import API from '../config';

const fmtK = n => {
  if (n == null || isNaN(n)) return '$0';
  const a = Math.abs(n);
  const s = a >= 1e6 ? `${(a/1e6).toFixed(1)}M` : a >= 1e3 ? `${(a/1e3).toFixed(0)}K` : a.toFixed(0);
  return `${n < 0 ? '-' : ''}$${s}`;
};
const fmtPct = n => `${n >= 0 ? '+' : ''}${n?.toFixed(1)}%`;
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0);

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1A1009', border: '1px solid #3D3525', borderRadius: 3, padding: '10px 14px', fontFamily: 'IBM Plex Sans' }}>
      {label && <p style={{ color: '#8A7F70', fontSize: 11, fontFamily: 'IBM Plex Mono', marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 2 }}>
          <span style={{ color: p.color || '#C4BAA8', fontSize: 12 }}>{p.name}</span>
          <span style={{ color: '#F7F4EE', fontSize: 13, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PRESET_ICONS = { 'Optimistic Growth': '🚀', 'Recession Scenario': '📉', 'Cost Optimization': '✂️', 'Price Increase +10%': '💰', 'Hiring Surge': '👥', 'Break-Even Analysis': '⚖️' };

function DeltaBadge({ val, unit = '' }) {
  if (val == null) return null;
  const pos = val >= 0;
  return (
    <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: pos ? '#1B6535' : '#C41E3A', background: pos ? '#EAF6EE' : '#FCEEF1', padding: '2px 7px', borderRadius: 2, marginLeft: 6 }}>
      {val >= 0 ? '+' : ''}{val.toFixed(1)}{unit}
    </span>
  );
}

function SliderInput({ label, value, onChange, min = -50, max = 50, step = 1, color = '#C41E3A' }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1009', fontFamily: 'IBM Plex Sans' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 15, color: value === 0 ? '#8A7F70' : value > 0 ? '#1B6535' : '#C41E3A' }}>
            {value >= 0 ? '+' : ''}{value}%
          </span>
          <input type="number" value={value} min={min} max={max} step={step}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            style={{ width: 70, border: '1.5px solid #C4BAA8', borderRadius: 2, padding: '4px 8px', fontFamily: 'IBM Plex Mono', fontSize: 12, textAlign: 'right', outline: 'none' }} />
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#C4BAA8', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
        <span>{min}%</span><span>0</span><span>+{max}%</span>
      </div>
    </div>
  );
}

export default function ScenarioPanel({ results }) {
  const [revChange,  setRevChange]  = useState(0);
  const [cogsChange, setCogsChange] = useState(0);
  const [opexChange, setOpexChange] = useState(0);
  const [scenarioData, setScenarioData] = useState(null);
  const [presets,     setPresets]   = useState(null);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const pl = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);

  const runScenario = useCallback(async (rev, cogs, opex, label = 'Custom Scenario') => {
    if (!pl) return;
    setLoading(true); setActivePreset(label);
    try {
      const r = await axios.post(`${API}/scenario/run`, {
        pl_data: pl,
        revenue_change_pct: rev,
        cogs_change_pct: cogs,
        opex_change_pct: opex,
        label,
      });
      setScenarioData(r.data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [pl]);

  const loadPresets = async () => {
    if (!pl || presets) return;
    setPresetsLoading(true);
    try {
      const r = await axios.post(`${API}/scenario/presets`, { pl_data: pl });
      setPresets(r.data.scenarios || []);
    } catch (e) { console.error(e); }
    finally { setPresetsLoading(false); }
  };

  // Auto-run when sliders change (debounce via useCallback)
  const handleSliderChange = (rev, cogs, opex) => {
    setRevChange(rev); setCogsChange(cogs); setOpexChange(opex);
    setActivePreset('Custom Scenario');
    runScenario(rev, cogs, opex, 'Custom Scenario');
  };

  if (!pl) return (
    <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderLeft: '3px solid #B45309', padding: '20px 24px', borderRadius: '0 4px 4px 0' }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#92400E' }}>P&L Required</p>
      <p style={{ margin: '6px 0 0', color: '#78350F', fontSize: 13 }}>Upload a Profit & Loss file to use the Scenario Simulator.</p>
    </div>
  );

  const base = scenarioData?.baseline;
  const proj = scenarioData?.projected;
  const deltas = scenarioData?.deltas;

  const chartData = base && proj ? [
    { name: 'Revenue',    baseline: base.total_revenue,     projected: proj.total_revenue },
    { name: 'COGS',       baseline: base.total_cogs,        projected: proj.total_cogs },
    { name: 'Op. Exp',    baseline: base.total_op_expenses, projected: proj.total_op_expenses },
    { name: 'Net Profit', baseline: base.net_profit,        projected: proj.net_profit },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: '3px solid #1A1009', padding: 24, borderRadius: '0 0 4px 4px' }}>
        <h2 className="headline" style={{ fontSize: 20, margin: '0 0 6px' }}>Scenario Simulator</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>
          Model the financial impact of revenue changes, cost reductions, or growth investments. Use the sliders or choose a preset scenario.
        </p>
      </div>

      {/* Preset scenarios */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #EDE9DF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="headline" style={{ fontSize: 15, margin: 0 }}>Preset Scenarios</h3>
          {!presets && (
            <button onClick={loadPresets} disabled={presetsLoading}
              style={{ padding: '6px 14px', background: '#1A1009', color: '#F7F4EE', border: 'none', borderRadius: 2, fontSize: 12, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>
              {presetsLoading ? 'Loading…' : 'Load Presets'}
            </button>
          )}
        </div>
        {presetsLoading && <div style={{ padding: 20, textAlign: 'center', color: '#8A7F70', fontFamily: 'IBM Plex Sans', fontSize: 13 }}>Calculating scenarios…</div>}
        {presets && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0 }}>
            {presets.map((p, i) => {
              const isActive = activePreset === p.label;
              const netDelta = p.deltas?.net_profit?.pct;
              const pos = netDelta >= 0;
              return (
                <button key={i} onClick={() => {
                  setRevChange(p.assumptions.revenue_change_pct);
                  setCogsChange(p.assumptions.cogs_change_pct);
                  setOpexChange(p.assumptions.opex_change_pct);
                  setScenarioData(p);
                  setActivePreset(p.label);
                }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', background: isActive ? '#1A1009' : '#FFFFFF', border: 'none', borderRight: '1px solid #EDE9DF', borderBottom: '1px solid #EDE9DF', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{PRESET_ICONS[p.label] || '📊'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#F7F4EE' : '#1A1009', fontFamily: 'IBM Plex Sans' }}>{p.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: isActive ? '#8A7F70' : '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.4 }}>{p.description}</p>
                  {netDelta != null && (
                    <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: pos ? '#1B6535' : '#C41E3A', background: pos ? '#EAF6EE' : '#FCEEF1', padding: '2px 7px', borderRadius: 2, alignSelf: 'flex-start' }}>
                      Net Profit {netDelta >= 0 ? '+' : ''}{netDelta?.toFixed(0)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, padding: 24 }}>
          <h3 className="headline" style={{ fontSize: 15, margin: '0 0 20px' }}>Custom Adjustments</h3>
          <SliderInput label="Revenue Change" value={revChange}
            onChange={v => handleSliderChange(v, cogsChange, opexChange)} color="#1B6535" />
          <SliderInput label="COGS Change" value={cogsChange}
            onChange={v => handleSliderChange(revChange, v, opexChange)} color="#B45309" />
          <SliderInput label="Operating Expense Change" value={opexChange}
            onChange={v => handleSliderChange(revChange, cogsChange, v)} color="#C41E3A" />
          <button onClick={() => handleSliderChange(revChange, cogsChange, opexChange)}
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#C41E3A', color: '#FFF', border: 'none', borderRadius: 2, fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Calculating…' : 'RUN SCENARIO →'}
          </button>
        </div>

        {/* Results KPIs */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, padding: 24 }}>
          <h3 className="headline" style={{ fontSize: 15, margin: '0 0 20px' }}>
            {scenarioData ? scenarioData.label : 'Projected Results'}
          </h3>
          {!scenarioData && !loading && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#8A7F70', fontFamily: 'IBM Plex Sans', fontSize: 13 }}>
              <p style={{ fontSize: 32, marginBottom: 10 }}>🔮</p>
              Adjust sliders or pick a preset to see projections
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: 28, height: 28, border: '2px solid #EDE9DF', borderTop: '2px solid #C41E3A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
            </div>
          )}
          {proj && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Revenue',    base: base.total_revenue,     proj: proj.total_revenue,     delta: deltas.revenue.pct,    unit: '%' },
                { label: 'Net Profit', base: base.net_profit,        proj: proj.net_profit,        delta: deltas.net_profit.pct, unit: '%' },
                { label: 'Gross Margin', base: base.gross_margin,    proj: proj.gross_margin,      delta: deltas.gross_margin_pts, unit: 'pp' },
                { label: 'Net Margin', base: base.net_margin,        proj: proj.net_margin,        delta: deltas.net_margin_pts, unit: 'pp' },
              ].map((row, i) => {
                const isAmt = row.label === 'Revenue' || row.label === 'Net Profit';
                const fmt_ = isAmt ? fmt : n => `${n?.toFixed(1)}%`;
                const isPos = row.delta >= 0;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F7F4EE', borderRadius: 3 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: '#8A7F70', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#8A7F70', fontFamily: 'IBM Plex Mono', textDecoration: 'line-through' }}>{fmt_(row.base)}</span>
                        <span style={{ fontSize: 15, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: row.proj >= 0 ? '#1B6535' : '#C41E3A' }}>{fmt_(row.proj)}</span>
                      </div>
                    </div>
                    {row.delta != null && (
                      <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 14, color: isPos ? '#1B6535' : '#C41E3A', background: isPos ? '#EAF6EE' : '#FCEEF1', padding: '4px 10px', borderRadius: 3 }}>
                        {isPos ? '+' : ''}{row.delta?.toFixed(1)}{row.unit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comparison chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, padding: 24 }}>
          <h3 className="headline" style={{ fontSize: 15, margin: '0 0 6px' }}>Baseline vs Projected</h3>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: '#8A7F70', fontFamily: 'IBM Plex Mono', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {scenarioData?.label}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="2 4" stroke="#EDE9DF" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8A7F70', fontSize: 11, fontFamily: 'IBM Plex Sans' }} axisLine={{ stroke: '#E2DDD4' }} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fill: '#8A7F70', fontSize: 9, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT />} cursor={{ fill: 'rgba(26,16,9,0.04)' }} />
              <ReferenceLine y={0} stroke="#C4BAA8" strokeDasharray="2 2" />
              <Bar dataKey="baseline" name="Baseline" radius={[2, 2, 0, 0]} maxBarSize={36}>
                {chartData.map((_, i) => <Cell key={i} fill="#C4BAA8" />)}
              </Bar>
              <Bar dataKey="projected" name="Projected" radius={[2, 2, 0, 0]} maxBarSize={36}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.projected >= 0 ? (entry.projected >= entry.baseline ? '#1B6535' : '#B45309') : '#C41E3A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 10 }}>
            {[{ color: '#C4BAA8', label: 'Baseline' }, { color: '#1B6535', label: 'Projected (better)' }, { color: '#C41E3A', label: 'Projected (worse)' }].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'IBM Plex Sans', color: '#8A7F70' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
