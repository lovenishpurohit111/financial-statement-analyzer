import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import axios from 'axios';
import API from '../config';

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtK = n => {
  if (n == null || isNaN(n)) return '$0';
  const a = Math.abs(n);
  return `${n < 0 ? '-' : ''}$${a >= 1e6 ? (a/1e6).toFixed(1)+'M' : a >= 1e3 ? (a/1e3).toFixed(0)+'K' : a.toFixed(0)}`;
};

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1A1009', border: '1px solid #3D3525', borderRadius: 3, padding: '10px 14px' }}>
      {label && <p style={{ color: '#8A7F70', fontSize: 11, fontFamily: 'IBM Plex Mono', marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: p.color, fontSize: 12, fontFamily: 'IBM Plex Sans' }}>{p.name}</span>
          <span style={{ color: '#F7F4EE', fontSize: 13, fontFamily: 'IBM Plex Mono', fontWeight: 600 }}>{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function RunwayMeter({ months, label }) {
  if (months == null) return null;
  const maxMonths = 36;
  const pct = Math.min((months / maxMonths) * 100, 100);
  const color = months < 3 ? '#C41E3A' : months < 6 ? '#B45309' : months < 12 ? '#1E40AF' : '#1B6535';
  const bgColor = months < 3 ? '#FCEEF1' : months < 6 ? '#FEF3C7' : months < 12 ? '#EFF6FF' : '#EAF6EE';

  return (
    <div style={{ background: bgColor, border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, padding: '20px 24px', borderRadius: '0 0 4px 4px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontFamily: 'IBM Plex Mono', color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cash Runway</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 48, fontWeight: 600, color }}>{months.toFixed(1)}</span>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: `${color}99` }}>months</span>
      </div>
      <div style={{ height: 10, background: '#E2DDD4', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'IBM Plex Mono', color: `${color}99` }}>
        <span>0</span><span>6 mo</span><span>12 mo</span><span>24 mo</span><span>36 mo+</span>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 13, color, fontFamily: 'IBM Plex Sans', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

export default function RunwayPanel({ results }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [cashInput, setCashInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fetched = useRef(false);

  const pl = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);

  const fetchRunway = async (cash = null) => {
    if (!pl) return;
    setLoading(true); setError(null);
    try {
      const r = await axios.post(`${API}/runway`, {
        pl_data: pl,
        bs_data: bs?.type === 'bs' ? bs : null,
        cash_on_hand: cash,
      });
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Runway calculation failed.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (fetched.current || !pl) return;
    fetched.current = true;
    fetchRunway();
  }, []);

  if (!pl) return (
    <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderLeft: '3px solid #B45309', padding: '20px 24px', borderRadius: '0 4px 4px 0' }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#92400E' }}>P&L Required</p>
      <p style={{ margin: '6px 0 0', color: '#78350F', fontSize: 13 }}>Upload a Profit & Loss file to compute burn rate and runway.</p>
    </div>
  );

  const mon = data?.monthly || {};
  const be  = data?.break_even || {};

  const costChart = [
    { name: 'Revenue',     value: mon.revenue || 0 },
    { name: 'COGS',        value: mon.cogs || 0 },
    { name: 'Operating',   value: mon.operating_expenses || 0 },
    { name: 'Fixed Costs', value: mon.fixed_costs || 0 },
    { name: 'Net CF',      value: mon.net_cash_flow || 0 },
  ].filter(d => d.value !== 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: '3px solid #1A1009', padding: 24, borderRadius: '0 0 4px 4px' }}>
        <h2 className="headline" style={{ fontSize: 20, margin: '0 0 6px' }}>Burn Rate & Runway</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>
          Monthly burn rate, cash runway, and break-even analysis based on your P&L. Enter your current cash balance for accurate runway calculation.
        </p>
      </div>

      {/* Cash input */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, padding: 20, display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Cash / Bank Balance (optional)
          </label>
          <input
            type="number" min="0" placeholder="e.g. 150000"
            value={cashInput}
            onChange={e => setCashInput(e.target.value)}
            style={{ width: '100%', border: '1.5px solid #C4BAA8', borderRadius: 2, padding: '9px 12px', fontSize: 13, fontFamily: 'IBM Plex Mono', color: '#1A1009', outline: 'none', background: '#FFFFFF' }}
          />
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>
            {data?.cash_on_hand ? `Using: ${fmt(data.cash_on_hand)}` : 'We\'ll try to detect cash from balance sheet if not provided.'}
          </p>
        </div>
        <button onClick={() => { setSubmitted(true); fetchRunway(parseFloat(cashInput) || null); }}
          disabled={loading}
          style={{ padding: '10px 20px', background: '#1A1009', color: '#F7F4EE', border: 'none', borderRadius: 2, fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {loading ? 'Calculating…' : 'Update Runway →'}
        </button>
      </div>

      {error && <div style={{ background: '#FCEEF1', border: '1px solid #C41E3A', padding: 16, borderRadius: 4, color: '#C41E3A', fontSize: 13 }}>⚠ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #EDE9DF', borderTop: '2px solid #C41E3A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#8A7F70', fontFamily: 'IBM Plex Sans', fontSize: 13 }}>Calculating burn rate and runway…</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Runway meter */}
          {data.runway_months != null ? (
            <RunwayMeter months={data.runway_months} label={data.runway_label} />
          ) : (
            <div style={{ background: '#EAF6EE', border: '1px solid #1B6535', borderTop: '3px solid #1B6535', padding: '20px 24px', borderRadius: '0 0 4px 4px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#1B6535', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cash Position</p>
              <p style={{ margin: 0, fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 600, color: '#1B6535' }}>✅ Cash-Flow Positive</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#2D9150', fontFamily: 'IBM Plex Sans' }}>
                {data.runway_label || 'The business generates more cash than it spends — no runway concern.'}
              </p>
            </div>
          )}

          {/* Monthly KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12 }}>
            {[
              { label: 'Monthly Revenue',   value: fmt(mon.revenue),         color: '#1B6535', border: '#1B6535' },
              { label: 'Gross Burn Rate',   value: fmt(mon.gross_burn),      color: '#C41E3A', border: '#C41E3A' },
              { label: 'Fixed Costs / Mo',  value: fmt(mon.fixed_costs),     color: '#B45309', border: '#B45309' },
              { label: 'Variable Costs/Mo', value: fmt(mon.variable_costs),  color: '#8A7F70', border: '#3D3525' },
              { label: 'Net Cash Flow/Mo',  value: fmt(mon.net_cash_flow),   color: (mon.net_cash_flow || 0) >= 0 ? '#1B6535' : '#C41E3A', border: (mon.net_cash_flow || 0) >= 0 ? '#1B6535' : '#C41E3A' },
              data.net_burn_monthly > 0 ? { label: 'Net Burn / Month', value: fmt(data.net_burn_monthly), color: '#C41E3A', border: '#C41E3A' } : null,
            ].filter(Boolean).map((k, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: `3px solid ${k.border}`, padding: '14px 16px', borderRadius: '0 0 4px 4px' }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.label}</p>
                <p style={{ margin: 0, fontFamily: 'IBM Plex Mono', fontWeight: 600, fontSize: 16, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly cash flow chart */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, padding: 24 }}>
            <h3 className="headline" style={{ fontSize: 15, margin: '0 0 6px' }}>Monthly Cost Structure</h3>
            <p style={{ margin: '0 0 20px', fontSize: 11, color: '#8A7F70', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Based on annual P&L ÷ 12</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barSize={40}>
                <CartesianGrid strokeDasharray="2 4" stroke="#EDE9DF" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8A7F70', fontSize: 10, fontFamily: 'IBM Plex Sans' }} axisLine={{ stroke: '#E2DDD4' }} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fill: '#8A7F70', fontSize: 9, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} cursor={{ fill: 'rgba(26,16,9,0.04)' }} />
                <ReferenceLine y={0} stroke="#C4BAA8" strokeDasharray="2 2" />
                <Bar dataKey="value" name="Amount" radius={[3, 3, 0, 0]}>
                  {costChart.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.name === 'Revenue' ? '#1B6535' :
                      entry.name === 'Net CF' ? (entry.value >= 0 ? '#1E40AF' : '#C41E3A') :
                      entry.name === 'Fixed Costs' ? '#B45309' : '#C41E3A'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Break-even */}
          {be.monthly_revenue_needed && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, padding: 24 }}>
              <h3 className="headline" style={{ fontSize: 15, margin: '0 0 16px' }}>Break-Even Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Break-Even Revenue (Monthly)', value: fmt(be.monthly_revenue_needed), color: '#1E40AF' },
                  { label: 'Break-Even Revenue (Annual)',  value: fmt(be.annual_revenue_needed),  color: '#1E40AF' },
                  { label: 'Gap from Current Revenue',     value: be.gap_from_current > 0 ? fmt(be.gap_from_current) : '✅ Achieved', color: be.gap_from_current > 0 ? '#B45309' : '#1B6535' },
                  { label: 'Contribution Margin',          value: `${be.contribution_margin_pct?.toFixed(1)}%`, color: '#8A7F70' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#F7F4EE', borderRadius: 3, padding: '12px 16px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.label}</p>
                    <p style={{ margin: 0, fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 15, color: k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.6, background: '#F7F4EE', padding: '10px 14px', borderRadius: 3 }}>
                Break-even point uses contribution margin analysis: Fixed Costs ÷ (1 − Variable Cost Ratio).
                Contribution margin of {be.contribution_margin_pct?.toFixed(1)}% means each additional dollar of revenue contributes {be.contribution_margin_pct?.toFixed(1)}¢ toward covering fixed costs.
              </p>
            </div>
          )}

          {/* Survival scenarios */}
          {data.survival_scenarios?.length > 0 && (
            <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderLeft: '3px solid #B45309', padding: '20px 24px', borderRadius: '0 4px 4px 0' }}>
              <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 14, color: '#92400E', fontFamily: 'IBM Plex Sans' }}>💡 Runway Extension Scenarios</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.survival_scenarios.map((s, i) => (
                  <div key={i} style={{ background: 'white', padding: '12px 16px', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: '#1A1009', fontFamily: 'IBM Plex Sans' }}>{s.action}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>New monthly burn: {fmt(s.new_monthly_burn)}</p>
                    </div>
                    {s.extended_runway_months && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 10, color: '#8A7F70', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>Extended Runway</p>
                        <p style={{ margin: 0, fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: '#1B6535' }}>{s.extended_runway_months.toFixed(1)} mo</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ margin: 0, fontSize: 11, color: '#C4BAA8', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>
            {data.period_assumption}. Fixed/variable cost split is estimated (60% of OpEx fixed, COGS variable). Provide actual figures to your accountant for precise cash flow planning.
          </p>
        </>
      )}
    </div>
  );
}
