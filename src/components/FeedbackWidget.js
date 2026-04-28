import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API from '../config';

const CATEGORIES = [
  { key: 'love',    label: '❤️ Love it',       color: '#C41E3A', bg: '#FCEEF1' },
  { key: 'general', label: '💬 General',        color: '#1E40AF', bg: '#EFF6FF' },
  { key: 'feature', label: '💡 Feature idea',   color: '#1B6535', bg: '#EAF6EE' },
  { key: 'bug',     label: '🐛 Report a bug',   color: '#B45309', bg: '#FEF3C7' },
];

const PROMPTS = {
  love:    'What do you love most about FinAnalyzer?',
  general: "What's on your mind? Any thoughts or suggestions?",
  feature: 'What feature would make this tool 10× more useful for you?',
  bug:     'What went wrong? Please describe what you expected vs. what happened.',
};

function Star({ filled, hovered, onClick, onEnter, onLeave, size = 28 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer', transition: 'transform 0.1s', transform: (filled || hovered) ? 'scale(1.15)' : 'scale(1)' }}
    >
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={(filled || hovered) ? '#F59E0B' : 'none'}
        stroke={(filled || hovered) ? '#F59E0B' : '#C4BAA8'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FeedbackWidget({ currentPage = '' }) {
  const [open,      setOpen]     = useState(false);
  const [rating,    setRating]   = useState(0);
  const [hovered,   setHovered]  = useState(0);
  const [category,  setCategory] = useState('general');
  const [message,   setMessage]  = useState('');
  const [email,     setEmail]    = useState('');
  const [loading,   setLoading]  = useState(false);
  const [submitted, setSubmitted]= useState(false);
  const [error,     setError]    = useState('');
  const modalRef  = useRef(null);
  const textaRef  = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus textarea when modal opens
  useEffect(() => {
    if (open && !submitted) setTimeout(() => textaRef.current?.focus(), 120);
  }, [open, submitted]);

  const reset = () => {
    setRating(0); setHovered(0); setCategory('general');
    setMessage(''); setEmail(''); setError(''); setSubmitted(false);
  };

  const submit = async () => {
    if (rating === 0)       { setError('Please give a star rating.'); return; }
    if (!message.trim())    { setError('Please write a message — even one sentence helps!'); return; }
    setError(''); setLoading(true);
    try {
      await axios.post(`${API}/feedback`, {
        rating, category, message: message.trim(),
        email: email.trim() || null,
        page: currentPage,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        title="Share feedback"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px',
          background: '#C41E3A', color: '#FFFFFF',
          border: 'none', borderRadius: 24,
          fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600,
          cursor: 'pointer', letterSpacing: '0.02em',
          boxShadow: '0 4px 20px rgba(196,30,58,0.45)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(196,30,58,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 4px 20px rgba(196,30,58,0.45)'; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Feedback
      </button>

      {/* Backdrop + Modal */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(26,16,9,0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: '100%', maxWidth: 480,
              background: '#FFFFFF', borderRadius: 8,
              boxShadow: '0 24px 80px rgba(26,16,9,0.3)',
              overflow: 'hidden',
              animation: 'fadeUp 0.2s ease',
            }}
          >
            {/* Header */}
            <div style={{ background: '#1A1009', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#C41E3A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FinAnalyzer</p>
                <h2 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: '#F7F4EE' }}>Share Your Feedback</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8A7F70', fontFamily: 'IBM Plex Sans' }}>Your input shapes what gets built next.</p>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#8A7F70', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {submitted ? (
              /* ── Thank-you state ── */
              <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <h3 style={{ margin: '0 0 8px', fontFamily: 'Playfair Display', fontSize: 22, color: '#1A1009' }}>Thank you!</h3>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8A7F70', fontFamily: 'IBM Plex Sans', lineHeight: 1.7 }}>
                  Your feedback has been recorded. Every response is read personally — it directly drives what gets improved.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { reset(); }}
                    style={{ padding: '9px 20px', background: '#F7F4EE', border: '1.5px solid #C4BAA8', borderRadius: 3, fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', color: '#3D3525' }}>
                    Submit another
                  </button>
                  <button onClick={() => setOpen(false)}
                    style={{ padding: '9px 20px', background: '#C41E3A', border: 'none', borderRadius: 3, fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer', color: '#FFF' }}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* ── Form ── */
              <div style={{ padding: '24px' }}>

                {/* Star rating */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Overall Rating
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n}
                        filled={n <= rating}
                        hovered={n <= hovered && n > rating}
                        onClick={() => setRating(n)}
                        onEnter={() => setHovered(n)}
                        onLeave={() => setHovered(0)}
                      />
                    ))}
                    {(hovered || rating) > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 13, fontFamily: 'IBM Plex Sans', color: '#F59E0B', fontWeight: 600 }}>
                        {ratingLabels[hovered || rating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Category chips */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Type
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat.key} onClick={() => setCategory(cat.key)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12,
                          fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${category === cat.key ? cat.color : '#E2DDD4'}`,
                          background: category === cat.key ? cat.bg : '#FFFFFF',
                          color: category === cat.key ? cat.color : '#8A7F70',
                          transition: 'all 0.12s',
                        }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Message
                  </label>
                  <textarea
                    ref={textaRef}
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={PROMPTS[category]}
                    maxLength={2000}
                    style={{
                      width: '100%', resize: 'vertical', minHeight: 100,
                      border: '1.5px solid #C4BAA8', borderRadius: 4,
                      padding: '10px 14px', fontSize: 13,
                      fontFamily: 'IBM Plex Sans', color: '#1A1009',
                      outline: 'none', lineHeight: 1.6,
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C41E3A'}
                    onBlur={e => e.target.style.borderColor = '#C4BAA8'}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: message.length > 1800 ? '#B45309' : '#C4BAA8' }}>
                      {message.length}/2000
                    </span>
                  </div>
                </div>

                {/* Email (optional) */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Email <span style={{ color: '#C4BAA8', textTransform: 'none', fontFamily: 'IBM Plex Sans', fontWeight: 400, fontSize: 11, letterSpacing: 0 }}>(optional — if you'd like a reply)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%', border: '1.5px solid #C4BAA8', borderRadius: 4,
                      padding: '9px 14px', fontSize: 13,
                      fontFamily: 'IBM Plex Sans', color: '#1A1009',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C41E3A'}
                    onBlur={e => e.target.style.borderColor = '#C4BAA8'}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FCEEF1', border: '1px solid #E8536A', borderLeft: '3px solid #C41E3A', borderRadius: '0 4px 4px 0', fontSize: 13, color: '#C41E3A', fontFamily: 'IBM Plex Sans' }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button onClick={submit} disabled={loading}
                  style={{
                    width: '100%', padding: '12px', background: loading ? '#C4BAA8' : '#C41E3A',
                    color: '#FFF', border: 'none', borderRadius: 4,
                    fontSize: 14, fontFamily: 'IBM Plex Sans', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                    transition: 'background 0.15s',
                  }}>
                  {loading ? 'Sending…' : 'Send Feedback →'}
                </button>

                <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 11, color: '#C4BAA8', fontFamily: 'IBM Plex Sans' }}>
                  Read personally · No spam · Used only to improve the product
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
