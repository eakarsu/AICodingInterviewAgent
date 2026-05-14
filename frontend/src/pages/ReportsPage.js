import React, { useState, useEffect } from 'react';
import { getReportSummary, getCandidatesCsv, getInterviewsCsv, getQuestionsCsv } from '../services/api';

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    setLoading(true);
    getReportSummary()
      .then(data => { setSummary(data); setError(''); })
      .catch(() => setError('Failed to load report summary'))
      .finally(() => setLoading(false));
  }, []);

  const downloadCsv = async (label, fetcher, filename) => {
    setDownloading(label);
    try {
      const text = await fetcher();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Download failed');
    }
    setDownloading('');
  };

  const counts = summary && (summary.counts || summary);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#fff', margin: 0 }}>📊 Reports</h1>
        <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Summary counts and CSV exports</p>
      </div>

      {error && <div style={{ padding: 12, background: 'rgba(233,69,96,0.1)', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {loading ? <div style={{ color: '#888' }}>Loading...</div> : counts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 30 }}>
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', marginBottom: 8 }}>{k.replace(/_/g, ' ')}</div>
              <div style={{ color: '#e94560', fontSize: 28, fontWeight: 'bold' }}>{typeof v === 'object' ? JSON.stringify(v) : v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: 16 }}>Exports</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => downloadCsv('candidates', getCandidatesCsv, 'candidates.csv')} disabled={downloading === 'candidates'} style={{ padding: '10px 18px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {downloading === 'candidates' ? 'Downloading...' : '⬇ candidates.csv'}
          </button>
          <button onClick={() => downloadCsv('interviews', getInterviewsCsv, 'interviews.csv')} disabled={downloading === 'interviews'} style={{ padding: '10px 18px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {downloading === 'interviews' ? 'Downloading...' : '⬇ interviews.csv'}
          </button>
          <button onClick={() => downloadCsv('questions', getQuestionsCsv, 'questions.csv')} disabled={downloading === 'questions'} style={{ padding: '10px 18px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {downloading === 'questions' ? 'Downloading...' : '⬇ questions.csv'}
          </button>
        </div>
      </div>
    </div>
  );
}
