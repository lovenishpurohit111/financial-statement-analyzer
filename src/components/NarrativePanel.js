import React, { useState } from 'react';
import axios from 'axios';
import API from '../config';

export default function NarrativePanel({ results }) {
  const [report,       setReport]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [companyName,  setCompanyName]  = useState('');
  const [industry,     setIndustry]     = useState('');
  const [riskData,     setRiskData]     = useState(null);
  const [benchData,    setBenchData]    = useState(null);

  const pl  = results?.pl_analysis || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs  = results?.bs_current  || (results?.analysis?.type === 'bs' ? results.analysis : null);
  const tax = results?.tax;

  const generate = async () => {
    setLoading(true); setError(null); setReport(null);

    // Optionally fetch risk data if not already available
    let rd = riskData;
    if (!rd && (pl || bs)) {
      try {
        const r = await axios.post(`${API}/risk/assess`, {
          pl_data: pl?.type === 'pl' ? pl : null,
          bs_data: bs?.type === 'bs' ? bs : null,
        });
        rd = r.data; setRiskData(rd);
      } catch (_) {}
    }

    try {
      const r = await axios.post(`${API}/narrative`, {
        pl_data:        pl?.type === 'pl' ? pl : null,
        bs_data:        bs?.type === 'bs' ? bs : null,
        benchmark_data: benchData || null,
        risk_data:      rd || null,
        tax_data:       tax?.tax != null ? tax : null,
        company_name:   companyName || 'Your Company',
        period:         pl?.period || bs?.period || '',
        industry:       industry,
      });
      setReport(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Report generation failed.');
    } finally { setLoading(false); }
  };

  const copyReport = () => {
    if (!report) return;
    const text = report.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const printReport = () => window.print();

  const inp = {
    width: '100%', border: '1.5px solid #C4BAA8', borderRadius: 2, padding: '9px 12px',
    fontSize: 13, fontFamily: 'IBM Plex Sans', color: '#1A1009', outline: 'none', background: '#FFFFFF',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Config panel */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: '3px solid #1A1009', padding: 24, borderRadius: '0 0 4px 4px' }}>
        <h2 className="headline" style={{ fontSize: 20, margin: '0 0 6px' }}>AI Narrative Report</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>
          Generate a CFO-quality written analysis of your financials — suitable for board presentations, investor updates, or internal reviews.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Company / Business Name
            </label>
            <input style={inp} placeholder="Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Industry (optional — improves context)
            </label>
            <input style={inp} placeholder="e.g. SaaS, Healthcare, Retail" value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>
        </div>

        {/* What's included */}
        <div style={{ background: '#F7F4EE', borderRadius: 3, padding: '14px 18px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report will include:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 8 }}>
            {[
              { icon: '📋', text: 'Executive Summary' },
              { icon: '📊', text: 'Revenue & Profitability Analysis', avail: !!pl },
              { icon: '🏦', text: 'Balance Sheet Analysis', avail: !!bs },
              { icon: '⚠️', text: 'Risk Assessment (Altman Z-Score)', avail: !!(pl && bs) },
              { icon: '🧾', text: 'Tax Estimate Commentary', avail: !!(tax?.tax) },
              { icon: '🚀', text: 'Strategic Recommendations' },
              { icon: '⚖️', text: 'Professional Disclaimer' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontFamily: 'IBM Plex Sans', color: item.avail === false ? '#C4BAA8' : '#3D3525' }}>
                  {item.text}
                  {item.avail === false && <span style={{ fontSize: 10, color: '#C4BAA8', marginLeft: 4 }}>(no data)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading || (!pl && !bs)}
          style={{ padding: '12px 28px', background: loading ? '#C4BAA8' : '#C41E3A', color: '#FFF', border: 'none', borderRadius: 2, fontSize: 14, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
          {loading ? 'Generating Report…' : 'GENERATE NARRATIVE REPORT →'}
        </button>

        {!pl && !bs && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#B45309', fontFamily: 'IBM Plex Sans' }}>
            ⚠ Upload at least one financial file to generate a report.
          </p>
        )}
      </div>

      {error && (
        <div style={{ background: '#FCEEF1', border: '1px solid #C41E3A', padding: 16, borderRadius: 4, color: '#C41E3A', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 40, height: 40, border: '2px solid #EDE9DF', borderTop: '2px solid #C41E3A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#8A7F70', fontFamily: 'IBM Plex Sans', fontSize: 14 }}>Generating CFO-quality narrative report…</p>
          <p style={{ color: '#C4BAA8', fontFamily: 'IBM Plex Mono', fontSize: 11, marginTop: 6 }}>Analysing financials · Drafting insights · Applying risk models</p>
        </div>
      )}

      {/* Report output */}
      {report && !loading && (
        <div style={{ border: '1px solid #E2DDD4', borderRadius: 4, overflow: 'hidden' }} id="narrative-report">
          {/* Report header */}
          <div style={{ background: '#1A1009', padding: '32px 40px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#C41E3A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Financial Analysis Report
            </p>
            <h1 style={{ margin: '0 0 8px', fontFamily: 'Playfair Display', fontSize: 28, color: '#F7F4EE', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {report.company_name}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>
              {report.period && `Period: ${report.period} · `}Generated: {report.generated}
              {report.industry && ` · Industry: ${report.industry}`}
            </p>
          </div>

          {/* Action bar */}
          <div style={{ background: '#F7F4EE', borderBottom: '1px solid #E2DDD4', padding: '12px 24px', display: 'flex', gap: 10 }}>
            <button onClick={copyReport}
              style={{ padding: '6px 16px', background: '#FFFFFF', border: '1.5px solid #C4BAA8', borderRadius: 2, fontSize: 12, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', color: '#3D3525', letterSpacing: '0.03em' }}>
              📋 Copy as Markdown
            </button>
            <button onClick={printReport}
              style={{ padding: '6px 16px', background: '#FFFFFF', border: '1.5px solid #C4BAA8', borderRadius: 2, fontSize: 12, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', color: '#3D3525', letterSpacing: '0.03em' }}>
              🖨️ Print / Save PDF
            </button>
          </div>

          {/* Sections */}
          <div style={{ background: '#FFFFFF' }}>
            {report.sections.map((section, i) => {
              const isDisclaimer = section.title.includes('Disclaimer');
              const isRisk = section.title.includes('Risk');
              const borderColor = isDisclaimer ? '#8A7F70' : isRisk ? '#C41E3A' : '#1A1009';
              return (
                <div key={i} style={{ borderBottom: '1px solid #EDE9DF', padding: '28px 40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 3, height: 24, background: borderColor, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{section.icon}</span>
                      <h2 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 700, color: '#1A1009', letterSpacing: '-0.01em' }}>
                        {section.title}
                      </h2>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#3D3525', fontFamily: 'IBM Plex Sans', lineHeight: 1.85 }}>
                    {section.content.split('\n\n').map((para, pi) => {
                      // Handle numbered lists
                      if (/^\d+\./.test(para.trim())) {
                        return para.split('\n').filter(Boolean).map((line, li) => {
                          const match = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
                          if (match) {
                            return (
                              <div key={li} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A1009', color: '#F7F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{match[1]}</div>
                                <p style={{ margin: 0, lineHeight: 1.7 }}>
                                  <strong style={{ color: '#1A1009' }}>{match[2]}:</strong>{' '}{match[3]}
                                </p>
                              </div>
                            );
                          }
                          return <p key={li} style={{ margin: '0 0 8px' }}>{line}</p>;
                        });
                      }
                      // Render inline bold: **text**
                      const renderBold = (text) => {
                        const parts = text.split(/\*\*(.+?)\*\*/g);
                        return parts.map((part, idx) =>
                          idx % 2 === 1 ? <strong key={idx} style={{ color: '#1A1009', fontWeight: 600 }}>{part}</strong> : part
                        );
                      };
                      return (
                        <p key={pi} style={{ margin: '0 0 14px', color: isDisclaimer ? '#8A7F70' : '#3D3525', fontSize: isDisclaimer ? 12 : 14, fontStyle: isDisclaimer ? 'italic' : 'normal' }}>
                          {renderBold(para)}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
