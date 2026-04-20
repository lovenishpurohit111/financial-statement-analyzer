import React, { useState } from 'react';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import AppNav from './components/AppNav';

export default function App() {
  const [page, setPage]       = useState('upload');
  const [results, setResults] = useState(null);

  const handleAnalysisDone = (data) => { setResults(data); setPage('dashboard'); };
  const handleReset        = () => { setResults(null); setPage('upload'); };

  return (
    <div style={{ minHeight:'100vh', background:'#F7F4EE' }}>
      <AppNav currentApp="fsa" />
      {page === 'upload'
        ? <UploadPage onAnalysisDone={handleAnalysisDone} />
        : <Dashboard results={results} onReset={handleReset} />
      }
    </div>
  );
}
