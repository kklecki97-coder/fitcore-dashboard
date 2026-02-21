import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLogin: (remember: boolean) => void;
}

const VALID_EMAIL = 'kamil@fitcore.io';
const VALID_PASSWORD = 'fitcore123';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
      if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        onLogin(rememberMe);
      } else {
        setError('Invalid email or password');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={styles.page}>
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div style={styles.logoSection}>
          <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 42, height: 42, borderRadius: '50%' }} />
          <div>
            <div style={styles.logoText}>FitCore</div>
            <div style={styles.logoSub}>COACH DASHBOARD</div>
          </div>
        </div>

        <p style={styles.subtitle}>Sign in to manage your clients and programs</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamil@fitcore.io"
              style={styles.input}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          <label style={styles.rememberRow}>
            <div
              onClick={() => setRememberMe(r => !r)}
              style={{
                ...styles.checkbox,
                background: rememberMe ? 'var(--accent-primary)' : 'transparent',
                borderColor: rememberMe ? 'var(--accent-primary)' : 'var(--glass-border)',
              }}
            >
              {rememberMe && <span style={styles.checkmark}>&#10003;</span>}
            </div>
            <span style={styles.rememberText}>Remember me</span>
          </label>

          {error && (
            <motion.div
              style={styles.error}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p style={styles.hint}>
          Demo: kamil@fitcore.io / fitcore123
        </p>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px var(--accent-primary-dim)',
  },
  logoText: {
    fontSize: '31px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  logoSub: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    fontFamily: 'var(--font-display)',
  },
  subtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    margin: 0,
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.3px',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  error: {
    fontSize: '18px',
    color: 'var(--accent-danger)',
    fontWeight: 500,
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '20px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1.5px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkmark: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#07090e',
    lineHeight: 1,
  },
  rememberText: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
  },
  hint: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    margin: 0,
    fontFamily: 'var(--font-display)',
  },
};
