import React, { useState, useEffect } from 'react';

const APP_URL  = 'https://financial-statement-analyzer.vercel.app';
const APP_NAME = 'FinAnalyzer';
const TAGLINE  = 'Free financial statement analyzer — upload a QuickBooks export and instantly get profit margins, risk scores, industry benchmarks, and a CFO-quality report.';

const SHARE_CHANNELS = [
  {
    key:   'twitter',
    label: 'X / Twitter',
    icon:  (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: '#000000',
    bg:    '#F7F4EE',
    getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`📊 Just used ${APP_NAME} to analyze my financials in seconds — free tool for QuickBooks exports. Profit margins, risk score, industry benchmarks + written report.\n\nTry it: ${APP_URL}`)}`,
  },
  {
    key:   'linkedin',
    label: 'LinkedIn',
    icon:  (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
    color: '#0A66C2',
    bg:    '#EFF6FF',
    getUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(APP_URL)}`,
  },
  {
    key:   'reddit',
    label: 'Reddit',
    icon:  (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <path fill="white" d="M17.56 12a1.2 1.2 0 0 0-2.02-.9 5.88 5.88 0 0 0-3.17-.85l.54-2.52 1.75.37a.85.85 0 1 0 .87-.88.84.84 0 0 0-.78.52l-1.96-.41a.15.15 0 0 0-.17.1l-.6 2.82a5.88 5.88 0 0 0-3.19.85 1.2 1.2 0 1 0-1.32 1.96 2.35 2.35 0 0 0 0 .3c0 1.53 1.78 2.77 3.98 2.77s3.98-1.24 3.98-2.77c0-.1 0-.2-.02-.3a1.2 1.2 0 0 0 .71-1.06zm-5.56 2.5c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zm2.31.9a2.87 2.87 0 0 1-2.31.6 2.87 2.87 0 0 1-2.31-.6.15.15 0 0 1 .2-.22 2.56 2.56 0 0 0 2.11.47 2.56 2.56 0 0 0 2.11-.47.15.15 0 1 1 .2.22zm-.11-.9a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z"/>
      </svg>
    ),
    color: '#FF4500',
    bg:    '#FFF1EC',
    getUrl: () => `https://reddit.com/submit?url=${encodeURIComponent(APP_URL)}&title=${encodeURIComponent(`I built a free financial statement analyzer for QuickBooks exports — feedback welcome!`)}`,
  },
  {
    key:   'whatsapp',
    label: 'WhatsApp',
    icon:  (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: '#25D366',
    bg:    '#EAFAF1',
    getUrl: () => `https://wa.me/?text=${encodeURIComponent(`📊 Check out ${APP_NAME} — free tool to analyze QuickBooks exports instantly. Profit margins, risk score, benchmarks + written report: ${APP_URL}`)}`,
  },
  {
    key:   'email',
    label: 'Email',
    icon:  (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    color: '#8A7F70',
    bg:    '#F7F4EE',
    getUrl: () => `mailto:?subject=${encodeURIComponent(`Check out ${APP_NAME} — free financial analyzer`)}&body=${encodeURIComponent(`Hi,\n\nI thought you might find this useful — ${APP_NAME} is a free tool that analyzes QuickBooks exports in seconds.\n\nYou get:\n• Profit margins & financial ratios\n• Industry benchmark comparison (15 sectors)\n• Risk score (Altman Z-Score)\n• Cash runway & burn rate\n• Written CFO-quality report\n• AI financial chat on your own data\n\nTry it here: ${APP_URL}\n\nSample files are included on the page so you can test without uploading your own data.`)}`,
  },
];

export default function ShareModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback — select text
      const el = document.getElementById('share-url-input');
      el?.select();
    }
  };

  const openChannel = (channel) => {
    window.open(channel.getUrl(), '_blank', 'noopener,noreferrer');
  };

  if (!open) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(26,16,9,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#FFFFFF', borderRadius: 8,
        boxShadow: '0 24px 80px rgba(26,16,9,0.3)',
        overflow: 'hidden',
        animation: 'fadeUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ background: '#1A1009', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#1B6535', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Help others discover</p>
            <h2 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: '#F7F4EE' }}>Share FinAnalyzer</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>Free tool — no sign-up, no credit card.</p>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8A7F70', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Copy link */}
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Direct Link
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input
              id="share-url-input"
              readOnly
              value={APP_URL}
              style={{
                flex: 1, border: '1.5px solid #C4BAA8', borderRadius: 4,
                padding: '9px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono',
                color: '#3D3525', background: '#F7F4EE', outline: 'none',
              }}
              onFocus={e => e.target.select()}
            />
            <button onClick={copyLink}
              style={{
                padding: '9px 18px', borderRadius: 4, fontSize: 13,
                fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer',
                border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
                background: copied ? '#1B6535' : '#1A1009',
                color: '#F7F4EE',
              }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          {/* Social channels */}
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Share on
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SHARE_CHANNELS.map(ch => (
              <button key={ch.key} onClick={() => openChannel(ch)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', background: ch.bg,
                  border: `1.5px solid ${ch.color}33`, borderRadius: 6,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = ch.color; e.currentTarget.style.background = ch.bg; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${ch.color}33`; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ color: ch.color, flexShrink: 0 }}>{ch.icon}</span>
                <span style={{ fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, color: '#1A1009' }}>{ch.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#C4BAA8' }}>↗</span>
              </button>
            ))}
          </div>

          {/* Blurb for easy copy-paste */}
          <div style={{ marginTop: 20, background: '#F7F4EE', borderRadius: 4, padding: '14px 16px', border: '1px solid #E2DDD4' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ready-to-paste description</p>
            <p style={{ margin: 0, fontSize: 12, color: '#3D3525', fontFamily: 'IBM Plex Sans', lineHeight: 1.7 }}>{TAGLINE}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
