import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, Mail, Lock, ChevronDown } from 'lucide-react';
import { useLang } from './i18n';
import { useAuth } from './auth';

/* ═══════════════════════════════════════════════════════════
   FitCore Registration Page — Two-step form
   Step 1: Credentials (name, email, password, confirm)
   Step 2: Coaching profile (niche, client count — optional)
   ═══════════════════════════════════════════════════════════ */

const inputStyle: React.CSSProperties = {
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  paddingRight: '40px',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#8b92a5',
  marginBottom: '6px',
};

const iconWrapStyle: React.CSSProperties = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#525a6e',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
};

const chevronWrapStyle: React.CSSProperties = {
  position: 'absolute',
  right: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#525a6e',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
};

const slideVariants = {
  enterRight: { x: 60, opacity: 0 },
  enterLeft: { x: -60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitLeft: { x: -60, opacity: 0 },
  exitRight: { x: 60, opacity: 0 },
};

export default function RegisterPage() {
  const { lang, t } = useLang();
  const { register } = useAuth();
  const navigate = useNavigate();
  const ta = t.auth;

  const homeUrl = lang === 'pl' ? '/pl/' : '/';
  const loginUrl = lang === 'pl' ? '/pl/login' : '/login';
  const accountUrl = lang === 'pl' ? '/pl/account' : '/account';

  // ── Form state ──
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [coachingNiche, setCoachingNiche] = useState('');
  const [clientCount, setClientCount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Validation ──
  function validateStep1(): boolean {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError(ta.errorRequired);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(ta.errorEmailInvalid);
      return false;
    }
    if (password.length < 6) {
      setError(ta.errorPasswordShort);
      return false;
    }
    if (password !== confirmPassword) {
      setError(ta.errorPasswordMismatch);
      return false;
    }
    return true;
  }

  function handleContinue() {
    setError('');
    if (!validateStep1()) return;
    setDirection('forward');
    setStep(2);
  }

  function handleBack() {
    setError('');
    setDirection('back');
    setStep(1);
  }

  async function handleRegister(skip: boolean) {
    setError('');
    setLoading(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        coachingNiche: skip ? undefined : coachingNiche || undefined,
        clientCount: skip ? undefined : clientCount || undefined,
      });

      if (result.success) {
        navigate(accountUrl);
      } else if (result.error === 'emailExists') {
        setError(ta.errorEmailExists);
        setDirection('back');
        setStep(1);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Focus handlers ──
  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#00e5c8';
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.06)';
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0, 229, 200, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: -200, left: -200, width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Top-left back link ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 10,
        }}
      >
        <Link
          to={homeUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: '#8b92a5',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0f2f5')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8b92a5')}
        >
          <img
            src="/fitcore-logo.png"
            alt="FitCore"
            style={{ width: 28, height: 28, borderRadius: '50%' }}
          />
          <ArrowLeft size={14} />
          <span>{ta.backToHome}</span>
        </Link>
      </motion.div>

      {/* ── Centered card ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px 40px',
        position: 'relative',
        zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="register-card"
          style={{
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(14, 18, 27, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '40px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top glow line */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 2,
            background: 'linear-gradient(90deg, transparent, #00e5c8, transparent)',
          }} />

          {/* Step indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '28px',
          }}>
            <div style={{
              width: 32, height: 4, borderRadius: 2,
              background: '#00e5c8',
              transition: 'background 0.3s',
            }} />
            <div style={{
              width: 32, height: 4, borderRadius: 2,
              background: step === 2 ? '#00e5c8' : 'rgba(255, 255, 255, 0.08)',
              transition: 'background 0.3s',
            }} />
          </div>

          {/* AnimatePresence for step transitions */}
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 ? (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial={direction === 'back' ? 'enterLeft' : 'enterRight'}
                animate="center"
                exit={direction === 'forward' ? 'exitLeft' : 'exitRight'}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <h1 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    marginBottom: '8px',
                    color: '#f0f2f5',
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    {ta.registerTitle}
                  </h1>
                  <p style={{
                    fontSize: '14px',
                    color: '#8b92a5',
                    lineHeight: 1.5,
                  }}>
                    {ta.registerSubtitle}
                  </p>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Full Name */}
                  <div>
                    <label style={labelStyle}>{ta.fullNameLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconWrapStyle}>
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder={ta.fullNamePlaceholder}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>{ta.emailLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconWrapStyle}>
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={ta.emailPlaceholder}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={labelStyle}>{ta.passwordLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconWrapStyle}>
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={ta.passwordPlaceholder}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={labelStyle}>{ta.confirmPasswordLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconWrapStyle}>
                        <Lock size={16} />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={ta.confirmPasswordPlaceholder}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontSize: '13px',
                      color: '#ef4444',
                      lineHeight: 1.5,
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Continue button */}
                <button
                  onClick={handleContinue}
                  className="register-btn-primary"
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #00e5c8, #00c4aa)',
                    color: '#07090e',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 229, 200, 0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {ta.nextStep} <ArrowRight size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial={direction === 'forward' ? 'enterRight' : 'enterLeft'}
                animate="center"
                exit={direction === 'back' ? 'exitRight' : 'exitLeft'}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <h1 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    marginBottom: '8px',
                    color: '#f0f2f5',
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    {ta.profileStepTitle}
                  </h1>
                  <p style={{
                    fontSize: '14px',
                    color: '#8b92a5',
                    lineHeight: 1.5,
                  }}>
                    {ta.profileStepSubtitle}
                  </p>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Coaching Niche */}
                  <div>
                    <label style={labelStyle}>{ta.nicheLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconWrapStyle}>
                        <User size={16} />
                      </div>
                      <select
                        value={coachingNiche}
                        onChange={e => setCoachingNiche(e.target.value)}
                        style={selectStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      >
                        <option value="" style={{ background: '#0c1017', color: '#8b92a5' }}>
                          {lang === 'pl' ? 'Wybierz...' : 'Select...'}
                        </option>
                        {ta.nicheOptions.map((opt: string) => (
                          <option key={opt} value={opt} style={{ background: '#0c1017', color: '#f0f2f5' }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div style={chevronWrapStyle}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Client Count */}
                  <div>
                    <label style={labelStyle}>{ta.clientCountLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconWrapStyle}>
                        <User size={16} />
                      </div>
                      <select
                        value={clientCount}
                        onChange={e => setClientCount(e.target.value)}
                        style={selectStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      >
                        <option value="" style={{ background: '#0c1017', color: '#8b92a5' }}>
                          {lang === 'pl' ? 'Wybierz...' : 'Select...'}
                        </option>
                        {ta.clientCountOptions.map((opt: string) => (
                          <option key={opt} value={opt} style={{ background: '#0c1017', color: '#f0f2f5' }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div style={chevronWrapStyle}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontSize: '13px',
                      color: '#ef4444',
                      lineHeight: 1.5,
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Action buttons */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Create Account */}
                  <button
                    onClick={() => handleRegister(false)}
                    disabled={loading}
                    className="register-btn-primary"
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
                      fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif",
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 229, 200, 0.3)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          style={{
                            width: 16, height: 16, borderRadius: '50%',
                            border: '2px solid rgba(7, 9, 14, 0.3)',
                            borderTopColor: '#07090e',
                          }}
                        />
                        {ta.creatingAccount}
                      </>
                    ) : (
                      <>
                        {ta.createAccount} <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {/* Back + Skip row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <button
                      onClick={handleBack}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#8b92a5',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: "'Outfit', sans-serif",
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 0',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.color = '#f0f2f5'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#8b92a5'; }}
                    >
                      <ArrowLeft size={14} /> {ta.backStep}
                    </button>

                    <button
                      onClick={() => handleRegister(true)}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#00e5c8',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: "'Outfit', sans-serif",
                        cursor: loading ? 'not-allowed' : 'pointer',
                        padding: '8px 0',
                        transition: 'opacity 0.2s',
                        opacity: loading ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.5' : '1'; }}
                    >
                      {ta.skipForNow}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Divider ── */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '13px', color: '#525a6e' }}>
              {ta.hasAccount}{' '}
              <Link
                to={loginUrl}
                style={{
                  color: '#00e5c8',
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {ta.signInLink}
              </Link>
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Responsive + focus styles ── */}
      <style>{`
        @media (max-width: 480px) {
          .register-card {
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 12px !important;
            padding: 28px 16px !important;
          }
        }

        .register-card input::placeholder,
        .register-card select::placeholder {
          color: #525a6e;
          font-family: 'Outfit', sans-serif;
        }

        .register-card input:focus,
        .register-card select:focus {
          border-color: #00e5c8 !important;
          box-shadow: 0 0 0 3px rgba(0, 229, 200, 0.08);
        }

        .register-btn-primary:active {
          transform: translateY(0) !important;
        }

        .register-card select option {
          background: #0c1017;
          color: #f0f2f5;
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
    </div>
  );
}
