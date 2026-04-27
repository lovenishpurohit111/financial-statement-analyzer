import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import API from '../config';

const SUGGESTIONS = [
  'What is my net profit margin?',
  'How can I improve profitability?',
  'What is my current ratio?',
  'Am I at risk of financial distress?',
  'What is my estimated tax liability?',
  'What is my business worth?',
  'Which expenses are highest?',
  'What is my monthly burn rate?',
  'How does my gross margin compare to industry?',
  'What are my biggest financial risks?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const renderAnswer = (text) => {
    // Process **bold**, bullet points, numbered lists
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      const bold = (t) => t.split(/\*\*(.+?)\*\*/g).map((p, j) =>
        j % 2 === 1 ? <strong key={j} style={{ color: '#1A1009', fontWeight: 700 }}>{p}</strong> : p
      );
      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, marginTop: 4 }}>
            <span style={{ width: 20, height: 20, background: '#1A1009', color: '#F7F4EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2, fontFamily: 'IBM Plex Mono' }}>{numMatch[1]}</span>
            <span style={{ fontSize: 13, lineHeight: 1.6, color: '#3D3525', fontFamily: 'IBM Plex Sans' }}>{bold(numMatch[2])}</span>
          </div>
        );
      }
      // Bullet
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <span style={{ color: '#C41E3A', fontSize: 14, marginTop: 1 }}>•</span>
            <span style={{ fontSize: 13, lineHeight: 1.6, color: '#3D3525', fontFamily: 'IBM Plex Sans' }}>{bold(line.slice(2))}</span>
          </div>
        );
      }
      return <p key={i} style={{ margin: '0 0 6px', fontSize: 13, lineHeight: 1.7, color: '#3D3525', fontFamily: 'IBM Plex Sans' }}>{bold(line)}</p>;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 12, marginBottom: 18 }}>
      {/* Avatar */}
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: isUser ? '#1A1009' : '#C41E3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: '#F7F4EE', fontWeight: 700, fontFamily: 'IBM Plex Mono' }}>
        {isUser ? 'U' : '📊'}
      </div>
      {/* Bubble */}
      <div style={{
        maxWidth: '78%', padding: '12px 16px', borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
        background: isUser ? '#1A1009' : '#FFFFFF', border: isUser ? 'none' : '1px solid #E2DDD4',
        boxShadow: '0 1px 3px rgba(26,16,9,0.08)',
      }}>
        {isUser
          ? <p style={{ margin: 0, fontSize: 13, color: '#F7F4EE', fontFamily: 'IBM Plex Sans', lineHeight: 1.6 }}>{msg.content}</p>
          : <div>{renderAnswer(msg.content)}</div>
        }
        {msg.thinking && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, padding: '6px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4BAA8', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIChatPanel({ results }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm your financial analyst. I have full access to your uploaded financial data and can answer questions about your revenue, profit, expenses, risk, taxes, valuation, and more.\n\nWhat would you like to know?",
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const pl      = results?.pl_analysis    || (results?.analysis?.type === 'pl' ? results.analysis : null);
  const bs      = results?.bs_current     || (results?.analysis?.type === 'bs' ? results.analysis : null);
  const tax     = results?.tax;
  const monthly = results?.monthly_data;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: question };
    const thinkingMsg = { role: 'assistant', content: '', thinking: true };
    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    setLoading(true);

    try {
      const r = await axios.post(`${API}/chat`, {
        question,
        pl_data:     pl?.type === 'pl' ? pl : null,
        bs_data:     bs?.type === 'bs' ? bs : null,
        tax_data:    tax?.tax != null ? tax : null,
        monthly_data: monthly || null,
      });
      setMessages(prev => [
        ...prev.filter(m => !m.thinking),
        { role: 'assistant', content: r.data.answer },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev.filter(m => !m.thinking),
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! Ask me anything about your financial data.",
    }]);
  };

  const hasData = !!(pl || bs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 660, background: '#FFFFFF', border: '1px solid #E2DDD4', borderRadius: 4, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#1A1009', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#C41E3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#F7F4EE', fontFamily: 'IBM Plex Sans' }}>Financial AI Analyst</p>
            <p style={{ margin: 0, fontSize: 11, color: '#8A7F70', fontFamily: 'IBM Plex Mono' }}>
              {hasData
                ? `Loaded: ${[pl && 'P&L', bs && 'Balance Sheet', tax?.tax && 'Tax', monthly && 'Monthly'].filter(Boolean).join(' · ')}`
                : 'No data loaded — upload a file first'}
            </p>
          </div>
        </div>
        <button onClick={clearChat}
          style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#8A7F70', background: 'transparent', border: '1px solid #3D3525', borderRadius: 2, padding: '4px 10px', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {/* Suggestion chips — only when chat is fresh */}
      {messages.length <= 1 && (
        <div style={{ padding: '12px 16px', background: '#FAF8F4', borderBottom: '1px solid #EDE9DF', flexShrink: 0 }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontFamily: 'IBM Plex Mono', color: '#8A7F70', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick questions</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.slice(0, 8).map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                style={{ padding: '5px 12px', background: '#FFFFFF', border: '1.5px solid #C4BAA8', borderRadius: 20, fontSize: 11, fontFamily: 'IBM Plex Sans', color: '#3D3525', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.target.style.borderColor = '#C41E3A'; e.target.style.color = '#C41E3A'; }}
                onMouseLeave={e => { e.target.style.borderColor = '#C4BAA8'; e.target.style.color = '#3D3525'; }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 10px' }}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E2DDD4', background: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={hasData ? "Ask me about your financials… (Enter to send)" : "Upload a financial file first, then ask questions here…"}
            disabled={loading}
            rows={2}
            style={{ flex: 1, border: '1.5px solid #C4BAA8', borderRadius: 3, padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Sans', resize: 'none', outline: 'none', lineHeight: 1.5, background: loading ? '#F7F4EE' : '#FFFFFF', color: '#1A1009' }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ padding: '10px 18px', background: input.trim() && !loading ? '#C41E3A' : '#C4BAA8', color: '#FFFFFF', border: 'none', borderRadius: 3, fontSize: 13, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'background 0.15s', height: 56 }}>
            {loading ? '…' : '↑ Send'}
          </button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#C4BAA8', fontFamily: 'IBM Plex Mono', textAlign: 'center' }}>
          Answers are based on your uploaded financial data · Not professional financial advice
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
