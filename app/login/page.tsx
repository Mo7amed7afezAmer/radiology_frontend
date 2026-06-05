'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, user, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, []);
  useEffect(() => { if (user) router.replace('/workstation'); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back, Doctor');
      router.push('/workstation');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">D</div>
          <span className="brand-name">DOCNILE</span>
        </div>
        <p className="login-subtitle">Radiology Reporting Workstation</p>
        <p className="login-access-note">Restricted to radiologists only</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="radiologist@hospital.com"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner" />
            ) : (
              'Sign In to Workstation'
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          background-image: radial-gradient(ellipse at 20% 50%, rgba(79,142,247,0.06) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.04) 0%, transparent 50%);
        }
        .login-card {
          width: 380px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 40px;
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .brand-mark {
          width: 36px; height: 36px;
          background: var(--accent);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 18px; color: white;
        }
        .brand-name {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-primary);
        }
        .login-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .login-access-note {
          font-size: 11px;
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid rgba(79,142,247,0.2);
          border-radius: 4px;
          padding: 4px 8px;
          display: inline-block;
          margin-bottom: 28px;
          font-family: 'JetBrains Mono', monospace;
        }
        .login-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 12px; font-weight: 500; color: var(--text-secondary); letter-spacing: 0.03em; }
        .field input {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .field input:focus { outline: none; border-color: var(--accent); }
        .field input::placeholder { color: var(--text-muted); }
        .btn-login {
          margin-top: 8px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-login:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-login:active { transform: scale(0.98); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
