import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../config';

const RATING_CFG = {
  excellent: { color: '#1B6535', bg: '#EAF6EE', label: 'Excellent', icon: '★' },
  good:      { color: '#1E40AF', bg: '#EFF6FF', label: 'Good',      icon: '✓' },
  average:   { color: '#B45309', bg: '#FEF3C7', label: 'Average',   icon: '~' },
  poor:      { color: '#C41E3A', bg: '#FCEEF1', label: 'Below Avg', icon: '✗' },
};

const fmt = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n ?? 0);

function PercentileBar({ value, rating }) {
  const cfg = RATING_CFG[rating] || RATING_CFG.average;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div style={{ flex: 1, height: 6, background: '#EDE9DF', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: `${value}%`, height: '100%', background: cfg.color,
          borderRadius: 3, transition: 'width 0.8s ease',
        }} />
        {/* Peer median marker at 50th pct */}
        <div style={{ position: 'absolute', left: '50%', top: -2, width: 2, height: 10, background: '#8A7F70', borderRadius: 1 }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: cfg.color, fontWeight: 700, minWidth: 42, textAlign: 'right' }}>
        {value}th
      </span>
    </div>
  );
}

function MetricRow({ comp }) {
  const cfg = RATING_CFG[comp.rating] || RATING_CFG.average;
  const unit = comp.unit;
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid #EDE9DF', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1009', fontFamily: 'IBM Plex Sans' }}>{comp.metric}</span>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', background: cfg.bg, color: cfg.color, padding: '2px 7px', borderRadius: 2, fontWeight: 700, letterSpacing: '0.06em' }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <PercentileBar value={comp.percentile} rating={comp.rating} />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 16, color: cfg.color }}>
            {fmt(comp.your_value)}{unit}
          </div>
          <div style={{ fontSize: 10, color: '#8A7F70', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>
            your value
          </div>
        </div>
      </div>
      {/* Benchmark scale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginTop: 8 }}>
        {[
          { label: 'Poor',      val: comp.industry_poor,      color: '#C41E3A' },
          { label: 'Average',   val: comp.industry_average,   color: '#B45309' },
          { label: 'Good',      val: comp.industry_good,      color: '#1E40AF' },
          { label: 'Excellent', val: comp.industry_excellent, color: '#1B6535' },
        ].map((t, i) => (
          <div key={i} style={{ background: '#F7F4EE', padding: '5px 8px', borderRadius: 3, borderLeft: `2px solid ${t.color}` }}>
            <div style={{ fontSize: 9, color: '#8A7F70', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.label}</div>
            <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: t.color }}>{fmt(t.val)}{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BenchmarkPanel({ results, industry: defaultIndustry }) {
  const [industries, setIndustries]   = useState([]);
  const [selected,   setSelected]     = useState('');
  const [benchData,  setBenchData]    = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState(null);

  const pl = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);

  useEffect(() => {
    axios.get(`${API}/benchmarks/industries`)
      .then(r => setIndustries(r.data.industries || []))
      .catch(() => {});
  }, []);

  // Auto-run if industry pre-selected from upload page
  useEffect(() => {
    if (defaultIndustry && !selected) { setSelected(defaultIndustry); runBenchmark(defaultIndustry); }
  }, [defaultIndustry]);

  const runBenchmark = async (key) => {
    if (!key) return;
    setLoading(true); setError(null); setBenchData(null);
    try {
      const r = await axios.post(`${API}/benchmarks/compare`, {
        industry_key: key,
        pl_data: pl?.type === 'pl' ? pl : null,
        bs_data: bs?.type === 'bs' ? bs : null,
      });
      setBenchData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Benchmark comparison failed.');
    } finally { setLoading(false); }
  };

  const handleSelect = (k) => { setSelected(k); runBenchmark(k); };

  const overall = benchData ? RATING_CFG[benchData.overall_rating] || RATING_CFG.average : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Industry selector */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: '3px solid #1A1009', borderRadius: '0 0 4px 4px', padding: 24 }}>
        <h2 className="headline" style={{ fontSize: 20, margin: '0 0 6px' }}>Industry Benchmark Comparison</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>
          Compare your financial ratios against real industry medians from 15 sectors.
          Select your industry to see where you stand relative to peers.
        </p>
        <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Select Industry
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {industries.map(ind => (
            <button key={ind.key} onClick={() => handleSelect(ind.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: selected === ind.key ? '#1A1009' : '#F7F4EE',
                border: `1.5px solid ${selected === ind.key ? '#1A1009' : '#C4BAA8'}`,
                borderRadius: 3, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 16 }}>{ind.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: selected === ind.key ? '#F7F4EE' : '#1A1009', fontFamily: 'IBM Plex Sans' }}>{ind.name}</div>
                <div style={{ fontSize: 10, color: selected === ind.key ? '#8A7F70' : '#8A7F70', fontFamily: 'IBM Plex Sans' }}>{ind.description.slice(0, 38)}…</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #EDE9DF', borderTop: '2px solid #C41E3A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#8A7F70', fontFamily: 'IBM Plex Sans', fontSize: 13 }}>Comparing against industry benchmarks…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#FCEEF1', border: '1px solid #E8536A', borderLeft: '3px solid #C41E3A', padding: '14px 18px', borderRadius: '0 4px 4px 0', color: '#C41E3A', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {benchData && !loading && (
        <>
          {/* Overall rating */}
          <div style={{ background: '#1A1009', color: '#F7F4EE', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                vs {benchData.industry}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 36, fontWeight: 600, color: overall?.color }}>
                  {benchData.average_percentile}th
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: '#8A7F70' }}>percentile</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: overall?.color, fontFamily: 'IBM Plex Sans', fontWeight: 600 }}>
                {overall?.icon} {overall?.label} — {benchData.overall_rating.toUpperCase()} overall
              </p>
            </div>
            <div style={{ maxWidth: 400, fontSize: 12, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.7 }}>
              {benchData.industry_notes}
            </div>
          </div>

          {/* Metrics table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '2px solid #1A1009', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="headline" style={{ fontSize: 16, margin: 0 }}>Metric-by-Metric Comparison</h3>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70' }}>
                Marker ▏= industry median (50th pct)
              </div>
            </div>
            {benchData.comparisons.map((comp, i) => (
              <MetricRow key={i} comp={comp} />
            ))}
          </div>

          {/* Category summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 10 }}>
            {Object.entries(
              benchData.comparisons.reduce((acc, c) => {
                acc[c.rating] = (acc[c.rating] || 0) + 1; return acc;
              }, {})
            ).map(([rating, count]) => {
              const cfg = RATING_CFG[rating] || RATING_CFG.average;
              return (
                <div key={rating} style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, borderTop: `2px solid ${cfg.color}`, padding: '12px 14px', borderRadius: '0 0 4px 4px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'IBM Plex Mono', color: cfg.color }}>{count}</div>
                  <div style={{ fontSize: 11, color: cfg.color, fontFamily: 'IBM Plex Sans', fontWeight: 600 }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!benchData && !loading && !error && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', padding: '60px 40px', textAlign: 'center', borderRadius: 4 }}>
          <p style={{ fontSize: 42, marginBottom: 12 }}>🎯</p>
          <p style={{ fontWeight: 600, color: '#1A1009', fontFamily: 'IBM Plex Sans', margin: '0 0 6px' }}>Select your industry above</p>
          <p style={{ color: '#8A7F70', fontSize: 13, margin: 0, fontFamily: 'IBM Plex Sans' }}>
            We'll compare your key financial ratios against real sector benchmarks across 15 industries.
          </p>
        </div>
      )}
    </div>
  );
}
