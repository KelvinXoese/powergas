import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('admin@powergas.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.data.accessToken);
      const me = await api.get('/auth/me');
      setUser(me.data.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.glow} />
      <div style={styles.card}>
        <div style={styles.mark}>
          <Flame size={26} color="var(--slate-950)" strokeWidth={2.5} />
        </div>
        <h1 style={styles.title} className="display">Operations Console</h1>
        <p style={styles.subtitle}>Sign in to manage stations, orders, and fleet.</p>

        <label style={styles.label} className="mono">EMAIL</label>
        <input
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoComplete="email"
        />

        <label style={styles.label} className="mono">PASSWORD</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoComplete="current-password"
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh', display: 'grid', placeItems: 'center',
    background: 'var(--slate-950)', position: 'relative', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, var(--flame-glow), transparent 70%)',
    top: '-15%', right: '-10%', pointerEvents: 'none',
  },
  card: {
    width: 380, background: 'var(--slate-900)', border: '1px solid var(--slate-800)',
    borderRadius: 16, padding: 36, position: 'relative', zIndex: 1,
  },
  mark: {
    width: 48, height: 48, borderRadius: 12, background: 'var(--flame)',
    display: 'grid', placeItems: 'center', marginBottom: 22,
    boxShadow: '0 0 28px var(--flame-glow)',
  },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--ink-100)' },
  subtitle: { fontSize: 13, color: 'var(--ink-300)', marginTop: 6, marginBottom: 26 },
  label: { display: 'block', fontSize: 10, letterSpacing: 1.5, color: 'var(--ink-300)', marginBottom: 7, marginTop: 16 },
  input: {
    width: '100%', padding: '12px 14px', background: 'var(--slate-950)',
    border: '1px solid var(--slate-700)', borderRadius: 9, color: 'var(--ink-100)',
    fontSize: 14, fontFamily: 'var(--body)',
  },
  error: {
    marginTop: 16, padding: '10px 12px', background: 'rgba(255,92,108,0.1)',
    border: '1px solid rgba(255,92,108,0.3)', borderRadius: 8,
    color: 'var(--rose)', fontSize: 13,
  },
  button: {
    width: '100%', marginTop: 26, padding: '13px', background: 'var(--flame)',
    color: 'var(--slate-950)', border: 'none', borderRadius: 9, fontSize: 14,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--display)',
  },
};
