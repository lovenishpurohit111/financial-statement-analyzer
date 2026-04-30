import React, { useState } from 'react';
import UploadPage      from './components/UploadPage';
import Dashboard       from './components/Dashboard';
import AppNav          from './components/AppNav';
import FeedbackWidget  from './components/FeedbackWidget';
import ErrorBoundary   from './components/ErrorBoundary';

export default function App() {
  const [page,        setPage]       = useState('upload');
  const [results,     setResults]    = useState(null);
  const [sourceFiles, setSourceFiles]= useState({});
  const [industry,    setIndustry]   = useState('');

  const handleAnalysisDone = (data, files, ind) => {
    setResults(data);
    if (files) setSourceFiles(files);
    if (ind)   setIndustry(ind);
    setPage('dashboard');
  };
  const handleReset = () => { setResults(null); setPage('upload'); setIndustry(''); };

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', background: '#F7F4EE' }}>
        <AppNav currentApp="fsa" />
        {page === 'upload'
          ? <UploadPage onAnalysisDone={handleAnalysisDone} />
          : <Dashboard results={results} sourceFiles={sourceFiles} industry={industry} onReset={handleReset} />
        }
        <FeedbackWidget currentPage={page} />
      </div>
    </ErrorBoundary>
  );
}
