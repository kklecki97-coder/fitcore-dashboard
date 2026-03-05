import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{
    coach_id: string;
    client_name: string | null;
    client_email: string | null;
    plan: string;
  } | null>(null);
  const [invalidCode, setInvalidCode] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate the invite code on mount
  useEffect(() => {
    if (!code) { setInvalidCode(true); setLoading(false); return; }

    const validate = async () => {
      // Clear any stale session (e.g. from a previous failed registration)
      await supabase.auth.signOut();

      const { data, error: fetchError } = await supabase
        .from('invite_codes')
        .select('coach_id, client_name, client_email, plan, used_by, expires_at')
        .eq('code', code)
        .single();

      if (fetchError || !data) {
        setInvalidCode(true);
        setLoading(false);
        return;
      }

      // Check if already used
      if (data.used_by) {
        setInvalidCode(true);
        setLoading(false);
        return;
      }

      // Check expiry
      if (new Date(data.expires_at) < new Date()) {
        setInvalidCode(true);
        setLoading(false);
        return;
      }

      setInvite({
        coach_id: data.coach_id,
        client_name: data.client_name,
        client_email: data.client_email,
        plan: data.plan,
      });

      // Pre-fill fields if coach set them
      if (data.client_name) setName(data.client_name);
      if (data.client_email) setEmail(data.client_email);
      setLoading(false);
    };

    validate();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError(t.register.nameRequired); return; }
    if (!email.trim()) { setError(t.register.emailRequired); return; }
    if (password.length < 6) { setError(t.register.passwordMin); return; }
    if (password !== confirmPassword) { setError(t.register.passwordMismatch); return; }
    if (!invite) return;

    setSubmitting(true);

    try {
      // Call edge function to create auth user + client row (uses service role, bypasses RLS)
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-client`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'emailExists') {
          setError(t.register.emailExists);
        } else {
          setError(data.error || t.register.genericError);
        }
        setSubmitting(false);
        return;
      }

      // Edge function created the user — now sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(t.register.genericError);
        setSubmitting(false);
        return;
      }

      // Auto-login via onAuthStateChange — redirect to home
      const prefix = lang === 'pl' ? '/pl' : '';
      navigate(prefix + '/', { replace: true });
    } catch {
      setError(t.register.genericError);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.wrap}>
        <Loader2 size={32} color="var(--accent-primary)" className="spin" />
      </div>
    );
  }

  if (invalidCode) {
    return (
      <div style={styles.wrap}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={styles.card}
        >
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={48} color="var(--accent-danger)" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {t.register.invalidLink}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t.register.invalidLinkDesc}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <div style={styles.logoSub}>{t.register.portal}</div>
          </div>
        </div>

        <p style={styles.subtitle}>{t.register.subtitle}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>{t.register.fullName}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.register.namePlaceholder}
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>{t.register.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>{t.register.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          <div>
            <label style={styles.label}>{t.register.confirmPassword}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
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
            disabled={submitting}
            style={{
              ...styles.btn,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
            {submitting ? t.register.creating : t.register.createAccount}
          </button>
        </form>
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
};
