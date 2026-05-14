import React, { useEffect, useState } from 'react';
import { getAllCalibration, getQuestionVersions, snapshotQuestion, getQuestionCalibration } from '../services/api';

export default function CalibrationPage() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [versions, setVersions] = useState({});
  const [snapshotNotes, setSnapshotNotes] = useState({});

  const load = async () => {
    const r = await getAllCalibration(`?page=${page}&limit=20`);
    setData(r.data || []);
  };

  useEffect(() => { load(); }, [page]);

  const handleViewVersions = async (qid) => {
    if (versions[qid]) {
      const newV = { ...versions };
      delete newV[qid];
      setVersions(newV);
      return;
    }
    const r = await getQuestionVersions(qid);
    setVersions({ ...versions, [qid]: r.data || [] });
  };

  const handleSnapshot = async (qid) => {
    try {
      await snapshotQuestion(qid, snapshotNotes[qid] || 'manual snapshot');
      const r = await getQuestionVersions(qid);
      setVersions({ ...versions, [qid]: r.data || [] });
      setSnapshotNotes({ ...snapshotNotes, [qid]: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRecalibrate = async (qid) => {
    await getQuestionCalibration(qid);
    await load();
  };

  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Question Bank Calibration & Versioning</h1>
      <div style={{ background: '#16213e', padding: 20, borderRadius: 12 }}>
        <table style={{ width: '100%', color: '#e0e0e0', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #0f3460' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Title</th>
              <th style={{ padding: 8 }}>Difficulty</th>
              <th style={{ padding: 8 }}>Category</th>
              <th style={{ padding: 8 }}>Version</th>
              <th style={{ padding: 8 }}>Submissions</th>
              <th style={{ padding: 8 }}>Success Rate</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(q => (
              <React.Fragment key={q.id}>
                <tr style={{ borderBottom: '1px solid #0f3460' }}>
                  <td style={{ padding: 8 }}>{q.id}</td>
                  <td style={{ padding: 8 }}>{q.title}</td>
                  <td style={{ padding: 8 }}>{q.difficulty}</td>
                  <td style={{ padding: 8 }}>{q.category}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>v{q.version || 1}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{q.total_submissions}</td>
                  <td style={{ padding: 8, textAlign: 'center', color: q.success_rate >= 60 ? '#2ecc71' : q.success_rate >= 30 ? '#f39c12' : '#e94560' }}>
                    {q.success_rate != null ? `${q.success_rate}%` : '—'}
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => handleRecalibrate(q.id)} style={{ padding: '4px 8px', background: '#0f3460', color: '#fff', border: '1px solid #2ecc71', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      Recalibrate
                    </button>
                    <button onClick={() => handleViewVersions(q.id)} style={{ padding: '4px 8px', background: '#0f3460', color: '#fff', border: '1px solid #e94560', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      {versions[q.id] ? 'Hide' : 'Versions'}
                    </button>
                  </td>
                </tr>
                {versions[q.id] && (
                  <tr>
                    <td colSpan="8" style={{ padding: 16, background: '#1a1a2e' }}>
                      <h4 style={{ color: '#e94560' }}>Version History</h4>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                          placeholder="Change notes…"
                          value={snapshotNotes[q.id] || ''}
                          onChange={(e) => setSnapshotNotes({ ...snapshotNotes, [q.id]: e.target.value })}
                          style={{ flex: 1, padding: 8, background: '#0f3460', border: '1px solid #e94560', borderRadius: 4, color: '#fff' }}
                        />
                        <button onClick={() => handleSnapshot(q.id)} style={{ padding: '8px 14px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                          Snapshot
                        </button>
                      </div>
                      {versions[q.id].length === 0 && <p style={{ color: '#888' }}>No version history yet.</p>}
                      {versions[q.id].map(v => (
                        <div key={v.id} style={{ background: '#0f3460', padding: 8, marginBottom: 4, borderRadius: 4, fontSize: 12 }}>
                          v{v.version} — {v.title} | {v.change_notes || 'no notes'} | {new Date(v.created_at).toLocaleString()}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: '6px 12px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Prev</button>
          <span style={{ color: '#ccc', padding: '6px 12px' }}>Page {page}</span>
          <button onClick={() => setPage(page + 1)} style={{ padding: '6px 12px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Next</button>
        </div>
      </div>
    </div>
  );
}
