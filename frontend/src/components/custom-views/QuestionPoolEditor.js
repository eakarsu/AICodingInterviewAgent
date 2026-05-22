import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const DIFFS = ['easy', 'medium', 'hard'];

export default function QuestionPoolEditor() {
  const [filter, setFilter] = useState({ difficulty: '', category: '', q: '' });
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const load = () => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) qs.set(k, v); });
    fetch(`${API}/custom-views/question-pool?${qs.toString()}`, { headers: h() })
      .then(r => r.json()).then(setData).catch(e => setErr(e.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/custom-views/question-pool/${editing.id}`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({
          title: editing.title,
          difficulty: editing.difficulty,
          category: editing.category,
          time_limit_min: editing.time_limit_min,
          solution_hint: editing.solution_hint,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setSavedId(editing.id);
      setEditing(null);
      load();
      setTimeout(() => setSavedId(null), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (err) return <div style={{ color: '#e94560', padding: 20 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#888', padding: 20 }}>Loading question pool…</div>;

  const categories = Array.from(new Set((data.facets || []).map(f => f.category))).filter(Boolean);

  return (
    <div data-testid="question-pool-editor" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Question Pool Editor</h3>
      <p style={{ color: '#888', fontSize: 12 }}>
        Edit question metadata (title, difficulty, category, time, hint) in-place. {data.total} shown.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search title/description" value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          style={{ flex: 1, minWidth: 200, padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6 }} />
        <select value={filter.difficulty} onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          style={{ padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6 }}>
          <option value="">All difficulties</option>
          {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          style={{ padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6 }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} style={{ padding: '8px 16px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Filter</button>
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {(data.questions || []).map(q => (
          <div key={q.id} style={{ background: '#0f1729', padding: 12, borderRadius: 8, marginBottom: 8, border: savedId === q.id ? '1px solid #2ecc71' : '1px solid transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 600 }}>#{q.id} {q.title}</div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  {q.difficulty} · {q.category} · {q.time_limit_min}m
                </div>
              </div>
              <button onClick={() => setEditing({ ...q })}
                style={{ padding: '6px 12px', background: '#0f3460', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer' }}>
                Edit
              </button>
            </div>
            {q.description_excerpt && <div style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}>{q.description_excerpt}…</div>}
          </div>
        ))}
        {(data.questions || []).length === 0 && <div style={{ color: '#888' }}>No questions match filters.</div>}
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
             onClick={() => !saving && setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#16213e', padding: 24, borderRadius: 12, width: 520, maxWidth: '90vw' }}>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Edit Question #{editing.id}</h3>
            <label style={{ color: '#ccc', fontSize: 12 }}>Title</label>
            <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              style={{ width: '100%', padding: 8, marginBottom: 10, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#ccc', fontSize: 12 }}>Difficulty</label>
                <select value={editing.difficulty || ''} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}
                  style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }}>
                  {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#ccc', fontSize: 12 }}>Category</label>
                <input value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: 110 }}>
                <label style={{ color: '#ccc', fontSize: 12 }}>Time (min)</label>
                <input type="number" value={editing.time_limit_min || 30} onChange={(e) => setEditing({ ...editing, time_limit_min: parseInt(e.target.value) || 30 })}
                  style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
            </div>
            <label style={{ color: '#ccc', fontSize: 12, marginTop: 10, display: 'block' }}>Solution Hint</label>
            <textarea value={editing.solution_hint || ''} onChange={(e) => setEditing({ ...editing, solution_hint: e.target.value })}
              rows={3} style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
            <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => !saving && setEditing(null)}
                style={{ padding: '8px 16px', background: '#0f3460', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{ padding: '8px 16px', background: saving ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
