import React, { useState } from 'react'; import { login } from '../services/api';
export default function LoginPage({ onLogin }) { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const s = async (e) => { e.preventDefault(); try { const r = await login(email, password); if (r.token) { localStorage.setItem('token', r.token); onLogin(); } else setError(r.error||'Failed'); } catch { setError('Connection failed'); } };
  return (<div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#16213e', padding: 40, borderRadius: 12, width: 400 }}>
    <h1 style={{ color: '#e94560', textAlign: 'center', marginBottom: 8 }}>💻 Coding Interview Agent</h1><p style={{ color: '#888', textAlign: 'center', marginBottom: 30, fontSize: 14 }}>AI-Powered Interview Platform</p>
    {error && <div style={{ background: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: 10, borderRadius: 6, marginBottom: 16 }}>{error}</div>}
    <form onSubmit={s}><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: '100%', padding: 12, marginBottom: 12, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
    <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={{ width: '100%', padding: 12, marginBottom: 20, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
    <button type="submit" style={{ width: '100%', padding: 12, background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginBottom: 12 }}>Login</button></form>
    <button onClick={() => { setEmail('admin@example.com'); setPassword('admin123'); }} style={{ width: '100%', padding: 10, background: '#0f3460', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Fill Demo Credentials</button>
  </div></div>); }
