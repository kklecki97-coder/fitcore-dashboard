import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Clock, ExternalLink, LogOut, Trash2, Edit3, Check, X, Dumbbell } from 'lucide-react';
import { useLang } from './i18n';
import { useAuth } from './auth';

/* ═══════════════════════════════════════════════════════════
   FitCore Account Page — Dark luxe futuristic theme
   Protected route — expects user to be non-null (ProtectedRoute wrapper)
   ═══════════════════════════════════════════════════════════ */

export default function AccountPage() {
  const { lang, t } = useLang();
  const { user, isTrialActive, trialDaysRemaining, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const ta = t.auth;

  // ── Local state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNiche, setEditNiche] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem('fitcore-welcome-dismissed') === 'true'; } catch { return false; }
  });

  // ── Lang-aware links ──
  const homeUrl = lang === 'pl' ? '/pl/' : '/';

  // ── Null guard (ProtectedRoute handles redirect, but be safe) ──
  if (!user) return null;

  // ── Helpers ──
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(
      lang === 'pl' ? 'pl-PL' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

  const trialTotalDays = 14;
  const trialElapsed = trialTotalDays - trialDaysRemaining;
  const trialPercent = Math.min(100, Math.max(0, (trialElapsed / trialTotalDays) * 100));
  const trialExpired = user.plan === 'trial' && trialDaysRemaining <= 0;

  // ── Edit handlers ──
  const startEditing = () => {
    setEditName(user.fullName);
    setEditNiche(user.coachingNiche || '');
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateProfile({ fullName: editName.trim() || user.fullName, coachingNiche: editNiche.trim() || undefined });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate(homeUrl);
  };

  const handleDeleteAccount = () => {
    // Remove user from localStorage
    try {
      const usersRaw = localStorage.getItem('fitcore-demo-users');
      if (usersRaw) {
        const users = JSON.parse(usersRaw);
        const filtered = users.filter((u: { id: string }) => u.id !== user.id);
        localStorage.setItem('fitcore-demo-users', JSON.stringify(filtered));
      }
    } catch { /* ignore */ }
    logout();
    navigate(homeUrl);
  };

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    try { localStorage.setItem('fitcore-welcome-dismissed', 'true'); } catch { /* ignore */ }
  };

  // ── Glass card style ──
  const glassCard: React.CSSProperties = {
    background: 'rgba(14, 18, 27, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '28px 28px',
    position: 'relative',
    overflow: 'hidden',
  };

  const glassGlow: React.CSSProperties = {
    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: 200, height: 2,
    background: 'linear-gradient(90deg, transparent, #00e5c8, transparent)',
    pointerEvents: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: "'Outfit', sans-serif" }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0, 229, 200, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ══════════ TOP BAR ══════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(7, 9, 14, 0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '0 24px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Link to={homeUrl} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none',
        }}>
          <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f0f2f5', letterSpacing: -0.3 }}>
            Fit<span style={{ color: '#00e5c8' }}>Core</span>
          </span>
        </Link>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#8b92a5', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            padding: '8px 16px', borderRadius: 8, transition: 'all 0.2s',
            fontFamily: "'Outfit', sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8b92a5'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
        >
          <LogOut size={14} />
          {ta.logOut}
        </button>
      </motion.nav>


      {/* ══════════ MAIN CONTENT ══════════ */}
      <div style={{
        maxWidth: 720, margin: '0 auto', padding: '40px 24px 120px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginBottom: 32 }}
        >
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: '#f0f2f5',
            letterSpacing: -0.8, margin: 0,
          }}>
            {ta.accountTitle}
          </h1>
        </motion.div>


        {/* ── WELCOME BANNER ── */}
        {!welcomeDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              ...glassCard,
              border: '1px solid rgba(0, 229, 200, 0.15)',
              marginBottom: 24,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
            }}
          >
            <div style={{ ...glassGlow }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f2f5', marginBottom: 6 }}>
                {ta.welcomeMessage}
              </div>
              <div style={{ fontSize: 14, color: '#8b92a5', lineHeight: 1.5 }}>
                {ta.welcomeSubtext}
              </div>
            </div>
            <button
              onClick={dismissWelcome}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: '#8b92a5', flexShrink: 0, transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0f2f5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8b92a5')}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}


        {/* ── PROFILE CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ ...glassCard, marginBottom: 24 }}
        >
          <div style={{ ...glassGlow }} />

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#8b92a5',
              letterSpacing: 1.5, textTransform: 'uppercase',
            }}>
              {ta.profileSection}
            </span>
            {!isEditing ? (
              <button
                onClick={startEditing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#8b92a5', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 6, transition: 'all 0.2s',
                  fontFamily: "'Outfit', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#00e5c8'; e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b92a5'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <Edit3 size={12} />
                {ta.editProfile}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={saveEdit}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.3)',
                    color: '#00e5c8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    padding: '6px 14px', borderRadius: 6, transition: 'all 0.2s',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 229, 200, 0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)'; }}
                >
                  <Check size={12} />
                  {ta.saveChanges}
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#8b92a5', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    padding: '6px 12px', borderRadius: 6, transition: 'all 0.2s',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f0f2f5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8b92a5')}
                >
                  <X size={12} />
                  {ta.cancelEdit}
                </button>
              </div>
            )}
          </div>

          {/* Profile body */}
          <div className="account-profile-body" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Initials avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#00e5c8', color: '#07090e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, flexShrink: 0,
              fontFamily: "'Outfit', sans-serif",
            }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name */}
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{
                    fontSize: 20, fontWeight: 700, color: '#f0f2f5',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(0, 229, 200, 0.3)',
                    borderRadius: 8, padding: '6px 12px',
                    width: '100%', marginBottom: 8, outline: 'none',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#00e5c8')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.3)')}
                />
              ) : (
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f2f5', marginBottom: 4 }}>
                  {user.fullName}
                </div>
              )}

              {/* Email */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: '#8b92a5', marginBottom: 14,
              }}>
                <Mail size={13} style={{ opacity: 0.6 }} />
                {user.email}
              </div>

              {/* Meta row */}
              <div className="account-meta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: isEditing ? 12 : 0 }}>
                {/* Coaching niche */}
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Dumbbell size={13} style={{ color: '#00e5c8', opacity: 0.7 }} />
                    <input
                      type="text"
                      value={editNiche}
                      onChange={e => setEditNiche(e.target.value)}
                      placeholder={ta.coachingNicheLabel}
                      style={{
                        fontSize: 12, color: '#f0f2f5',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(0, 229, 200, 0.2)',
                        borderRadius: 6, padding: '5px 10px',
                        outline: 'none', width: 180,
                        fontFamily: "'Outfit', sans-serif",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#00e5c8')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.2)')}
                    />
                  </div>
                ) : user.coachingNiche ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(0, 229, 200, 0.08)',
                    border: '1px solid rgba(0, 229, 200, 0.15)',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, fontWeight: 500, color: '#00e5c8',
                  }}>
                    <Dumbbell size={12} />
                    {user.coachingNiche}
                  </div>
                ) : null}

                {/* Client count */}
                {user.clientCount && !isEditing && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, fontWeight: 500, color: '#818cf8',
                  }}>
                    <User size={12} />
                    {user.clientCount} {ta.clientCountDisplay}
                  </div>
                )}

                {/* Member since */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: '#8b92a5',
                }}>
                  <Calendar size={12} style={{ opacity: 0.6 }} />
                  {ta.memberSince} {formatDate(user.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>


        {/* ── SUBSCRIPTION CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            ...glassCard,
            marginBottom: 24,
            border: trialExpired
              ? '1px solid rgba(245, 158, 11, 0.25)'
              : '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{
            ...glassGlow,
            background: trialExpired
              ? 'linear-gradient(90deg, transparent, #f59e0b, transparent)'
              : 'linear-gradient(90deg, transparent, #00e5c8, transparent)',
          }} />

          <div style={{
            fontSize: 11, fontWeight: 700, color: '#8b92a5',
            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20,
          }}>
            {ta.subscriptionSection}
          </div>

          {/* Plan header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f0f2f5' }}>
              {ta.planName}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#07090e', margin: '1px 0' }}>
              &mdash;
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: trialExpired
                ? 'rgba(239, 68, 68, 0.12)'
                : isTrialActive
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'rgba(99, 102, 241, 0.12)',
              color: trialExpired
                ? '#ef4444'
                : isTrialActive
                  ? '#22c55e'
                  : '#818cf8',
              border: `1px solid ${trialExpired ? 'rgba(239, 68, 68, 0.25)' : isTrialActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {trialExpired ? ta.planExpired : isTrialActive ? ta.planTrial : ta.planActive}
            </span>
          </div>

          {/* Trial progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f2f5' }}>
                {trialDaysRemaining} {ta.trialDaysLeft}
              </span>
              <span style={{
                fontSize: 12, color: '#8b92a5',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {trialDaysRemaining}/{trialTotalDays}
              </span>
            </div>
            <div style={{
              width: '100%', height: 6, borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - trialPercent}%` }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: 3,
                  background: trialExpired
                    ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                    : trialDaysRemaining <= 3
                      ? 'linear-gradient(90deg, #f59e0b, #22c55e)'
                      : 'linear-gradient(90deg, #00e5c8, #22c55e)',
                }}
              />
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b92a5' }}>
              <Clock size={13} style={{ opacity: 0.6 }} />
              <span style={{ fontWeight: 500 }}>{ta.trialStarted}:</span>
              <span style={{ color: '#f0f2f5', fontWeight: 600 }}>{formatDate(user.trialStartDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b92a5' }}>
              <Calendar size={13} style={{ opacity: 0.6 }} />
              <span style={{ fontWeight: 500 }}>{ta.trialEnds}:</span>
              <span style={{
                color: trialExpired ? '#ef4444' : '#f0f2f5',
                fontWeight: 600,
              }}>{formatDate(user.trialEndDate)}</span>
            </div>
          </div>
        </motion.div>


        {/* ── QUICK ACTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ ...glassCard, marginBottom: 48 }}
        >
          <div style={{ ...glassGlow }} />

          <div style={{
            fontSize: 11, fontWeight: 700, color: '#8b92a5',
            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20,
          }}>
            {ta.quickActions}
          </div>

          <div className="account-actions-row" style={{ display: 'flex', gap: 12 }}>
            {/* Open Dashboard */}
            <a
              href="https://app.fitcore.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="account-action-btn"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, #00e5c8, #00c4aa)',
                color: '#07090e', padding: '14px 20px', borderRadius: 10,
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 229, 200, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <ExternalLink size={15} />
              {ta.goToDashboard}
            </a>

            {/* Book a Demo */}
            <a
              href="https://cal.com/fitcore/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="account-action-btn"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: '#818cf8', padding: '14px 20px', borderRadius: 10,
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
                transition: 'all 0.2s',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <ExternalLink size={15} />
              {ta.bookDemoAction}
            </a>

            {/* Log Out */}
            <button
              onClick={handleLogout}
              className="account-action-btn"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#ef4444', padding: '14px 20px', borderRadius: 10,
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <LogOut size={15} />
              {ta.logOut}
            </button>
          </div>
        </motion.div>


        {/* ── DELETE ACCOUNT ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#8b92a5', fontSize: 13, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                transition: 'color 0.2s',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8b92a5')}
            >
              <Trash2 size={13} />
              {ta.deleteAccount}
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 12, padding: '20px 28px',
              }}
            >
              <div style={{ fontSize: 13, color: '#f0f2f5', lineHeight: 1.5, maxWidth: 340 }}>
                {ta.deleteAccountConfirm}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', padding: '8px 18px', borderRadius: 8,
                    transition: 'all 0.2s',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                >
                  <Trash2 size={13} />
                  {ta.deleteAccountButton}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    background: 'none', border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#8b92a5', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', padding: '8px 18px', borderRadius: 8,
                    transition: 'color 0.2s',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f0f2f5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8b92a5')}
                >
                  {ta.cancelEdit}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>


      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        @media (max-width: 640px) {
          .account-profile-body {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .account-meta-row {
            justify-content: center !important;
          }
          .account-actions-row {
            flex-direction: column !important;
          }
          .account-action-btn {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
