import React, { useState } from 'react';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [files, setFiles]     = useState({ pl: null, bsCurrent: null, bsPrevious: null });
  const [results, setResults] = useState(null);
  const [page, setPage]       = useState('upload'); // 'upload' | 'dashboard'

  const handleAnalysisDone = (data) => {
    setResults(data);
    setPage('dashboard');
  };

  const handleReset = () => {
    setFiles({ pl: null, bsCurrent: null, bsPrevious: null });
    setResults(null);
    setPage('upload');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#060d1a 0%,#0a1628 60%,#060d1a 100%)' }}>
      {/* Ambient blobs */}
      <div style={{ position:'fixed', top:'-15%', right:'-10%', width:600, height:600, background:'radial-gradient(circle,rgba(52,211,153,0.06) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'-20%', left:'-10%', width:500, height:500, background:'radial-gradient(circle,rgba(34,211,238,0.05) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'relative', zIndex:1 }}>
        {page === 'upload'
          ? <UploadPage onAnalysisDone={handleAnalysisDone} />
          : <Dashboard results={results} onReset={handleReset} />
        }
      </div>
    </div>
  );
}
