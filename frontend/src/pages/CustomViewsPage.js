import React, { useEffect, useState } from 'react';
import { getCandidates } from '../services/api';
import DifficultyDistributionChart from '../components/custom-views/DifficultyDistributionChart';
import TopicMasteryHeatmap from '../components/custom-views/TopicMasteryHeatmap';
import InterviewScoreReportPDF from '../components/custom-views/InterviewScoreReportPDF';
import QuestionBankEditor from '../components/custom-views/QuestionBankEditor';

const TABS = [
  { key: 'difficulty', label: 'Difficulty Distribution', kind: 'viz' },
  { key: 'heatmap', label: 'Topic Mastery Heatmap', kind: 'viz' },
  { key: 'report', label: 'Interview Score Report (PDF)', kind: 'tool' },
  { key: 'bank', label: 'Question Bank Editor', kind: 'tool' },
];

export default function CustomViewsPage() {
  const [tab, setTab] = useState('difficulty');
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getCandidates().then(r => {
      const list = Array.isArray(r) ? r : (r.data || r || []);
      setCandidates(list);
      if (list.length && !selected) setSelected(list[0].id);
    }).catch(() => {});
    // eslint-disable-next-line
  }, []);

  return (
    <div data-testid="custom-views-page">
      <h1 style={{ color: '#fff', marginBottom: 6 }}>Interview Views</h1>
      <p style={{ color: '#888', marginTop: 0 }}>
        Custom coding-interview-agent views: 2 visualizations + 2 interactive tools.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
            style={{
              padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#e94560' : '#0f3460',
              color: tab === t.key ? '#fff' : '#ccc',
              fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            }}>
            {t.label} <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 4 }}>[{t.kind}]</span>
          </button>
        ))}
      </div>

      {tab === 'report' && (
        <div style={{ background: '#0f3460', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <label style={{ color: '#ccc', fontSize: 12, marginRight: 8 }}>Candidate</label>
          <select value={selected || ''} onChange={(e) => setSelected(parseInt(e.target.value) || null)}
            style={{ padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #16213e', borderRadius: 6, minWidth: 240 }}>
            <option value="">-- Select candidate --</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.experience_level})</option>)}
          </select>
        </div>
      )}

      {tab === 'difficulty' && <DifficultyDistributionChart />}
      {tab === 'heatmap' && <TopicMasteryHeatmap />}
      {tab === 'report' && <InterviewScoreReportPDF candidateId={selected} />}
      {tab === 'bank' && <QuestionBankEditor />}
    </div>
  );
}
