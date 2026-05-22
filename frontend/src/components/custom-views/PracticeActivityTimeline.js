import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function PracticeActivityTimeline({ candidateId }) {
  const [days, setDays] = useState(60);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    const qs = new URLSearchParams({ days: String(days) });
    if (candidateId) qs.set('candidate_id', String(candidateId));
    fetch(`${API}/custom-views/practice-timeline?${qs.toString()}`, { headers: h() })
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, [days, candidateId]);

  if (err) return <div style={{ color: '#e94560', padding: 20 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#888', padding: 20 }}>Loading timeline…</div>;

  const series = data.series || [];
  const maxV = Math.max(1, ...series.map(p => Math.max(p.interviews, p.submissions)));
  const W = 700, H = 220, padL = 40, padB = 30;
  const innerW = W - padL - 10;
  const innerH = H - padB - 10;
  const xStep = series.length > 1 ? innerW / (series.length - 1) : innerW;
  const xy = (i, v) => [padL + i * xStep, 10 + innerH - (v / maxV) * innerH];

  const interviewPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xy(i, p.interviews).join(' ')}`).join(' ');
  const submissionPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xy(i, p.submissions).join(' ')}`).join(' ');

  return (
    <div data-testid="practice-timeline" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ color: '#e94560', margin: 0 }}>Practice Activity Timeline</h3>
        <div>
          <label style={{ color: '#888', fontSize: 12, marginRight: 6 }}>Window</label>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
            style={{ background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, padding: '6px 10px' }}>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={120}>120 days</option>
            <option value={180}>180 days</option>
          </select>
        </div>
      </div>
      <p style={{ color: '#888', fontSize: 12 }}>
        Interviews: <span style={{ color: '#2ecc71' }}>{data.totals?.interviews ?? 0}</span> &nbsp;|&nbsp;
        Submissions: <span style={{ color: '#3498db' }}>{data.totals?.submissions ?? 0}</span>
      </p>
      {series.length === 0 ? (
        <div style={{ color: '#888', padding: '20px 0' }}>No activity in this window.</div>
      ) : (
        <svg width={W} height={H} style={{ background: '#0f1729', borderRadius: 8, maxWidth: '100%' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(g => {
            const y = 10 + innerH - g * innerH;
            return (
              <g key={g}>
                <line x1={padL} y1={y} x2={W - 10} y2={y} stroke="#0f3460" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} fontSize="10" fill="#888" textAnchor="end">{Math.round(g * maxV)}</text>
              </g>
            );
          })}
          <path d={interviewPath} fill="none" stroke="#2ecc71" strokeWidth="2" />
          <path d={submissionPath} fill="none" stroke="#3498db" strokeWidth="2" />
          {series.map((p, i) => {
            const [x1, y1] = xy(i, p.interviews);
            const [x2, y2] = xy(i, p.submissions);
            return (
              <g key={p.date}>
                <circle cx={x1} cy={y1} r="3" fill="#2ecc71" />
                <circle cx={x2} cy={y2} r="3" fill="#3498db" />
              </g>
            );
          })}
          {series.length > 1 && [0, Math.floor(series.length / 2), series.length - 1].map(i => {
            const [x] = xy(i, 0);
            return <text key={`x-${i}`} x={x} y={H - 8} fontSize="10" fill="#888" textAnchor="middle">{series[i].date.slice(5)}</text>;
          })}
        </svg>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: '#ccc', display: 'flex', gap: 16 }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2ecc71', marginRight: 6 }} />Interviews</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#3498db', marginRight: 6 }} />Submissions</span>
      </div>
    </div>
  );
}
