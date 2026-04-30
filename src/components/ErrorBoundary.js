import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }

  componentDidCatch(error, info) { this.setState({ error, info }); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', background: '#F7F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 580, width: '100%', background: '#FFFFFF', border: '1px solid #E2DDD4', borderTop: '4px solid #C41E3A', borderRadius: '0 0 6px 6px', padding: 36 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#C41E3A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Something went wrong</p>
          <h2 style={{ margin: '0 0 12px', fontFamily: 'Playfair Display', fontSize: 22, color: '#1A1009' }}>The app encountered an error</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.7 }}>
            This was an unexpected error. Your uploaded files are safe — click the button below to go back and try again.
          </p>
          <div style={{ background: '#F7F4EE', borderRadius: 4, padding: '12px 16px', marginBottom: 24, fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#C41E3A', wordBreak: 'break-word' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => { this.setState({ error: null, info: null }); window.location.reload(); }}
            style={{ padding: '11px 24px', background: '#C41E3A', color: '#FFF', border: 'none', borderRadius: 3, fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>
            ← Go Back & Retry
          </button>
        </div>
      </div>
    );
  }
}
