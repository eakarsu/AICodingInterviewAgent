import React, { useEffect, useState } from 'react';
import { computeRankings, getRankings, recommendRoles } from '../services/api';

export default function RankingPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [recs, setRecs] = useState({});

  const load = async () => {
    const r = await getRankings(filter ? `?experience_level=${filter}` : '');
    setRankings(r.data || []);
  };

  useEffect(() => { load(); }, [filter]);

  const handleCompute = async () => {
    setLoading(true);
    try {
      await computeRankings();
      await load();
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async (id) => {
    try {
      const r = await recommendRoles(id);
      setRecs({ ...recs, [id]: r.recommendations });
    } catch (err) {
      setRecs({ ...recs, [id]: { error: err.message } });
    }
  };

  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Candidate Ranking Engine</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button onClick={handleCompute} disabled={loading} style={{ padding: '10px 24px', background: loading ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {loading ? 'Computing…' : 'Recompute Rankings'}
        </button>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff' }}>
          <option value="">All Levels</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
          <option value="principal">Principal</option>
        </select>
      </div>

      <div style={{ background: '#16213e', padding: 20, borderRadius: 12 }}>
        <table style={{ width: '100%', color: '#e0e0e0', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #0f3460' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Rank</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Candidate</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Level</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Composite Score</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Percentile</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ borderBottom: '1px solid #0f3460' }}>
                  <td style={{ padding: 8 }}>#{r.rank_in_level}</td>
                  <td style={{ padding: 8 }}>{r.candidate_name}</td>
                  <td style={{ padding: 8 }}>{r.experience_level}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.composite_score).toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: 'right', color: '#2ecc71' }}>{r.percentile}%</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => handleRecommend(r.candidate_id)} style={{ padding: '4px 10px', background: '#0f3460', color: '#fff', border: '1px solid #e94560', borderRadius: 4, cursor: 'pointer' }}>
                      Recommend Roles
                    </button>
                  </td>
                </tr>
                {recs[r.candidate_id] && (
                  <tr>
                    <td colSpan="6" style={{ padding: 8, background: '#1a1a2e' }}>
                      <pre style={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(recs[r.candidate_id], null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rankings.length === 0 && (
              <tr><td colSpan="6" style={{ padding: 16, textAlign: 'center', color: '#888' }}>No rankings yet — click "Recompute Rankings".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
