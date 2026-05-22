import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function SkillRadarChart({ candidateId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!candidateId) return;
    setData(null);
    setErr(null);
    fetch(`${API}/custom-views/skill-radar/${candidateId}`, { headers: h() })
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, [candidateId]);

  if (!candidateId) return <div style={{ color: '#888', padding: 20 }}>Select a candidate to see their skill radar.</div>;
  if (err) return <div style={{ color: '#e94560', padding: 20 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#888', padding: 20 }}>Loading radar…</div>;
  if (data.error) return <div style={{ color: '#e94560', padding: 20 }}>{data.error}</div>;

  const axes = data.axes || [];
  const n = Math.max(axes.length, 3);
  const cx = 180, cy = 180, R = 140;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, value) => {
    const r = (Math.max(0, Math.min(10, value)) / 10) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };

  const rings = [2, 4, 6, 8, 10];

  return (
    <div data-testid="skill-radar" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Skill Radar — {data.candidate?.name}</h3>
      <p style={{ color: '#888', fontSize: 12, marginTop: 0 }}>
        Per-category avg score (0-10). Larger area = stronger profile. {axes.length} axes.
      </p>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <svg width="360" height="360" style={{ background: '#0f1729', borderRadius: 8 }}>
          {rings.map(rv => {
            const pts = axes.map((_, i) => pt(i, rv).join(',')).join(' ');
            return <polygon key={rv} points={pts} fill="none" stroke="#0f3460" strokeDasharray="3,3" strokeWidth="1" />;
          })}
          {axes.map((_, i) => {
            const [x, y] = pt(i, 10);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#0f3460" strokeWidth="1" />;
          })}
          <polygon
            points={axes.map((a, i) => pt(i, parseFloat(a.avg_score) || 0).join(',')).join(' ')}
            fill="#e94560" fillOpacity="0.35" stroke="#e94560" strokeWidth="2"
          />
          {axes.map((a, i) => {
            const [x, y] = pt(i, parseFloat(a.avg_score) || 0);
            return <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#e94560" strokeWidth="2" />;
          })}
          {axes.map((a, i) => {
            const r = R + 18;
            const x = cx + r * Math.cos(angle(i));
            const y = cy + r * Math.sin(angle(i));
            return (
              <text key={`l-${i}`} x={x} y={y} fontSize="11" fill="#ccc" textAnchor="middle" dominantBaseline="middle">
                {a.skill}
              </text>
            );
          })}
        </svg>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h4 style={{ color: '#ccc', marginTop: 0 }}>Axes</h4>
          {axes.map(a => (
            <div key={a.skill} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f3460' }}>
              <span style={{ color: '#fff', fontSize: 13 }}>{a.skill}</span>
              <span style={{ color: parseFloat(a.avg_score) >= 7 ? '#2ecc71' : parseFloat(a.avg_score) >= 5 ? '#f39c12' : '#e94560', fontWeight: 'bold', fontSize: 13 }}>
                {parseFloat(a.avg_score).toFixed(1)} ({a.attempts})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
