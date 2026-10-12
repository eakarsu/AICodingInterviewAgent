
import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import FormattedAIReport from "../components/FormattedAIReport";
import React, { useEffect, useState } from 'react';
import { getCandidates, getSkillHeatmap, analyzeSkills } from '../services/api';

export default function SkillGapPage() {
  const fullAIExamples = useFullAIExamples();

  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCandidates().then(r => setCandidates(r.data || []));
  }, []);

  const handleSelect = async (cid) => {
    setSelected(cid);
    setHeatmap(null);
    setAnalysis(null);
    try {
      const h = await getSkillHeatmap(cid);
      setHeatmap(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const r = await analyzeSkills(selected);
      setAnalysis(r);
    } catch (err) {
      setAnalysis({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-full-ai-workspace="SkillGapPage"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Skill Gap Analysis</h1>

      <div style={{ background: '#16213e', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <label style={{ color: '#ccc', fontSize: 13 }}>Select Candidate</label>
        <select
          value={selected || ''}
          onChange={(e) => handleSelect(parseInt(e.target.value))}
          style={{ width: '100%', padding: 10, marginTop: 4, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff' }} data-full-ai-field={fullAIExamples.bind({ current: selected || '', change: (e) => handleSelect(parseInt(e.target.value)), label: "selected", manual: false, json: false, sample: null }, "p1-1386", undefined)}
        >
          <option value="">-- Choose --</option>
          {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.experience_level})</option>)}
        </select>
        <button
          onClick={handleAnalyze}
          disabled={!selected || loading}
          style={{ marginTop: 12, padding: '10px 24px', background: loading ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Analyzing…' : 'Run AI Skill Gap Analysis'}
        </button>
      </div>

      {heatmap && (
        <div style={{ background: '#16213e', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ color: '#e94560' }}>Per-Skill Performance Heatmap</h3>
          {heatmap.heatmap?.length === 0 && <p style={{ color: '#888' }}>No submissions yet for this candidate.</p>}
          {heatmap.heatmap?.map(row => (
            <div key={row.skill} style={{ background: '#1a1a2e', padding: 12, borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff' }}>{row.skill}</span>
              <span style={{ color: row.avg_score >= 7 ? '#2ecc71' : row.avg_score >= 5 ? '#f39c12' : '#e94560', fontWeight: 'bold' }}>
                {row.avg_score} avg ({row.attempts} attempts)
              </span>
            </div>
          ))}
        </div>
      )}

      {analysis && (
        <div style={{ background: '#16213e', padding: 20, borderRadius: 12 }}>
          <h3 style={{ color: '#e94560' }}>AI Analysis</h3>
          <FormattedAIReport response={analysis.analysis || analysis} />
        </div>
      )}
    </div>
  );
}
