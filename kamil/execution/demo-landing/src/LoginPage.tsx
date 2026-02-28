import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useLang } from './i18n';
import { useAuth } from './auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t } = useLang();
  const { login, isLoggedIn } = useAuth();
  const ta = t.auth;

  // Where to go after login (defaults to /account, or wherever they came from)
  const from = (location.state as { from?: string })?.from || (lang === 'pl' ? '/pl/account' : '/account');

  // ── Redirect if already logged in ──
  useEffect(() => {
    if (isLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, from, navigate]);

  // ── Form state ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);

  // ── Focus state for input borders ──
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // ── Lang-aware routes ──
  const homeUrl = lang === 'pl' ? '/pl/' : '/';
  const registerUrl = lang === 'pl' ? '/pl/register' : '/register';

  // ── Submit handler ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowForgotNote(false);

    // Validate required fields
    if (!email.trim() || !password.trim()) {
      setError(ta.errorRequired);
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(ta.errorInvalidCredentials);
      }
    } catch {
      setError(ta.errorInvalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input styles ──
  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    paddingLeft: '44px',
    background: 'rgba(22, 28, 42, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    color: '#f0f2f5',
    fontSize: '14px',
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const inputFocused: React.CSSProperties = {
    ...inputBase,
    borderColor: '#00e5c8',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#8b92a5',
    marginBottom: '8px',
  };

  const iconWrapStyle: React.CSSProperties = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#525a6e',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '40px 20px',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0, 229, 200, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Top-left: Logo + Back link ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'fixed',
          top: 24,
          left: 28,
          zIndex: 100,
        }}
      >
        <Link
          to={homeUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: '#8b92a5',
            fontSize: 14,
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0f2f5')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8b92a5')}
        >
          <img
            src="/fitcore-logo.png"
            alt="FitCore"
            style={{ width: 32, height: 32, borderRadius: '50%' }}
          />
          <span style={{ fontWeight: 600 }}>
            Fit<span style={{ color: '#00e5c8' }}>Core</span>
          </span>
        </Link>
      </motion.div>

      {/* ── Login card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(14, 18, 27, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Top glow accent */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 2,
          background: 'linear-gradient(90deg, transparent, #00e5c8, transparent)',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#f0f2f5',
            marginBottom: 8,
          }}>
            {ta.loginTitle}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#8b92a5',
            lineHeight: 1.5,
          }}>
            {ta.loginSubtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Email field */}
          <div>
            <label style={labelStyle}>{ta.emailLabel}</label>
            <div style={{ position: 'relative' }}>
              <div style={iconWrapStyle}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder={ta.emailPlaceholder}
                autoComplete="email"
                style={emailFocused ? inputFocused : inputBase}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label style={labelStyle}>{ta.passwordLabel}</label>
            <div style={{ position: 'relative' }}>
              <div style={iconWrapStyle}>
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={ta.passwordPlaceholder}
                autoComplete="current-password"
                style={passwordFocused ? inputFocused : inputBase}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#525a6e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#8b92a5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#525a6e')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ marginTop: -8 }}>
            <button
              type="button"
              onClick={() => setShowForgotNote(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00e5c8',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
                fontFamily: "'Outfit', sans-serif",
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {ta.forgotPassword}
            </button>
            {showForgotNote && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
                style={{
                  fontSize: '12px',
                  color: '#8b92a5',
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                {ta.forgotPasswordNote}
              </motion.p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: '13px',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
                lineHeight: 1.5,
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.01 }}
            whileTap={loading ? {} : { scale: 0.98 }}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading
                ? 'linear-gradient(135deg, rgba(0, 229, 200, 0.5), rgba(0, 196, 170, 0.5))'
                : 'linear-gradient(135deg, #00e5c8, #00c4aa)',
              color: '#07090e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'box-shadow 0.2s',
              marginTop: 4,
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 229, 200, 0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? ta.signingIn : ta.loginButton}
          </motion.button>
        </form>

        {/* Bottom: Sign up link */}
        <div style={{
          textAlign: 'center',
          marginTop: 28,
          fontSize: '13px',
          color: '#8b92a5',
        }}>
          {ta.noAccount}{' '}
          <Link
            to={registerUrl}
            style={{
              color: '#00e5c8',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {ta.signUpLink}
          </Link>
        </div>
      </motion.div>

      {/* ── Responsive ── */}
      <style>{`
        @media (max-width: 480px) {
          .login-card {
            max-width: 100% !important;
            padding: 32px 20px !important;
            border-radius: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
