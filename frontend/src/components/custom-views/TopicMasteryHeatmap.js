import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

// Color ramp for score 0..10: red -> amber -> green
function scoreColor(v) {
  if (v == null) return '#1a1a2e';
  const x = Math.max(0, Math.min(10, v)) / 10; // 0..1
  // interpolate red(231,69,96) -> amber(243,156,18) -> green(46,204,113)
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  if (x < 0.5) {
    const t = x / 0.5;
    return `rgb(${lerp(231, 243, t)},${lerp(69, 156, t)},${lerp(96, 18, t)})`;
  }
  const t = (x - 0.5) / 0.5;
  return `rgb(${lerp(243, 46, t)},${lerp(156, 204, t)},${lerp(18, 113, t)})`;
}

export default function TopicMasteryHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [candidates, setCandidates] = useState(12);

  useEffect(() => {
    setData(null);
    fetch(`${API}/custom-views/topic-mastery-heatmap?candidates=${candidates}`, { headers: h() })
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(e.message));
  }, [candidates]);

  if (err) return <div style={{ color: '#e94560', padding: 20 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#888', padding: 20 }}>Loading heatmap…</div>;
  if (data.error) return <div style={{ color: '#e94560', padding: 20 }}>{data.error}</div>;

  const topics = data.topics || [];
  const matrix = data.matrix || [];
  const cellW = Math.max(60, Math.min(120, Math.floor(720 / Math.max(topics.length, 1))));

  return (
    <div data-testid="topic-mastery-heatmap" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ color: '#e94560', margin: 0 }}>Topic Mastery Heatmap (topic x candidate)</h3>
        <div>
          <label style={{ color: '#888', fontSize: 12, marginRight: 6 }}>Candidates</label>
          <select value={candidates} onChange={(e) => setCandidates(parseInt(e.target.value))}
            style={{ background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, padding: '6px 10px' }}>
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>
      </div>
      <p style={{ color: '#888', fontSize: 12 }}>
        Cell = avg submission score per (candidate, topic).
        {data.synthetic ? ' Showing synthetic demo values (no real submissions yet).' : ''}
      </p>

      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 10px', color: '#ccc', fontSize: 11, textAlign: 'left', background: '#0f3460', position: 'sticky', left: 0 }}>Candidate</th>
              {topics.map(t => (
                <th key={t} style={{ padding: '6px 10px', color: '#ccc', fontSize: 11, background: '#0f3460', minWidth: cellW }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => (
              <tr key={row.candidate_id}>
                <td style={{ padding: '6px 10px', color: '#fff', fontSize: 12, background: '#0f1729', position: 'sticky', left: 0 }}>
                  <div style={{ fontWeight: 600 }}>{row.candidate_name}</div>
                  <div style={{ color: '#888', fontSize: 10 }}>{row.experience_level}</div>
                </td>
                {row.cells.map((c, i) => (
                  <td key={i} title={`${c.topic}: ${c.avg_score == null ? 'n/a' : c.avg_score.toFixed(2)} (${c.attempts} attempts)${c.synthetic ? ' (synthetic)' : ''}`}
                    style={{
                      padding: 0,
                      background: scoreColor(c.avg_score),
                      width: cellW,
                      height: 40,
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid #16213e',
                      opacity: c.synthetic ? 0.7 : 1,
                    }}>
                    {c.avg_score == null ? '—' : c.avg_score.toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#888', fontSize: 11 }}>0</span>
        <div style={{
          flex: 1, maxWidth: 320, height: 10, borderRadius: 4,
          background: 'linear-gradient(to right, rgb(231,69,96), rgb(243,156,18), rgb(46,204,113))',
        }} />
        <span style={{ color: '#888', fontSize: 11 }}>10</span>
      </div>
    </div>
  );
}
