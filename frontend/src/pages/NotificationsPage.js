import React, { useState, useEffect } from 'react';
import { getNotifications, getUnreadCount, createNotification, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/api';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', user_id: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      const list = Array.isArray(data) ? data : (data.notifications || data.items || data.data || []);
      setItems(list);
      try {
        const c = await getUnreadCount();
        setUnread(c.count ?? c.unread ?? 0);
      } catch (_) {
        setUnread(list.filter(n => !(n.read || n.is_read)).length);
      }
    } catch (e) {
      setError('Failed to load notifications');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const body = { ...form };
      if (!body.user_id) delete body.user_id;
      await createNotification(body);
      setShowForm(false);
      setForm({ title: '', message: '', type: 'info', user_id: '' });
      load();
    } catch (err) {
      setError('Save failed');
    }
    setSubmitting(false);
  };

  const onMarkRead = async (id) => { try { await markNotificationRead(id); load(); } catch { setError('Failed'); } };
  const onMarkAll = async () => { try { await markAllNotificationsRead(); load(); } catch { setError('Failed'); } };
  const onDelete = async (id) => { if (!window.confirm('Delete?')) return; try { await deleteNotification(id); load(); } catch { setError('Failed'); } };

  const typeColor = { info: '#3498db', success: '#2ecc71', warning: '#f39c12', error: '#e94560' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: '#fff', margin: 0 }}>🔔 Notifications</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>{unread} unread</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onMarkAll} style={{ padding: '10px 18px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Mark all read</button>
          <button onClick={() => setShowForm(s => !s)} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{showForm ? 'Cancel' : '+ New'}</button>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: 'rgba(233,69,96,0.1)', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <form onSubmit={submit} style={{ background: '#16213e', borderRadius: 12, padding: 20, marginBottom: 20, maxWidth: 600 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={3} style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff' }}>
              <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>User ID (optional)</label>
            <input value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{submitting ? 'Creating...' : 'Create'}</button>
        </form>
      )}

      {loading ? <div style={{ color: '#888' }}>Loading...</div> : (
        <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #0f3460' }}>
              {['Title','Message','Type','Status','Created',''].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#e94560', fontSize: 13 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid #0f3460' }}>
                  <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500 }}>{n.title}</td>
                  <td style={{ padding: '12px 16px', color: '#ccc', fontSize: 13 }}>{n.message}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ background: (typeColor[n.type] || '#888') + '20', color: typeColor[n.type] || '#888', padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>{n.type || 'info'}</span></td>
                  <td style={{ padding: '12px 16px', color: (n.read || n.is_read) ? '#888' : '#2ecc71', fontSize: 12 }}>{(n.read || n.is_read) ? 'read' : 'unread'}</td>
                  <td style={{ padding: '12px 16px', color: '#888', fontSize: 12 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {!(n.read || n.is_read) && <button onClick={() => onMarkRead(n.id)} style={{ padding: '4px 10px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6 }}>Read</button>}
                    <button onClick={() => onDelete(n.id)} style={{ padding: '4px 10px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No notifications</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
