import React, { useState } from 'react';

// URLs — both apps on Vercel
const APPS = {
  fsa: {
    name: 'Financial Statement Analyzer',
    short: 'FinAnalyzer',
    url: 'https://financial-statement-analyzer.vercel.app',
    icon: '📊',
    desc: 'Upload QuickBooks exports → P&L, Balance Sheet, Tax insights',
    color: '52,211,153',
  },
  cpd: {
    name: 'Client Profitability Dashboard',
    short: 'ProfitLens',
    url: 'https://client-profitability-dashboard.vercel.app',
    icon: '💰',
    desc: 'Upload transaction CSV → revenue, expenses, profit per client',
    color: '34,211,238',
  },
};

export default function AppNav({ currentApp }) {
  const [open, setOpen] = useState(false);
  const other = currentApp === 'fsa' ? APPS.cpd : APPS.fsa;
  const current = APPS[currentApp];

  return (
    <>
      {/* Persistent top strip */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(6,13,26,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(51,65,85,0.4)',
        padding: '0 16px', height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: current app */}
        <div className="flex items-center gap-2">
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: `linear-gradient(135deg,rgb(${current.color}),rgba(${current.color},0.6))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
          }}>
            {current.icon}
          </div>
          <span className="text-slate-400 text-xs font-mono">{current.short}</span>
          <span className="text-slate-700 text-xs">·</span>
          <span className="text-slate-600 text-xs">Part of FinSuite</span>
        </div>

        {/* Right: switch to other app */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: `rgba(${other.color},0.08)`,
              border: `1px solid rgba(${other.color},0.25)`,
              color: `rgb(${other.color})`,
            }}
          >
            <span>{other.icon}</span>
            <span>Switch to {other.short}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 36, right: 0, width: 300,
              background: '#0f172a', border: '1px solid #334155', borderRadius: 12,
              padding: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 200,
            }}>
              <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mb-3">FinSuite Apps</p>

              {Object.entries(APPS).map(([key, app]) => {
                const isCurrent = key === currentApp;
                return (
                  <div key={key}
                    onClick={() => { if (!isCurrent) window.open(app.url, '_blank'); setOpen(false); }}
                    className="flex items-start gap-3 p-3 rounded-xl mb-2 transition-all"
                    style={{
                      background: isCurrent ? `rgba(${app.color},0.08)` : 'rgba(30,41,59,0.4)',
                      border: `1px solid ${isCurrent ? `rgba(${app.color},0.3)` : '#1e293b'}`,
                      cursor: isCurrent ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                      background: `rgba(${app.color},0.12)`,
                      border: `1px solid rgba(${app.color},0.25)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {app.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold">{app.short}</p>
                        {isCurrent && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                            style={{ background:`rgba(${app.color},0.15)`, color:`rgb(${app.color})` }}>
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 leading-snug">{app.desc}</p>
                    </div>
                    {!isCurrent && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{color:'#475569',flexShrink:0,marginTop:2}}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                );
              })}

              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #1e293b'}}>
                <p className="text-slate-600 text-xs text-center">
                  Both apps share the same GitHub repo structure and are independently deployable on Vercel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer so content doesn't hide under nav */}
      <div style={{ height: 40 }} />
    </>
  );
}
