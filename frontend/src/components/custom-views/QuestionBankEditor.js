import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const DIFFS = ['easy', 'medium', 'hard'];
const blank = { title: '', difficulty: 'medium', topic: '', description: '', solution_hint: '', time_limit_min: 30 };

export default function QuestionBankEditor() {
  const [filter, setFilter] = useState({ difficulty: '', topic: '', q: '' });
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // null | { id?, ...fields }
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const load = () => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) qs.set(k, v); });
    fetch(`${API}/custom-views/question-bank?${qs.toString()}`, { headers: h() })
      .then(r => r.json()).then(setData).catch(e => setErr(e.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title || !editing.title.trim()) {
      setErr('Title is required.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate
        ? `${API}/custom-views/question-bank/${editing.id}`
        : `${API}/custom-views/question-bank`;
      const r = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: h(),
        body: JSON.stringify({
          title: editing.title,
          difficulty: editing.difficulty,
          topic: editing.topic,
          description: editing.description,
          solution_hint: editing.solution_hint,
          time_limit_min: editing.time_limit_min,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setFlash({ kind: 'ok', text: isUpdate ? `Updated #${editing.id}` : `Created #${j.created?.id}` });
      setEditing(null);
      load();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete question #${id}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/custom-views/question-bank/${id}`, { method: 'DELETE', headers: h() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Delete failed');
      setFlash({ kind: 'ok', text: `Deleted #${id}` });
      load();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (err && !data) return <div style={{ color: '#e94560', padding: 20 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#888', padding: 20 }}>Loading question bank…</div>;

  const topics = Array.from(new Set((data.facets || []).map(f => f.topic))).filter(Boolean);

  return (
    <div data-testid="question-bank-editor" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ color: '#e94560', margin: 0 }}>Question Bank Editor (CRUD)</h3>
        <button onClick={() => setEditing({ ...blank })}
          style={{ padding: '8px 14px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          + New Problem
        </button>
      </div>
      <p style={{ color: '#888', fontSize: 12 }}>
        Create, edit, and delete coding problems (problem / difficulty / topic). {data.total} shown.
      </p>

      {flash && (
        <div style={{ background: '#0f3460', color: '#2ecc71', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
          {flash.text}
        </div>
      )}
      {err && <div style={{ color: '#e94560', marginBottom: 10, fontSize: 13 }}>Error: {err}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search title/description" value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          style={{ flex: 1, minWidth: 200, padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6 }} />
        <select value={filter.difficulty} onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          style={{ padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6 }}>
          <option value="">All difficulties</option>
          {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filter.topic} onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
          style={{ padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6 }}>
          <option value="">All topics</option>
          {topics.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} style={{ padding: '8px 16px', background: '#0f3460', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer' }}>Filter</button>
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {(data.questions || []).map(q => (
          <div key={q.id} style={{ background: '#0f1729', padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 600 }}>#{q.id} {q.title}</div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  {q.difficulty} · {q.topic} · {q.time_limit_min}m
                </div>
              </div>
              <button onClick={() => setEditing({
                id: q.id, title: q.title, difficulty: q.difficulty, topic: q.topic,
                description: q.description_excerpt || '', solution_hint: q.solution_hint || '',
                time_limit_min: q.time_limit_min,
              })}
                style={{ padding: '6px 12px', background: '#0f3460', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer' }}>
                Edit
              </button>
              <button onClick={() => remove(q.id)} disabled={busy}
                style={{ padding: '6px 12px', background: '#1a1a2e', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
            {q.description_excerpt && <div style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}>{q.description_excerpt}…</div>}
          </div>
        ))}
        {(data.questions || []).length === 0 && <div style={{ color: '#888' }}>No questions match filters.</div>}
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
             onClick={() => !busy && setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#16213e', padding: 24, borderRadius: 12, width: 560, maxWidth: '92vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>
              {editing.id ? `Edit Question #${editing.id}` : 'New Question'}
            </h3>
            <label style={{ color: '#ccc', fontSize: 12 }}>Title (problem)</label>
            <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              style={{ width: '100%', padding: 8, marginBottom: 10, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#ccc', fontSize: 12 }}>Difficulty</label>
                <select value={editing.difficulty || 'medium'} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}
                  style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }}>
                  {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#ccc', fontSize: 12 }}>Topic</label>
                <input value={editing.topic || ''} onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                  style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: 110 }}>
                <label style={{ color: '#ccc', fontSize: 12 }}>Time (min)</label>
                <input type="number" value={editing.time_limit_min || 30} onChange={(e) => setEditing({ ...editing, time_limit_min: parseInt(e.target.value) || 30 })}
                  style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
            </div>
            <label style={{ color: '#ccc', fontSize: 12, marginTop: 10, display: 'block' }}>Description</label>
            <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={3} style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
            <label style={{ color: '#ccc', fontSize: 12, marginTop: 10, display: 'block' }}>Solution Hint</label>
            <textarea value={editing.solution_hint || ''} onChange={(e) => setEditing({ ...editing, solution_hint: e.target.value })}
              rows={2} style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #0f3460', borderRadius: 6, boxSizing: 'border-box' }} />
            <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => !busy && setEditing(null)}
                style={{ padding: '8px 16px', background: '#0f3460', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={busy}
                style={{ padding: '8px 16px', background: busy ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Saving…' : (editing.id ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
