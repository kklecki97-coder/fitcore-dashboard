import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

interface LoginPageProps {
  onLogin: (remember: boolean) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (email === 'marcus@email.com' && password === 'client123') {
        onLogin(remember);
      } else {
        setError('Invalid email or password');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={styles.wrap}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={styles.card}
      >
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 42, height: 42, borderRadius: '50%' }} />
          <div>
            <div style={styles.logoTitle}>FitCore</div>
            <div style={styles.logoSub}>CLIENT PORTAL</div>
          </div>
        </div>

        <p style={styles.subtitle}>Sign in to view your workouts and track your progress</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="marcus@email.com"
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.rememberRow}>
            <div
              onClick={() => setRemember(!remember)}
              style={{
                ...styles.checkbox,
                background: remember ? 'var(--accent-primary)' : 'transparent',
                borderColor: remember ? 'var(--accent-primary)' : 'var(--glass-border)',
              }}
            >
              {remember && <span style={{ fontSize: '10px', color: '#07090e', fontWeight: 800 }}>✓</span>}
            </div>
            <span style={styles.rememberText} onClick={() => setRemember(!remember)}>Remember me</span>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.error}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <LogIn size={16} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.hint}>Demo: marcus@email.com / client123</p>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 32px',
    boxShadow: 'var(--shadow-elevated)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  logoIcon: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#07090e',
    boxShadow: '0 0 24px var(--accent-primary-dim)',
  },
  logoTitle: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  logoSub: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.5px',
    color: 'var(--accent-primary)',
    textTransform: 'uppercase',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  rememberText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  error: {
    color: 'var(--accent-danger)',
    fontSize: '13px',
    fontWeight: 500,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
    transition: 'opacity 0.15s',
  },
  hint: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '20px',
    fontFamily: 'var(--font-mono)',
  },
};
