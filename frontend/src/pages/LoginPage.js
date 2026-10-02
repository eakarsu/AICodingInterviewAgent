import React, { useState } from 'react'; import { login } from '../services/api';

function __demoAutofill() {
  (async () => {
    let email = "";
    let password = "";
    try {
      const response = await fetch("/api/auth/demo-credentials", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        email = data.email || data.username || "";
        password = data.password || "";
      }
    } catch (error) {
      /* fall back to build-time credentials below */
    }
    if (!email || !password) {
      const env = (typeof process !== "undefined" && process.env) ? process.env : {};
      email = email || env.REACT_APP_DEMO_EMAIL || env.VITE_DEMO_EMAIL || "";
      password = password || env.REACT_APP_DEMO_PASSWORD || env.VITE_DEMO_PASSWORD || "";
    }
    const form = document.querySelector("form");
    const setValue = (element, value) => {
      if (!element) return;
      const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      setter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const scope = form || document;
    setValue(scope.querySelector('input[type="email"], input[name="email"], input[name="username"]') || scope.querySelectorAll("input")[0], email);
    setValue(scope.querySelector('input[type="password"], input[name="password"]') || scope.querySelectorAll("input")[1], password);
    window.setTimeout(() => {
      if (form && typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        const submit = scope.querySelector('button[type="submit"], input[type="submit"]');
        if (submit) submit.click();
      }
    }, 50);
  })();
}
export default function LoginPage({ onLogin }) { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const s = async (e) => { e.preventDefault(); try { const r = await login(email, password); if (r.token) { localStorage.setItem('token', r.token); onLogin(); } else setError(r.error||'Failed'); } catch { setError('Connection failed'); } };
  return (<div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#16213e', padding: 40, borderRadius: 12, width: 400 }}>
    <h1 style={{ color: '#e94560', textAlign: 'center', marginBottom: 8 }}>💻 Coding Interview Agent</h1><p style={{ color: '#888', textAlign: 'center', marginBottom: 30, fontSize: 14 }}>AI-Powered Interview Platform</p>
    {error && <div style={{ background: '#e9456020', border: '1px solid #e94560', color: '#e94560', padding: 10, borderRadius: 6, marginBottom: 16 }}>{error}</div>}
    <form onSubmit={s}><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: '100%', padding: 12, marginBottom: 12, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
    <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={{ width: '100%', padding: 12, marginBottom: 20, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
    <button type="submit" style={{ width: '100%', padding: 12, background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginBottom: 12 }}>Sign In</button></form>
    <button onClick={__demoAutofill} style={{ width: '100%', padding: 10, background: '#0f3460', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Auto Fill Demo Credentials</button>
  </div></div>); }
