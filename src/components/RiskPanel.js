import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API from '../config';

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0);

const ZONE_CFG = {
  safe:     { color: '#1B6535', bg: '#EAF6EE', border: '#1B6535', label: 'Safe Zone',     emoji: '✅' },
  grey:     { color: '#B45309', bg: '#FEF3C7', border: '#B45309', label: 'Grey Zone',     emoji: '⚠️' },
  distress: { color: '#C41E3A', bg: '#FCEEF1', border: '#C41E3A', label: 'Distress Zone', emoji: '🚨' },
};

const SEV_CFG = {
  critical: { color: '#C41E3A', bg: '#FCEEF1', border: '#C41E3A', icon: '🚨' },
  warning:  { color: '#B45309', bg: '#FEF3C7', border: '#B45309', icon: '⚠️' },
  positive: { color: '#1B6535', bg: '#EAF6EE', border: '#1B6535', icon: '✅' },
};

// SVG Spider/Radar chart for 8 dimensions
function RadarChart({ dimensions }) {
  if (!dimensions || dimensions.length === 0) return null;
  const cx = 160; const cy = 160; const r = 120;
  const n = dimensions.length;

  const angle = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (i, radius) => ({
    x: cx + Math.cos(angle(i)) * radius,
    y: cy + Math.sin(angle(i)) * radius,
  });

  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridCircles = gridLevels.map(level => {
    const pts = dimensions.map((_, i) => pt(i, r * level));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
  });

  // Data polygon
  const dataPoints = dimensions.map((d, i) => pt(i, r * (d.score / 100)));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  const avgScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const scoreColor = avgScore >= 70 ? '#1B6535' : avgScore >= 45 ? '#B45309' : '#C41E3A';

  return (
    <svg width="320" height="320" viewBox="0 0 320 320" style={{ overflow: 'visible' }}>
      {/* Grid */}
      {gridCircles.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#EDE9DF" strokeWidth={0.8} />
      ))}
      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const outer = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke="#E2DDD4" strokeWidth={0.8} />;
      })}
      {/* Data polygon */}
      <path d={dataPath} fill={scoreColor} fillOpacity={0.15} stroke={scoreColor} strokeWidth={2} strokeLinejoin="round" />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4} fill={scoreColor} stroke="white" strokeWidth={1.5} />
      ))}
      {/* Labels */}
      {dimensions.map((d, i) => {
        const labelR = r + 28;
        const lp = { x: cx + Math.cos(angle(i)) * labelR, y: cy + Math.sin(angle(i)) * labelR };
        const anchor = lp.x < cx - 10 ? 'end' : lp.x > cx + 10 ? 'start' : 'middle';
        const scoreC = d.score >= 70 ? '#1B6535' : d.score >= 45 ? '#B45309' : '#C41E3A';
        return (
          <g key={i}>
            <text x={lp.x.toFixed(1)} y={(lp.y - 6).toFixed(1)} textAnchor={anchor} style={{ fontSize: 10, fontFamily: 'IBM Plex Sans', fontWeight: 600, fill: '#3D3525' }}>{d.name}</text>
            <text x={lp.x.toFixed(1)} y={(lp.y + 7).toFixed(1)} textAnchor={anchor} style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700, fill: scoreC }}>{d.score}</text>
          </g>
        );
      })}
      {/* Center score */}
      <circle cx={cx} cy={cy} r={28} fill="white" stroke="#E2DDD4" strokeWidth={1} />
      <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: 18, fontFamily: 'IBM Plex Mono', fontWeight: 700, fill: scoreColor }}>{avgScore}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 9, fontFamily: 'IBM Plex Mono', fill: '#8A7F70' }}>/100</text>
    </svg>
  );
}

function ZScoreGauge({ z, zone }) {
  const cfg = ZONE_CFG[zone] || ZONE_CFG.grey;
  // Gauge: range -2 to 5, safe threshold at 2.9, distress at 1.23
  const MIN = -1; const MAX = 5;
  const clampedZ = Math.max(MIN, Math.min(MAX, z));
  const pct = ((clampedZ - MIN) / (MAX - MIN)) * 100;
  const distressPct = ((1.23 - MIN) / (MAX - MIN)) * 100;
  const safePct = ((2.9 - MIN) / (MAX - MIN)) * 100;

  return (
    <div style={{ padding: '20px 24px', background: '#1A1009' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Altman Z′-Score</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 48, fontWeight: 600, color: cfg.color }}>{z.toFixed(2)}</span>
        <span style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, color: cfg.color, fontWeight: 600 }}>{cfg.emoji} {cfg.label}</span>
      </div>
      {/* Gauge bar */}
      <div style={{ position: 'relative', height: 12, background: 'linear-gradient(to right, #C41E3A 0%, #C41E3A 32%, #B45309 32%, #B45309 54%, #1B6535 54%, #1B6535 100%)', borderRadius: 6, marginBottom: 6 }}>
        {/* Threshold markers */}
        <div style={{ position: 'absolute', left: `${distressPct}%`, top: -4, width: 2, height: 20, background: 'white', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: `${safePct}%`, top: -4, width: 2, height: 20, background: 'white', borderRadius: 1 }} />
        {/* Your score marker */}
        <div style={{ position: 'absolute', left: `${pct}%`, top: -6, width: 14, height: 24, background: 'white', border: `3px solid ${cfg.color}`, borderRadius: 3, transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8A7F70', marginTop: 4 }}>
        <span style={{ color: '#C41E3A' }}>◀ Distress (&lt;1.23)</span>
        <span style={{ color: '#B45309' }}>Grey (1.23–2.9)</span>
        <span style={{ color: '#1B6535' }}>Safe (&gt;2.9) ▶</span>
      </div>
    </div>
  );
}

export default function RiskPanel({ results }) {
  const [riskData, setRiskData]   = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState(null);
  const [tab,      setTab]        = useState('radar');
  const fetched = useRef(false);

  const pl = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    if (!pl && !bs) return;
    setLoading(true);
    axios.post(`${API}/risk/assess`, {
      pl_data: pl?.type === 'pl' ? pl : null,
      bs_data: bs?.type === 'bs' ? bs : null,
    })
      .then(r => setRiskData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Risk assessment failed.'))
      .finally(() => setLoading(false));
  }, []);

  if (!pl && !bs) return (
    <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderLeft: '3px solid #B45309', padding: '20px 24px', borderRadius: '0 4px 4px 0' }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#92400E' }}>Full Analysis Required</p>
      <p style={{ margin: '6px 0 0', color: '#78350F', fontSize: 13 }}>Upload both a P&L and Balance Sheet and run Full Analysis to unlock the risk assessment.</p>
    </div>
  );

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ width: 36, height: 36, border: '2px solid #EDE9DF', borderTop: '2px solid #C41E3A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
      <p style={{ color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>Running risk assessment…</p>
    </div>
  );

  if (error) return <div style={{ background: '#FCEEF1', border: '1px solid #C41E3A', padding: 20, borderRadius: 4, color: '#C41E3A' }}>⚠ {error}</div>;
  if (!riskData) return null;

  const z = riskData.altman_z;
  const radar = riskData.risk_radar;
  const warns = riskData.warning_signals || [];
  const summary = riskData.summary || {};

  const criticals = warns.filter(w => w.severity === 'critical');
  const warnings_ = warns.filter(w => w.severity === 'warning');
  const positives = warns.filter(w => w.severity === 'positive');

  const TABS = [
    { id: 'radar',    label: 'Risk Radar' },
    { id: 'altman',   label: 'Z-Score',    disabled: !z?.available },
    { id: 'signals',  label: `Signals ${criticals.length ? `(${criticals.length} critical)` : ''}` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #E2DDD4', borderRadius: 4, overflow: 'hidden' }}>
      {/* Summary bar */}
      <div style={{ background: '#1A1009', padding: '16px 24px', display: 'flex', gap: 40, flexWrap: 'wrap', borderBottom: '1px solid #3D3525' }}>
        {[
          { label: 'Overall Risk Score',   value: `${summary.overall_risk_score}/100`, color: summary.overall_risk_score >= 70 ? '#4ADE80' : summary.overall_risk_score >= 45 ? '#FCD34D' : '#F87171', sub: summary.overall_risk_label },
          { label: 'Critical Signals',     value: summary.critical_signals,           color: summary.critical_signals > 0 ? '#F87171' : '#4ADE80', sub: summary.critical_signals > 0 ? 'Require action' : 'None detected' },
          { label: 'Warning Signals',      value: summary.warning_signals,            color: summary.warning_signals > 0 ? '#FCD34D' : '#4ADE80', sub: summary.warning_signals > 0 ? 'Monitor closely' : 'None detected' },
          z?.available ? { label: 'Altman Z\'-Score', value: z.z_score.toFixed(2), color: ZONE_CFG[z.zone]?.color || '#FCD34D', sub: ZONE_CFG[z.zone]?.label || '' } : null,
        ].filter(Boolean).map((item, i) => (
          <div key={i}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</p>
            <p style={{ margin: '0 0 2px', fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 600, color: item.color }}>{item.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: item.color, fontFamily: 'IBM Plex Sans' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#FFFFFF', borderBottom: '1px solid #E2DDD4' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
            style={{ padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '3px solid #C41E3A' : '3px solid transparent', color: t.disabled ? '#C4BAA8' : tab === t.id ? '#C41E3A' : '#8A7F70', fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: tab === t.id ? 600 : 400, cursor: t.disabled ? 'default' : 'pointer', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: '#FFFFFF' }}>
        {/* Radar tab */}
        {tab === 'radar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20, borderRight: '1px solid #EDE9DF' }}>
              <RadarChart dimensions={radar?.dimensions} />
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase' }}>8-Dimension Detail</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {radar?.dimensions?.map((d, i) => {
                  const scoreColor = d.score >= 70 ? '#1B6535' : d.score >= 45 ? '#B45309' : '#C41E3A';
                  const scoreBg = d.score >= 70 ? '#EAF6EE' : d.score >= 45 ? '#FEF3C7' : '#FCEEF1';
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{d.icon}</span>
                          <span style={{ fontSize: 13, color: '#1A1009', fontFamily: 'IBM Plex Sans', fontWeight: 600 }}>{d.name}</span>
                        </div>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 13, color: scoreColor, background: scoreBg, padding: '2px 8px', borderRadius: 2 }}>{d.score}/100</span>
                      </div>
                      <div style={{ height: 5, background: '#EDE9DF', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                        <div style={{ width: `${d.score}%`, height: '100%', background: scoreColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>{d.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Altman Z-Score tab */}
        {tab === 'altman' && z?.available && (
          <div>
            <ZScoreGauge z={z.z_score} zone={z.zone} />
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 16px', color: '#3D3525', fontFamily: 'IBM Plex Sans', lineHeight: 1.7, fontSize: 13 }}>{z.description}</p>
              <div style={{ background: '#FCEEF1', border: '1px solid #C41E3A', padding: '10px 16px', borderRadius: 4, marginBottom: 20, fontSize: 12, color: '#C41E3A', fontFamily: 'IBM Plex Sans' }}>
                Estimated distress probability: <strong>{z.distress_probability}%</strong> within 2 years
              </div>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1A1009', fontFamily: 'IBM Plex Sans' }}>Z′-Score Component Breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F7F4EE' }}>
                    {['Component', 'Value', 'Weight', 'Contribution', 'Meaning'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A7F70', borderBottom: '2px solid #1A1009' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {z.components?.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #EDE9DF' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Sans', color: '#1A1009', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Mono', color: '#3D3525' }}>{c.value.toFixed(4)}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Mono', color: '#8A7F70' }}>×{c.weight}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Mono', color: c.contribution >= 0 ? '#1B6535' : '#C41E3A', fontWeight: 600 }}>{c.contribution.toFixed(4)}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Sans', color: '#8A7F70', fontSize: 11 }}>{c.meaning}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F7F4EE', borderTop: '2px solid #1A1009' }}>
                    <td colSpan={3} style={{ padding: '10px 12px', fontFamily: 'IBM Plex Sans', fontWeight: 700, color: '#1A1009' }}>Z′-Score Total</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 16, color: ZONE_CFG[z.zone]?.color }}>{z.z_score.toFixed(3)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Sans', color: ZONE_CFG[z.zone]?.color, fontWeight: 600 }}>{ZONE_CFG[z.zone]?.label}</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: '14px 0 0', fontSize: 11, color: '#C4BAA8', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>{z.model_note}</p>
            </div>
          </div>
        )}

        {/* Signals tab */}
        {tab === 'signals' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {warns.map((w, i) => {
              const cfg = SEV_CFG[w.severity] || SEV_CFG.positive;
              return (
                <div key={i} style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}`, padding: '14px 18px', borderRadius: '0 4px 4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', background: `${cfg.border}22`, color: cfg.color, padding: '2px 7px', borderRadius: 2, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{w.category}</span>
                      </div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: '#1A1009', fontFamily: 'IBM Plex Sans' }}>{w.signal}</p>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#3D3525', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>{w.detail}</p>
                      {w.action && <p style={{ margin: 0, fontSize: 12, color: cfg.color, fontFamily: 'IBM Plex Sans', fontWeight: 500 }}>→ {w.action}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
