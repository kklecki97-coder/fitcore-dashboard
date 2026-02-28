import { useRef, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Dumbbell, BarChart3,
  Zap, ChevronRight, ChevronLeft, ArrowRight, Menu, X,
  Mail, CheckCircle2,
  LayoutDashboard,
  AlertTriangle, Eye, TrendingUp,
  Clock, DollarSign, UserMinus,
} from 'lucide-react';
import { useLang } from './i18n';
import type { Lang } from './i18n';
import { useAuth } from './auth';

/* ═══════════════════════════════════════════════════════════
   FitCore Demo Landing Page — Identity-Driven Redesign
   Positioning: Custom-built platforms for elite fitness coaches
   ═══════════════════════════════════════════════════════════ */


// ── Reusable animated section wrapper ──
function Section({ children, id, style }: { children: React.ReactNode; id?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'relative', zIndex: 1, ...style }}
    >
      {children}
    </motion.section>
  );
}

// ── Glass Card ──
function GlassCard({ children, style, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.12)' }}
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        boxShadow: 'var(--shadow-card)',
        transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Screenshot Carousel ──
interface Screenshot { src: string; label: string; desc: string; }

function ScreenshotCarousel({ screenshots }: { screenshots: Screenshot[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = () => { setDirection(1); setCurrent(i => (i + 1) % screenshots.length); };
  const prev = () => { setDirection(-1); setCurrent(i => (i - 1 + screenshots.length) % screenshots.length); };

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, []);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: '0 8px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--glass-border)',
      }}>
        <div style={{
          padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center',
          borderBottom: '1px solid var(--glass-border)',
          background: 'rgba(7, 9, 14, 0.8)',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <div style={{
            flex: 1, background: 'var(--bg-elevated)', borderRadius: 8,
            padding: '6px 16px', fontSize: 12, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)', maxWidth: 400,
          }}>
            app.fitcore.tech/{screenshots[current].label.toLowerCase().replace(/ /g, '-')}
          </div>
        </div>

        <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--bg-primary)' }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.img
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              src={screenshots[current].src}
              alt={screenshots[current].label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </AnimatePresence>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 24, padding: '0 4px',
      }}>
        <button onClick={prev} style={{
          background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', cursor: 'pointer',
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--glass-border-hover)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
        ><ChevronLeft size={18} /></button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {screenshots[current].label}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {screenshots[current].desc}
          </div>
        </div>

        <button onClick={next} style={{
          background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', cursor: 'pointer',
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--glass-border-hover)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
        ><ChevronRight size={18} /></button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {screenshots.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            style={{
              width: i === current ? 24 : 8, height: 8,
              borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === current ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              transition: 'all 0.3s', opacity: i === current ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════ */
export default function App() {
  const { lang, t, switchLang } = useLang();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.96]);

  const checkoutUrl = lang === 'pl' ? '/pl/checkout' : '/checkout';
  const accountUrl = lang === 'pl' ? '/pl/account' : '/account';
  const loginUrl = lang === 'pl' ? '/pl/login' : '/login';
  const { isLoggedIn } = useAuth();

  const handleLangToggle = () => {
    const newLang: Lang = lang === 'en' ? 'pl' : 'en';
    switchLang(newLang);
    navigate(newLang === 'pl' ? '/pl/' : '/');
  };

  const screenshots: Screenshot[] = [
    { src: '/1-overview.png', label: t.carousel.labels[0], desc: t.carousel.descs[0] },
    { src: '/2-clients.png', label: t.carousel.labels[1], desc: t.carousel.descs[1] },
    { src: '/3-programs.png', label: t.carousel.labels[2], desc: t.carousel.descs[2] },
    { src: '/4-messages.png', label: t.carousel.labels[3], desc: t.carousel.descs[3] },
    { src: '/5-analytics.png', label: t.carousel.labels[4], desc: t.carousel.descs[4] },
  ];

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.howItWorks, href: '#how-it-works' },
    { label: t.nav.pricing, href: '#pricing' },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* ── Ambient Glow Orbs ── */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, var(--accent-primary-dim) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0, animation: 'float-orb 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: -300, left: -200, width: 500, height: 500,
        background: 'radial-gradient(circle, var(--accent-secondary-dim) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0, animation: 'float-orb-2 25s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-80px, 60px); }
          66% { transform: translate(40px, -40px); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(60px, -40px); }
          66% { transform: translate(-40px, 60px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px var(--accent-primary-dim), 0 0 60px rgba(0, 229, 200, 0.1); }
          50% { box-shadow: 0 0 30px var(--accent-primary-glow), 0 0 80px rgba(0, 229, 200, 0.15); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════
          NAVIGATION
         ════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(7, 9, 14, 0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '0 24px', height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: '100%',
        }}
      >
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5, color: 'var(--text-primary)' }}>
            Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
          </div>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="nav-desktop">
          {navLinks.map(link => (
            <a key={link.href} href={link.href} style={{
              color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'color 0.2s', letterSpacing: 0.3,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >{link.label}</a>
          ))}
          <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
            background: 'transparent',
            border: '1px solid rgba(0, 229, 200, 0.4)',
            color: 'var(--accent-primary)', padding: '10px 20px', borderRadius: 'var(--radius-sm)',
            fontWeight: 600, fontSize: 13, textDecoration: 'none', letterSpacing: 0.3,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.7)'; e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)'; e.currentTarget.style.background = 'transparent'; }}
          >{t.nav.bookDemo}</a>
          <Link to={isLoggedIn ? accountUrl : checkoutUrl} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
            color: '#07090e', padding: '10px 22px', borderRadius: 'var(--radius-sm)',
            fontWeight: 700, fontSize: 13, textDecoration: 'none', letterSpacing: 0.3,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-primary-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >{isLoggedIn ? t.auth.myAccount : t.nav.startNow} <ArrowRight size={14} /></Link>
          {!isLoggedIn && (
            <Link to={loginUrl} style={{
              color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'color 0.2s', letterSpacing: 0.3,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >{t.nav.login}</Link>
          )}
          <button onClick={handleLangToggle} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)', padding: '8px 14px', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: 0.8,
            fontFamily: 'var(--font-display)', transition: 'border-color 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >{lang === 'en' ? 'PL' : 'EN'}</button>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="nav-mobile-toggle"
          style={{
            display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)',
            cursor: 'pointer', padding: 8,
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nav-mobile-menu"
            style={{
              position: 'absolute', top: 72, left: 0, right: 0,
              background: 'rgba(7, 9, 14, 0.95)', backdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--glass-border)',
              padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            {navLinks.map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 16, fontWeight: 500, padding: '8px 0' }}>
                {link.label}
              </a>
            ))}
            <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} style={{
              background: 'transparent',
              border: '1px solid rgba(0, 229, 200, 0.4)',
              color: 'var(--accent-primary)', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}>{t.nav.bookDemo}</a>
            {!isLoggedIn && (
              <Link to={loginUrl} onClick={() => setMobileMenuOpen(false)} style={{
                color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 16, fontWeight: 500, padding: '8px 0',
                textAlign: 'center',
              }}>{t.nav.login}</Link>
            )}
            <Link to={isLoggedIn ? accountUrl : checkoutUrl} onClick={() => setMobileMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}>{isLoggedIn ? t.auth.myAccount : t.nav.startNow} <ArrowRight size={15} /></Link>
            <button onClick={() => { handleLangToggle(); setMobileMenuOpen(false); }} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)', padding: '12px 24px', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, letterSpacing: 0.8,
              fontFamily: 'var(--font-display)', textAlign: 'center',
            }}>{lang === 'en' ? 'PL \ud83c\uddf5\ud83c\uddf1' : 'EN \ud83c\uddec\ud83c\udde7'}</button>
          </motion.div>
        )}
      </motion.nav>


      {/* ════════════════════════════════════════════════════════
          HERO — IDENTITY-DRIVEN
         ════════════════════════════════════════════════════════ */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }}>
        <section style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '60px 24px 32px', position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--accent-primary-dim)', border: '1px solid rgba(0, 229, 200, 0.2)',
              borderRadius: 100, padding: '8px 20px', marginBottom: 32,
              animation: 'float-badge 3s ease-in-out infinite',
            }}
          >
            <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 0.5 }}>
              {t.hero.badge}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.08,
              letterSpacing: '-2px', marginBottom: 24, maxWidth: 900,
            }}
          >
            {t.hero.title1}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
              {t.hero.title2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-secondary)', lineHeight: 1.6,
              maxWidth: 620, marginBottom: 48, fontWeight: 400,
            }}
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', padding: '16px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 700, fontSize: 16, textDecoration: 'none', letterSpacing: 0.3,
              animation: 'pulse-glow 3s ease-in-out infinite',
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {t.hero.ctaPrimary} <ArrowRight size={18} />
            </a>
            <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)', padding: '16px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 16, textDecoration: 'none', letterSpacing: 0.3,
              backdropFilter: 'blur(20px)', transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {t.hero.ctaSecondary} <ArrowRight size={18} />
            </a>
          </motion.div>
        </section>
      </motion.div>


      {/* ════════════════════════════════════════════════════════
          THE REAL PROBLEM — EMOTIONAL, NOT OPERATIONAL
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: -1.5 }}>
              {t.pain.heading1}{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t.pain.heading2}</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }} className="pain-cards-grid">
            {/* Card 1 — The Admin Trap */}
            <GlassCard delay={0} style={{ padding: '32px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Clock size={22} style={{ color: 'var(--accent-danger)' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
                {t.pain.card1Title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t.pain.card1Body}
              </p>
            </GlassCard>

            {/* Card 2 — The Perception Gap (slightly elevated) */}
            <GlassCard delay={0.1} style={{
              padding: '36px 32px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              background: 'linear-gradient(160deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 60%)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Eye size={24} style={{ color: 'var(--accent-warm)' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--accent-warm)' }}>
                {t.pain.card2Title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t.pain.card2Body}
              </p>
            </GlassCard>

            {/* Card 3 — The Invisible Ceiling (climax — strongest styling) */}
            <GlassCard delay={0.2} style={{
              padding: '36px 32px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'linear-gradient(160deg, rgba(99, 102, 241, 0.07) 0%, var(--bg-card) 60%)',
              boxShadow: '0 4px 32px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(99, 102, 241, 0.15)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <TrendingUp size={24} style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--accent-secondary)' }}>
                {t.pain.card3Title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t.pain.card3Body}
              </p>
            </GlassCard>
          </div>
        </div>
      </Section>


      {/* ════════════════════════════════════════════════════════
          COACH DASHBOARD — SCREENSHOT CAROUSEL
         ════════════════════════════════════════════════════════ */}
      <Section id="features">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <LayoutDashboard size={14} /> {t.dashboard.badge}
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5 }}>
              {t.dashboard.heading}
            </h2>
          </div>
        </div>
      </Section>

      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
          <ScreenshotCarousel screenshots={screenshots} />
        </div>
      </Section>


      {/* ── Stakes Bridge Line ── */}
      <Section>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <p style={{
            fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, lineHeight: 1.15,
            letterSpacing: '-1.5px', margin: '0 auto',
          }}>
            {t.stakes.line1}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-danger), var(--accent-warm), var(--accent-danger))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
              {t.stakes.line2}
            </span>
          </p>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          THE COST — WHAT DISORGANIZATION ACTUALLY COSTS YOU
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              {t.cost.heading}
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              {t.cost.subheading}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }} className="stat-cards-grid">
            {[
              {
                icon: Clock,
                question: t.cost.cards[0].question,
                followup: t.cost.cards[0].followup,
                color: 'var(--accent-danger)',
                bg: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(239, 68, 68, 0.04) 0%, var(--bg-card) 60%)',
              },
              {
                icon: DollarSign,
                question: t.cost.cards[1].question,
                followup: t.cost.cards[1].followup,
                color: 'var(--accent-warm)',
                bg: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 60%)',
              },
              {
                icon: UserMinus,
                question: t.cost.cards[2].question,
                followup: t.cost.cards[2].followup,
                color: 'var(--accent-secondary)',
                bg: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                gradient: 'linear-gradient(160deg, rgba(99, 102, 241, 0.06) 0%, var(--bg-card) 60%)',
              },
              {
                icon: AlertTriangle,
                question: t.cost.cards[3].question,
                followup: t.cost.cards[3].followup,
                color: 'var(--accent-primary)',
                bg: 'rgba(0, 229, 200, 0.1)',
                border: '1px solid rgba(0, 229, 200, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(0, 229, 200, 0.04) 0%, var(--bg-card) 60%)',
              },
            ].map((stat, i) => (
              <GlassCard key={i} delay={i * 0.08} style={{
                padding: '40px 28px 36px', textAlign: 'center',
                border: stat.border,
                background: stat.gradient,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: stat.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24,
                }}>
                  <stat.icon size={22} style={{ color: stat.color }} />
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: stat.color,
                  lineHeight: 1.4, marginBottom: 12, minHeight: '66px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {stat.question}
                </div>
                <div style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, fontStyle: 'italic',
                }}>
                  {stat.followup}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>



      {/* ════════════════════════════════════════════════════════
          FEATURE ROWS — ALTERNATING IMAGE + TEXT
         ════════════════════════════════════════════════════════ */}

      {/* Feature 1: Client Management */}
      <Section id="how-it-works">
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
        }} className="feature-row">
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'var(--accent-primary-dim)', borderRadius: 8, padding: '6px 14px',
            }}>
              <Users size={15} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t.features.clients.badge}</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              {t.features.clients.heading}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              {t.features.clients.body}
            </p>
            <a href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)',
              textDecoration: 'none', transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.clients.cta} <ArrowRight size={14} /></a>
          </div>
          <div>
            <img src="/2-clients.png" alt="Client management" style={{
              width: '100%', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            }} />
          </div>
        </div>
      </Section>

      {/* Feature 2: Unified Inbox — reversed */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
        }} className="feature-row-reverse">
          <div className="feature-image-reverse">
            <img src="/4-messages.png" alt="Unified inbox" style={{
              width: '100%', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            }} />
          </div>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'rgba(41, 171, 226, 0.12)', borderRadius: 8, padding: '6px 14px',
            }}>
              <MessageSquare size={15} style={{ color: '#29ABE2' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#29ABE2', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t.features.inbox.badge}</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              {t.features.inbox.heading}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              {t.features.inbox.body}
            </p>
            <a href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: '#29ABE2',
              textDecoration: 'none', transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.inbox.cta} <ArrowRight size={14} /></a>
          </div>
        </div>
      </Section>

      {/* Feature 3: Workout Programs */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
        }} className="feature-row">
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'var(--accent-secondary-dim)', borderRadius: 8, padding: '6px 14px',
            }}>
              <Dumbbell size={15} style={{ color: 'var(--accent-secondary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t.features.workouts.badge}</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              {t.features.workouts.heading}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              {t.features.workouts.body}
            </p>
            <a href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: 'var(--accent-secondary)',
              textDecoration: 'none', transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.workouts.cta} <ArrowRight size={14} /></a>
          </div>
          <div>
            <img src="/3-programs.png" alt="Workout programs" style={{
              width: '100%', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            }} />
          </div>
        </div>
      </Section>

      {/* Feature 4: Analytics — reversed */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
        }} className="feature-row-reverse">
          <div className="feature-image-reverse">
            <img src="/5-analytics.png" alt="Analytics and revenue" style={{
              width: '100%', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            }} />
          </div>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'var(--accent-warm-dim)', borderRadius: 8, padding: '6px 14px',
            }}>
              <BarChart3 size={15} style={{ color: 'var(--accent-warm)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t.features.analytics.badge}</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              {t.features.analytics.heading}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              {t.features.analytics.body}
            </p>
            <a href="#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: 'var(--accent-warm)',
              textDecoration: 'none', transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.analytics.cta} <ArrowRight size={14} /></a>
          </div>
        </div>
      </Section>



      {/* ════════════════════════════════════════════════════════
          CLOSING SECTION 1 — THE FORK IN THE ROAD
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1 }}>
              {t.fork.heading1}{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t.fork.heading2}</span>
            </h2>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            border: '1px solid var(--glass-border)',
          }} className="fork-grid">
            {/* Left — staying put */}
            <div style={{
              padding: '48px 40px',
              background: 'linear-gradient(160deg, rgba(239, 68, 68, 0.06) 0%, rgba(7, 9, 14, 0.95) 100%)',
              borderRight: '1px solid var(--glass-border)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent-danger)',
                letterSpacing: 2, textTransform: 'uppercase', marginBottom: 28,
              }}>
                {t.fork.withoutLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {t.fork.without.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-danger)',
                      flexShrink: 0, marginTop: 8,
                    }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.stat}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — with FitCore */}
            <div style={{
              padding: '48px 40px',
              background: 'linear-gradient(160deg, rgba(0, 229, 200, 0.06) 0%, rgba(7, 9, 14, 0.95) 100%)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)',
                letterSpacing: 2, textTransform: 'uppercase', marginBottom: 28,
              }}>
                {t.fork.withLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {t.fork.with.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)',
                      flexShrink: 0, marginTop: 8,
                    }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.stat}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </Section>


      {/* ════════════════════════════════════════════════════════
          PRICING
         ════════════════════════════════════════════════════════ */}
      <Section id="pricing">
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              {t.pricing.heading1}{' '}
              <span style={{ color: 'var(--accent-primary)' }}>{t.pricing.heading2}</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6, marginBottom: 20 }}>
              {t.pricing.subheading}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 100, padding: '7px 18px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-warm)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-warm)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {t.pricing.limitedBadge}
              </span>
            </div>
          </div>

          {/* Pricing card */}
          <GlassCard style={{
            padding: '0',
            border: '1px solid rgba(0, 229, 200, 0.2)',
            background: 'linear-gradient(160deg, rgba(14, 18, 27, 0.98) 0%, rgba(10, 13, 20, 0.98) 100%)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Top glow accent */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 400, height: 2,
              background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
            }} />

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
            }} className="pricing-inner-grid">

              {/* Left — price block */}
              <div style={{
                padding: '52px 48px',
                borderRight: '1px solid var(--glass-border)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                {/* Free trial */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
                    {t.pricing.startFreeLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontSize: 48, fontWeight: 800, color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -2, lineHeight: 1,
                    }}>{t.pricing.trialPrice}</span>
                    <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500 }}>{t.pricing.trialDuration}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
                    {t.pricing.trialNote}
                  </div>
                  {/* Trial badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14,
                    background: 'var(--accent-primary-dim)', border: '1px solid rgba(0, 229, 200, 0.2)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 16px',
                  }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {t.pricing.trialBadge}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--glass-border)', marginBottom: 32 }} />

                {/* After trial */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
                    {t.pricing.afterTrialLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 48, fontWeight: 800, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -2, lineHeight: 1,
                    }}>{t.pricing.setupPrice}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{t.pricing.oneTime}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{t.pricing.plus}</span>
                    <span style={{
                      fontSize: 32, fontWeight: 800, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -1, lineHeight: 1,
                    }}>{t.pricing.monthlyPrice}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{t.pricing.perMonth}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {t.pricing.cancelNote}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link to={checkoutUrl} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                    color: '#07090e', padding: '15px 32px', borderRadius: 'var(--radius-md)',
                    fontWeight: 700, fontSize: 15, textDecoration: 'none',
                    animation: 'pulse-glow 3s ease-in-out infinite',
                    transition: 'transform 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {t.pricing.ctaPrimary} <ArrowRight size={16} />
                  </Link>
                  <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'transparent',
                    border: '1px solid rgba(0, 229, 200, 0.3)',
                    color: 'var(--accent-primary)', padding: '12px 28px', borderRadius: 'var(--radius-md)',
                    fontWeight: 600, fontSize: 13, textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.6)'; e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.3)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    {t.pricing.ctaSecondary}
                  </a>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 4 }}>
                    {t.pricing.noCreditCard}
                  </span>
                </div>
              </div>

              {/* Right — what's included */}
              <div style={{ padding: '52px 48px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 28 }}>
                  {t.pricing.includedLabel}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {t.pricing.includedItems.map((item, i) => {
                    const highlight = i === t.pricing.includedItems.length - 1;
                    return ({ item, highlight });
                  }).map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <CheckCircle2 size={16} style={{
                        color: row.highlight ? 'var(--accent-warm)' : 'var(--accent-primary)',
                        flexShrink: 0, marginTop: 1,
                      }} />
                      <span style={{
                        fontSize: 14, lineHeight: 1.5,
                        color: row.highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: row.highlight ? 600 : 400,
                      }}>{row.item}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 32, padding: '16px 20px',
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {t.pricing.noLimitsNote}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Competitor comparison note */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              {t.pricing.competitorNote}
            </p>
          </div>
        </div>
      </Section>

      {/* ── Responsive: fork grid + objections grid + pricing ── */}
      <style>{`
        @media (max-width: 768px) {
          .fork-grid { grid-template-columns: 1fr !important; }
          .objections-grid { grid-template-columns: 1fr !important; }
          .pricing-inner-grid { grid-template-columns: 1fr !important; }
          .pricing-inner-grid > div:first-child { border-right: none !important; border-bottom: 1px solid var(--glass-border); }
          .newsletter-form { flex-direction: column !important; }
        }
      `}</style>


      {/* ════════════════════════════════════════════════════════
          NEWSLETTER — EMAIL CAPTURE
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <Mail size={28} style={{ color: 'var(--accent-primary)', marginBottom: 16 }} />
          <h3 style={{
            fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800,
            letterSpacing: -0.8, marginBottom: 8, lineHeight: 1.2,
          }}>
            {t.newsletter.heading}
          </h3>
          <p style={{
            fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6,
          }}>
            {t.newsletter.subheading}
          </p>

          {emailSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: 'var(--accent-primary)', fontSize: 15, fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} /> {t.newsletter.success}
            </motion.div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: wire up to Supabase / email service
                setEmailSubmitted(true);
              }}
              style={{
                display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto',
              }}
              className="newsletter-form"
            >
              <input
                type="email"
                required
                placeholder={t.newsletter.placeholder}
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                style={{
                  flex: 1, padding: '12px 16px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font-display)',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                  color: '#07090e', border: 'none', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {t.newsletter.button}
              </button>
            </form>
          )}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
         ════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)',
        padding: '40px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
              </span>
            </div>
            <a href="mailto:contact@fitcore.tech" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
              fontWeight: 500, transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              <Mail size={14} /> contact@fitcore.tech
            </a>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: t.nav.features, href: '#features' },
              { label: t.nav.howItWorks, href: '#how-it-works' },
              { label: t.nav.pricing, href: '#pricing' },
            ].map(link => (
              <a key={link.label} href={link.href} style={{
                color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
                fontWeight: 500, transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              >{link.label}</a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {t.footer.copyright}
          </div>
        </div>
      </footer>

      {/* ── Responsive Styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 769px) {
          .nav-mobile-toggle { display: none !important; }
          .nav-mobile-menu { display: none !important; }
        }
        @media (max-width: 900px) {
          .feature-row, .feature-row-reverse {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .feature-image-reverse {
            order: -1;
          }
          .pain-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .stat-cards-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
