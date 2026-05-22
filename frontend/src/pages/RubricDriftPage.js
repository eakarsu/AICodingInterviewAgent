import React, { useState } from 'react';

export default function RubricDriftPage() {
  const [payload, setPayload] = useState(JSON.stringify({ rubrics: [
    { skill: 'algorithms', expected_avg: 7.2, current_avg: 8.6, reviewer_variance: 1.4 },
    { skill: 'system_design', expected_avg: 6.8, current_avg: 6.5, reviewer_variance: 0.6 }
  ] }, null, 2));
  const [result, setResult] = useState(null);
  const run = async () => {
    const res = await fetch('/api/rubric-drift/score', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify(JSON.parse(payload)) });
    setResult(await res.json());
  };
  return (
    <div>
      <h1 style={{ color: '#fff' }}>Rubric Drift Monitor</h1>
      <textarea style={{ width: '100%', minHeight: 220 }} value={payload} onChange={(event) => setPayload(event.target.value)} />
      <button onClick={run}>Score Drift</button>
      {result && <div style={{ marginTop: 20, color: '#fff' }}><h2>{result.recalibrationCount} recalibrations</h2>{result.rubrics.map((row) => <p key={row.skill}>{row.skill}: {row.tier} · {row.action}</p>)}</div>}
    </div>
  );
}
