import React, { useState } from 'react';
import ShareModal from './ShareModal';

const APPS = {
  fsa: { short:'FinAnalyzer', url:'https://financial-statement-analyzer-jade.vercel.app',  icon:'📊', desc:'P&L · Balance Sheet · Tax insights', color:'#C41E3A' },
  cpd: { short:'ProfitLens',  url:'https://client-profitability-dashboard.vercel.app', icon:'💰', desc:'Client revenue · expenses · profit',   color:'#34d399' },
};

export default function AppNav({ currentApp }) {
  const [switchOpen, setSwitchOpen] = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);
  const other   = APPS[currentApp === 'fsa' ? 'cpd' : 'fsa'];
  const current = APPS[currentApp];

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#1A1009', borderBottom: '1px solid #3D3525',
        padding: '0 24px', height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#8A7F70', letterSpacing: '0.08em' }}>
            FINSUITE
          </span>
          <span style={{ color: '#3D3525' }}>·</span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#C41E3A', letterSpacing: '0.05em' }}>
            {current.short.toUpperCase()}
          </span>
        </div>

        {/* Right: share + switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Share button */}
          <button
            onClick={() => setShareOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px',
              background: 'rgba(27,101,53,0.15)',
              border: '1px solid #1B6535',
              borderRadius: 2, color: '#4ADE80',
              fontSize: 12, fontFamily: 'IBM Plex Sans',
              fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.02em', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,101,53,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(27,101,53,0.15)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>

          {/* App switcher */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setSwitchOpen(!switchOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'transparent', border: '1px solid #3D3525', borderRadius: 2, color: '#C4BAA8', fontSize: 12, fontFamily: 'IBM Plex Sans', cursor: 'pointer', letterSpacing: '0.02em' }}>
              {other.icon} Switch to {other.short}
              <span style={{ fontSize: 8, marginLeft: 2 }}>▼</span>
            </button>

            {switchOpen && (
              <div style={{ position: 'absolute', top: 36, right: 0, width: 280, background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: '3px solid #C41E3A', boxShadow: '0 8px 32px rgba(26,16,9,0.15)', zIndex: 200 }}>
                {Object.entries(APPS).map(([key, app]) => {
                  const isCurrent = key === currentApp;
                  return (
                    <div key={key}
                      onClick={() => { if (!isCurrent) window.open(app.url, '_blank'); setSwitchOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #EDE9DF', cursor: isCurrent ? 'default' : 'pointer', background: isCurrent ? '#FAF8F4' : '#FFFFFF', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#FAF8F4'; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = '#FFFFFF'; }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: isCurrent ? '#F7F4EE' : '#FFF', border: `1.5px solid ${app.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{app.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 13, color: '#1A1009' }}>{app.short}</span>
                          {isCurrent && <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8A7F70', background: '#EDE9DF', padding: '1px 6px', borderRadius: 2 }}>CURRENT</span>}
                        </div>
                        <p style={{ fontSize: 11, color: '#8A7F70', margin: '2px 0 0', fontFamily: 'IBM Plex Sans' }}>{app.desc}</p>
                      </div>
                      {!isCurrent && <span style={{ color: '#C4BAA8', fontSize: 12 }}>↗</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share modal */}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
