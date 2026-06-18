'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin(username, password, adminSecret);
      setToken(res.token);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Admin login failed. Check your credentials and secret.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">⚽ The Final Third</div>
          <div className="auth-logo-sub" style={{ color: 'var(--amber)' }}>
            🔐 Admin Access
          </div>
        </div>

        <h1 className="auth-title">Admin Sign In</h1>
        <p className="auth-subtitle">Provide your credentials and admin secret key.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="adm-username">Username</label>
            <input id="adm-username" className="form-input" type="text"
              placeholder="Admin username" autoComplete="username"
              value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adm-password">Password</label>
            <input id="adm-password" className="form-input" type="password"
              placeholder="Admin password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adm-secret">Admin Secret</label>
            <input id="adm-secret" className="form-input" type="password"
              placeholder="Enter admin secret key"
              value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}
            style={{ background: 'var(--amber)', color: '#000' }}>
            {loading ? 'Authenticating…' : 'Admin Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-link" onClick={() => router.push('/login')}>← User Login</span>
        </div>
      </div>
    </div>
  );
}
