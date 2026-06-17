'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register, verifyOtp } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]         = useState<'REGISTER' | 'OTP'>('REGISTER');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [otpCode, setOtpCode]   = useState('');
  
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await register(username, email, password);
      setSuccess(res.message || 'OTP sent to your email! (Please check spam if not found)');
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await verifyOtp(username, otpCode);
      setSuccess(res.message || 'Account verified! Redirecting to login…');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">⚽ The Final Third</div>
          <div className="auth-logo-sub">Create your account</div>
        </div>

        <h1 className="auth-title">Get started</h1>
        <p className="auth-subtitle">Register to start predicting match scores.</p>

        {error   && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {step === 'REGISTER' ? (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <input id="reg-username" className="form-input" type="text"
                placeholder="Choose a username" autoComplete="username"
                value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <input id="reg-email" className="form-input" type="email"
                placeholder="you@example.com" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input id="reg-password" className="form-input" type="password"
                placeholder="At least 6 characters" autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" className="form-input" type="password"
                placeholder="Repeat password" autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-code">Verification Code (OTP)</label>
              <input id="otp-code" className="form-input" type="text"
                placeholder="Enter 6-digit code"
                value={otpCode} onChange={e => setOtpCode(e.target.value)} required />
              <small style={{ color: 'var(--text-faint)', marginTop: 4, display: 'block' }}>
                We sent a 6-digit code to {email}. It expires in 10 minutes. If you don't see it, <strong>please check your spam folder</strong>.
              </small>
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account?{' '}
          <span className="auth-link" onClick={() => router.push('/login')}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
