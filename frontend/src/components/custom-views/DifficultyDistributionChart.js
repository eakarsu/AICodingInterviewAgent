import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const COLORS = {
  easy: '#2ecc71',
  medium: '#f39c12',
  hard: '#e94560',
  unknown: '#666',
};

export default function DifficultyDistributionChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch(`${API}/custom-views/difficulty-distribution`, { headers: h() })
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#e94560', padding: 20 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#888', padding: 20 }}>Loading distribution…</div>;
  if (data.error) return <div style={{ color: '#e94560', padding: 20 }}>{data.error}</div>;

  const buckets = data.buckets || [];
  const max = Math.max(1, ...buckets.map(b => b.count));
  const W = 540, H = 260, padL = 50, padB = 30, padT = 16;
  const barW = buckets.length ? (W - padL - 20) / buckets.length - 18 : 50;

  return (
    <div data-testid="difficulty-distribution-chart" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Question Difficulty Distribution</h3>
      <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>
        Total questions in pool: <strong style={{ color: '#fff' }}>{data.total_questions}</strong>
      </p>

      <svg width={W} height={H} style={{ background: '#0f1729', borderRadius: 8, maxWidth: '100%' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => {
          const y = padT + (H - padT - padB) - g * (H - padT - padB);
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - 10} y2={y} stroke="#0f3460" strokeDasharray="3,3" />
              <text x={padL - 6} y={y + 3} fontSize="10" fill="#888" textAnchor="end">{Math.round(g * max)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const x = padL + 10 + i * (barW + 18);
          const bh = (b.count / max) * (H - padT - padB);
          const y = (H - padB) - bh;
          const color = COLORS[b.difficulty] || COLORS.unknown;
          return (
            <g key={b.difficulty}>
              <rect x={x} y={y} width={barW} height={bh} fill={color} rx="4" />
              <text x={x + barW / 2} y={y - 6} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="600">{b.count}</text>
              <text x={x + barW / 2} y={H - 10} fontSize="11" fill="#ccc" textAnchor="middle">{b.difficulty}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
        {buckets.map(b => (
          <div key={b.difficulty} style={{ flex: '1 1 120px', background: '#0f3460', padding: 12, borderRadius: 8 }}>
            <div style={{ color: COLORS[b.difficulty] || '#ccc', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{b.difficulty}</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{b.count}</div>
            <div style={{ color: '#888', fontSize: 11 }}>{b.pct}% of pool</div>
          </div>
        ))}
      </div>

      {data.usage && data.usage.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ color: '#ccc', fontSize: 13, margin: '0 0 8px' }}>Submission performance by difficulty</h4>
          <table style={{ width: '100%', color: '#ccc', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460' }}>
                <th style={{ textAlign: 'left', padding: 6 }}>Difficulty</th>
                <th style={{ textAlign: 'right', padding: 6 }}>Submissions</th>
                <th style={{ textAlign: 'right', padding: 6 }}>Avg score</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map(u => (
                <tr key={u.difficulty} style={{ borderBottom: '1px solid #0f3460' }}>
                  <td style={{ padding: 6, color: COLORS[u.difficulty] || '#ccc' }}>{u.difficulty}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{u.submissions}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{u.avg_score == null ? '—' : u.avg_score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
