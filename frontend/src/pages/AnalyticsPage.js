import React, { useEffect, useState } from 'react';
import { getAnalyticsOverview, getTopPerformers, getDifficultyStats, getLanguagePopularity } from '../services/api';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [top, setTop] = useState([]);
  const [diff, setDiff] = useState([]);
  const [lang, setLang] = useState([]);

  useEffect(() => {
    Promise.all([
      getAnalyticsOverview().catch(() => null),
      getTopPerformers(10).catch(() => ({ top_performers: [] })),
      getDifficultyStats().catch(() => ({ difficulty_stats: [] })),
      getLanguagePopularity().catch(() => ({ language_popularity: [] })),
    ]).then(([o, t, d, l]) => {
      setOverview(o);
      setTop(t.top_performers || []);
      setDiff(d.difficulty_stats || []);
      setLang(l.language_popularity || []);
    });
  }, []);

  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Interview Analytics Dashboard</h1>

      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Candidates', val: overview.candidates },
            { label: 'Questions', val: overview.questions },
            { label: 'Total Interviews', val: overview.total_interviews },
            { label: 'Completed', val: overview.completed_interviews },
            { label: 'Avg Score', val: overview.avg_score || '—' },
          ].map(card => (
            <div key={card.label} style={{ background: '#16213e', padding: 16, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: 13 }}>{card.label}</div>
              <div style={{ color: '#e94560', fontSize: 28, fontWeight: 'bold' }}>{card.val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#16213e', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ color: '#e94560' }}>Top Performers</h3>
        <table style={{ width: '100%', color: '#e0e0e0', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #0f3460' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Name</th>
              <th style={{ padding: 8 }}>Level</th>
              <th style={{ padding: 8 }}>Interviews</th>
              <th style={{ padding: 8 }}>Avg Score</th>
              <th style={{ padding: 8 }}>Best Score</th>
            </tr>
          </thead>
          <tbody>
            {top.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #0f3460' }}>
                <td style={{ padding: 8 }}>{t.name}</td>
                <td style={{ padding: 8 }}>{t.experience_level}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{t.total_interviews}</td>
                <td style={{ padding: 8, textAlign: 'center', color: '#2ecc71' }}>{t.avg_score}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{t.best_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#16213e', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ color: '#e94560' }}>Pass Rate by Difficulty</h3>
        <table style={{ width: '100%', color: '#e0e0e0', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #0f3460' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Difficulty</th>
              <th style={{ padding: 8 }}>Total</th>
              <th style={{ padding: 8 }}>Avg Score</th>
              <th style={{ padding: 8 }}>Passed</th>
              <th style={{ padding: 8 }}>Pass Rate</th>
            </tr>
          </thead>
          <tbody>
            {diff.map(d => (
              <tr key={d.difficulty} style={{ borderBottom: '1px solid #0f3460' }}>
                <td style={{ padding: 8 }}>{d.difficulty}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{d.total_interviews}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{d.avg_score || '—'}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{d.passed}</td>
                <td style={{ padding: 8, textAlign: 'center', color: d.pass_rate_pct >= 60 ? '#2ecc71' : '#f39c12' }}>{d.pass_rate_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#16213e', padding: 20, borderRadius: 12 }}>
        <h3 style={{ color: '#e94560' }}>Language Popularity</h3>
        <table style={{ width: '100%', color: '#e0e0e0', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #0f3460' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Language</th>
              <th style={{ padding: 8 }}>Submissions</th>
              <th style={{ padding: 8 }}>Avg Score</th>
              <th style={{ padding: 8 }}>Usage %</th>
            </tr>
          </thead>
          <tbody>
            {lang.length === 0 && <tr><td colSpan="4" style={{ padding: 16, textAlign: 'center', color: '#888' }}>No submissions yet.</td></tr>}
            {lang.map(l => (
              <tr key={l.language} style={{ borderBottom: '1px solid #0f3460' }}>
                <td style={{ padding: 8 }}>{l.language}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{l.submission_count}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{l.avg_score}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{l.usage_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
