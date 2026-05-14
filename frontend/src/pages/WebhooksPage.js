import React, { useEffect, useState } from 'react';
import { getWebhooks, createWebhook, deleteWebhook, testWebhook } from '../services/api';

export default function WebhooksPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ url: '', events: 'interview.completed,candidate.scored', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [probe, setProbe] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await getWebhooks();
      setItems(Array.isArray(data) ? data : (data.items || data.webhooks || []));
    } catch (e) {
      setError('Failed to load webhooks');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await createWebhook({
        url: form.url,
        events: form.events.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status,
      });
      setForm({ url: '', events: 'interview.completed,candidate.scored', status: 'active' });
      load();
    } catch (e) { setError('Create failed'); }
    setSubmitting(false);
  };

  const onTest = async (id) => {
    setProbe(null);
    const r = await testWebhook(id);
    setProbe({ id, ...r });
  };

  const onDelete = async (id) => {
    await deleteWebhook(id);
    load();
  };

  return (
    <div>
      <h1 style={{ color: '#e94560' }}>Webhooks</h1>
      <p style={{ color: '#888' }}>Outbound delivery for interview/candidate events. Integration API gap from audit.</p>

      <form onSubmit={submit} style={{ background: '#16213e', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ color: '#fff', marginTop: 0 }}>Add webhook</h3>
        <input
          required
          placeholder="https://example.com/hook"
          value={form.url}
          onChange={e => setForm({ ...form, url: e.target.value })}
          style={{ width: '100%', padding: 8, marginBottom: 8, background: '#0f3460', color: '#fff', border: '1px solid #0f3460', borderRadius: 4 }}
        />
        <input
          placeholder="comma-separated events"
          value={form.events}
          onChange={e => setForm({ ...form, events: e.target.value })}
          style={{ width: '100%', padding: 8, marginBottom: 8, background: '#0f3460', color: '#fff', border: '1px solid #0f3460', borderRadius: 4 }}
        />
        <select
          value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}
          style={{ padding: 8, marginBottom: 8, background: '#0f3460', color: '#fff', border: '1px solid #0f3460', borderRadius: 4 }}
        >
          <option value="active">active</option>
          <option value="paused">paused</option>
        </select>
        <div>
          <button disabled={submitting} type="submit" style={{ padding: '8px 16px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: '#e94560' }}>{error}</p>}
      {loading && <p style={{ color: '#888' }}>Loading...</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
        <thead>
          <tr style={{ background: '#16213e' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>URL</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Events</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Status</th>
            <th style={{ padding: 10 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(w => (
            <tr key={w.id} style={{ borderBottom: '1px solid #16213e' }}>
              <td style={{ padding: 10 }}>{w.url}</td>
              <td style={{ padding: 10, color: '#aaa' }}>{Array.isArray(w.events) ? w.events.join(', ') : (w.events || '')}</td>
              <td style={{ padding: 10 }}>{w.status || 'active'}</td>
              <td style={{ padding: 10, textAlign: 'center' }}>
                <button onClick={() => onTest(w.id)} style={{ padding: '4px 10px', marginRight: 6, background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Test</button>
                <button onClick={() => onDelete(w.id)} style={{ padding: '4px 10px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center', color: '#888' }}>No webhooks yet.</td></tr>
          )}
        </tbody>
      </table>

      {probe && (
        <pre style={{ marginTop: 16, padding: 12, background: '#0f3460', color: '#bbb', borderRadius: 4, overflow: 'auto' }}>
          probe id={probe.id}: {JSON.stringify(probe, null, 2)}
        </pre>
      )}
    </div>
  );
}
