declare function gtag(...args: unknown[]): void;
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
  Shield, Lock, CreditCard, UserCheck, ChevronDown,
  FileText, HelpCircle, Instagram,
} from 'lucide-react';
import { useLang } from './i18n';
import type { Lang } from './i18n';
import { useAuth } from './auth';
import Section from './components/Section';

/* ═══════════════════════════════════════════════════════════
   FitCore Demo Landing Page - Identity-Driven Redesign
   Positioning: Custom-built platforms for elite fitness coaches
   ═══════════════════════════════════════════════════════════ */

const DEMO_URL = 'https://demofitcore.tech';

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
      className="glass-card"
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            app.fitcore.tech/{screenshots[current].label.toLowerCase().replace(/ /g, '-')}
          </div>
        </div>

        <div onClick={() => setLightboxOpen(true)} style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--bg-primary)', cursor: 'zoom-in' }}>
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
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 1000, background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24, cursor: 'zoom-out',
            }}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={screenshots[current].src}
              alt={screenshots[current].label}
              style={{
                maxWidth: '90vw', maxHeight: '90vh',
                objectFit: 'contain', borderRadius: 12,
                boxShadow: '0 16px 80px rgba(0, 0, 0, 0.6)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.96]);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalValue, setEmailModalValue] = useState('');
  const [emailModalSent, setEmailModalSent] = useState(false);
  const [emailModalLoading, setEmailModalLoading] = useState(false);

  const handleEmailModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalValue.trim()) return;
    setEmailModalLoading(true);
    if (typeof gtag === 'function') gtag('event', 'form_submit_attempt', { form: 'email_capture' });
    try {
      const res = await fetch('https://vawghpnaoimtplfimjrw.supabase.co/functions/v1/notify-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Landing visitor', email: emailModalValue.trim(), message: '[Auto] Clicked Get Started in features section' }),
      });
      if (res.ok) {
        if (typeof gtag === 'function') gtag('event', 'form_submit_success', { form: 'email_capture' });
      } else {
        if (typeof gtag === 'function') gtag('event', 'form_submit_error', { form: 'email_capture', status: res.status });
      }
    } catch {
      if (typeof gtag === 'function') gtag('event', 'form_submit_error', { form: 'email_capture', status: 'network_error' });
    }
    setEmailModalLoading(false);
    setEmailModalSent(true);
    setTimeout(() => { setEmailModalOpen(false); setEmailModalSent(false); setEmailModalValue(''); }, 3000);
  };

  const accountUrl = lang === 'pl' ? '/pl/account' : '/account';
  // const loginUrl = lang === 'pl' ? '/pl/login' : '/login'; // hidden during controlled beta
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
    { src: '/4-payments.png', label: t.carousel.labels[3], desc: t.carousel.descs[3] },
    { src: '/5-checkins.png', label: t.carousel.labels[4], desc: t.carousel.descs[4] },
  ];

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.howItWorks, href: '#how-it-works-steps' },
    { label: t.nav.pricing, href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Blog', href: lang === 'pl' ? '/pl/blog' : '/blog' },
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
          padding: '0 16px', height: 60,
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
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
            background: 'transparent',
            border: '1px solid rgba(0, 229, 200, 0.4)',
            color: 'var(--accent-primary)', padding: '10px 20px', borderRadius: 'var(--radius-sm)',
            fontWeight: 600, fontSize: 13, textDecoration: 'none', letterSpacing: 0.3,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.7)'; e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)'; e.currentTarget.style.background = 'transparent'; }}
          >{t.nav.tryDemo}</a>
          {/* Start Now links to contact, Login stays visible */}
          <a href={lang === 'pl' ? '/pl/contact' : '/contact'} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
            color: '#07090e', padding: '10px 22px', borderRadius: 'var(--radius-sm)',
            fontWeight: 700, fontSize: 13, textDecoration: 'none', letterSpacing: 0.3,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-primary-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >{t.nav.startNow} <ArrowRight size={14} /></a>
          {/* Login/Account hidden during controlled beta — direct links still work */}
          {isLoggedIn && (
            <Link to={accountUrl} style={{
              color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'color 0.2s', letterSpacing: 0.3,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >{t.auth.myAccount}</Link>
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
              position: 'absolute', top: 60, left: 0, right: 0,
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
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} style={{
              background: 'transparent',
              border: '1px solid rgba(0, 229, 200, 0.4)',
              color: 'var(--accent-primary)', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}>{t.nav.tryDemo}</a>
            {/* Login hidden during controlled beta */}
            <a href={lang === 'pl' ? '/pl/contact' : '/contact'} onClick={() => setMobileMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}>{t.nav.startNow} <ArrowRight size={15} /></a>
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
          HERO - IDENTITY-DRIVEN
         ════════════════════════════════════════════════════════ */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }}>
        <section style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '80px 20px 32px', position: 'relative', zIndex: 1,
          maxWidth: 950, margin: '0 auto',
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
              fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-1.5px', marginBottom: 20, maxWidth: 750,
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
              fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.6,
              maxWidth: 560, marginBottom: 40, fontWeight: 400,
            }}
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="hero-cta-buttons"
            style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a href="#pricing" onClick={() => { if (typeof gtag === 'function') gtag('event', 'click_get_started', { section: 'hero' }); }} style={{
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
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" onClick={() => { if (typeof gtag === 'function') gtag('event', 'click_try_demo', { section: 'hero' }); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid rgba(0, 229, 200, 0.4)',
              color: 'var(--accent-primary)', padding: '16px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 16, textDecoration: 'none', letterSpacing: 0.3,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.7)'; e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {t.hero.ctaDemo} <ArrowRight size={18} />
            </a>
            <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" onClick={() => { if (typeof gtag === 'function') gtag('event', 'click_book_demo', { section: 'hero' }); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)', padding: '16px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 16, textDecoration: 'none', letterSpacing: 0.3,
              transition: 'border-color 0.2s, transform 0.2s',
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
          THE REAL PROBLEM - EMOTIONAL, NOT OPERATIONAL
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 56px' }}>
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
            {/* Card 1 - The Admin Trap */}
            <GlassCard delay={0} style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, flexShrink: 0,
              }}>
                <Clock size={24} style={{ color: 'var(--accent-danger)' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--accent-danger)', minHeight: '66px', display: 'flex', alignItems: 'flex-start' }}>
                {t.pain.card1Title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t.pain.card1Body}
              </p>
              <Link to={lang === 'pl' ? '/pl/blog/automate-payments-and-workouts' : '/blog/automate-payments-and-workouts'} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 16,
                opacity: 0.7, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >{lang === 'pl' ? 'Jak to rozwiązać →' : 'How to fix this →'}</Link>
            </GlassCard>

            {/* Card 2 - The Perception Gap (slightly elevated) */}
            <GlassCard delay={0.1} style={{
              padding: '36px 32px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              background: 'linear-gradient(160deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 60%)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, flexShrink: 0,
              }}>
                <Eye size={24} style={{ color: 'var(--accent-warm)' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--accent-warm)', minHeight: '66px', display: 'flex', alignItems: 'flex-start' }}>
                {t.pain.card2Title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t.pain.card2Body}
              </p>
              <Link to={lang === 'pl' ? '/pl/blog/why-excel-is-not-enough-for-fitness-coaching' : '/blog/why-excel-is-not-enough-for-fitness-coaching'} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 16,
                opacity: 0.7, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >{lang === 'pl' ? 'Dlaczego Excel nie wystarczy →' : 'Why spreadsheets fail →'}</Link>
            </GlassCard>

            {/* Card 3 - The Invisible Ceiling (climax - strongest styling) */}
            <GlassCard delay={0.2} style={{
              padding: '36px 32px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'linear-gradient(160deg, rgba(99, 102, 241, 0.07) 0%, var(--bg-card) 60%)',
              boxShadow: '0 4px 32px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(99, 102, 241, 0.15)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, flexShrink: 0,
              }}>
                <TrendingUp size={24} style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--accent-secondary)', minHeight: '66px', display: 'flex', alignItems: 'flex-start' }}>
                {t.pain.card3Title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t.pain.card3Body}
              </p>
              <Link to={lang === 'pl' ? '/pl/blog/how-to-manage-clients-as-personal-trainer' : '/blog/how-to-manage-clients-as-personal-trainer'} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 16,
                opacity: 0.7, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >{lang === 'pl' ? 'Jak przebić ten sufit →' : 'How to break through →'}</Link>
            </GlassCard>
          </div>
        </div>
      </Section>


      {/* ════════════════════════════════════════════════════════
          COACH DASHBOARD - SCREENSHOT CAROUSEL
         ════════════════════════════════════════════════════════ */}
      <Section id="features">
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 40px' }}>
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
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 56px' }}>
          <ScreenshotCarousel screenshots={screenshots} />
        </div>
      </Section>


      {/* ── Stakes Bridge Line ── */}
      <Section>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 72px', textAlign: 'center' }}>
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
          THE COST - WHAT DISORGANIZATION ACTUALLY COSTS YOU
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 72px' }}>
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
                blogSlug: 'automate-payments-and-workouts',
              },
              {
                icon: DollarSign,
                question: t.cost.cards[1].question,
                followup: t.cost.cards[1].followup,
                color: 'var(--accent-warm)',
                bg: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 60%)',
                blogSlug: 'why-excel-is-not-enough-for-fitness-coaching',
              },
              {
                icon: UserMinus,
                question: t.cost.cards[2].question,
                followup: t.cost.cards[2].followup,
                color: 'var(--accent-secondary)',
                bg: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                gradient: 'linear-gradient(160deg, rgba(99, 102, 241, 0.06) 0%, var(--bg-card) 60%)',
                blogSlug: 'how-to-manage-clients-as-personal-trainer',
              },
              {
                icon: AlertTriangle,
                question: t.cost.cards[3].question,
                followup: t.cost.cards[3].followup,
                color: 'var(--accent-primary)',
                bg: 'rgba(0, 229, 200, 0.1)',
                border: '1px solid rgba(0, 229, 200, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(0, 229, 200, 0.04) 0%, var(--bg-card) 60%)',
                blogSlug: 'best-tools-for-fitness-trainers-2026',
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
                <Link to={`${lang === 'pl' ? '/pl' : ''}/blog/${stat.blogSlug}`} style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none',
                  marginTop: 14, opacity: 0.6, transition: 'opacity 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >{lang === 'pl' ? 'Czytaj więcej →' : 'Learn more →'}</Link>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>



      {/* ════════════════════════════════════════════════════════
          FEATURE ROWS - ALTERNATING IMAGE + TEXT
         ════════════════════════════════════════════════════════ */}

      {/* Feature 1: Client Management */}
      <Section id="how-it-works">
        <div style={{
          maxWidth: 950, margin: '0 auto', padding: '0 24px 56px',
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
            <button onClick={() => setEmailModalOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.clients.cta} <ArrowRight size={14} /></button>
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

      {/* Feature 2: Unified Inbox - reversed */}
      <Section>
        <div style={{
          maxWidth: 950, margin: '0 auto', padding: '0 24px 56px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
        }} className="feature-row-reverse">
          <div className="feature-image-reverse">
            <img src="/7-messages.png" alt="Unified inbox" style={{
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
            <button onClick={() => setEmailModalOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: '#29ABE2',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.inbox.cta} <ArrowRight size={14} /></button>
          </div>
        </div>
      </Section>

      {/* Feature 3: Workout Programs */}
      <Section>
        <div style={{
          maxWidth: 950, margin: '0 auto', padding: '0 24px 56px',
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
            <button onClick={() => setEmailModalOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: 'var(--accent-secondary)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.workouts.cta} <ArrowRight size={14} /></button>
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

      {/* Feature 4: Analytics - reversed */}
      <Section>
        <div style={{
          maxWidth: 950, margin: '0 auto', padding: '0 24px 72px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
        }} className="feature-row-reverse">
          <div className="feature-image-reverse">
            <img src="/6-analytics.png" alt="Analytics and revenue" style={{
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
            <button onClick={() => setEmailModalOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
              fontSize: 13, fontWeight: 600, color: 'var(--accent-warm)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'gap 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
              onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
            >{t.features.analytics.cta} <ArrowRight size={14} /></button>
          </div>
        </div>
      </Section>



      {/* ════════════════════════════════════════════════════════
          CLOSING SECTION 1 - THE FORK IN THE ROAD
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 56px' }}>
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
            {/* Left - staying put */}
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

            {/* Right - with FitCore */}
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
          WHAT YOU GET + FREE DEMO CTA
         ════════════════════════════════════════════════════════ */}
      <Section id="pricing">
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 72px' }}>
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

              {/* Left - Free demo + contact */}
              <div style={{
                padding: '52px 48px',
                borderRight: '1px solid var(--glass-border)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
                    {t.pricing.demoHeading}
                  </div>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                    {t.pricing.demoSubheading}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer"
                      onClick={() => { if (typeof gtag === 'function') gtag('event', 'click_book_demo', { section: 'pricing' }); }}
                      style={{
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
                      {t.pricing.demoCta} <ArrowRight size={16} />
                    </a>
                    <button
                      onClick={() => { setEmailModalOpen(true); if (typeof gtag === 'function') gtag('event', 'click_contact_us', { section: 'pricing' }); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        border: '1px solid rgba(0, 229, 200, 0.4)',
                        background: 'transparent',
                        color: 'var(--accent-primary)', padding: '15px 32px', borderRadius: 'var(--radius-md)',
                        fontWeight: 700, fontSize: 15, cursor: 'pointer',
                        transition: 'all 0.2s', width: '100%',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.7)'; e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <Mail size={16} /> {t.pricing.contactCta}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      {t.pricing.demoNote}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--glass-border)', marginBottom: 32 }} />

                {/* Contact */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
                    {t.pricing.contactLabel}
                  </div>
                  <a href="mailto:contact@fitcore.tech" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 15, fontWeight: 600,
                    transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <Mail size={16} />
                    {t.pricing.contactEmail}
                  </a>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5, marginBottom: 16 }}>
                    {t.pricing.contactEmailNote}
                  </p>
                  <a href="https://www.instagram.com/fitcoretech/" target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 15, fontWeight: 600,
                    transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <Instagram size={16} />
                    @fitcoretech
                  </a>
                </div>
              </div>

              {/* Right - what's included */}
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

        </div>
      </Section>

      {/* ── Responsive: fork grid + objections grid + pricing ── */}
      <style>{`
        @media (max-width: 768px) {
          .fork-grid { grid-template-columns: 1fr !important; }
          .fork-grid > div { padding: 32px 24px !important; }
          .fork-grid > div:first-child { border-right: none !important; border-bottom: 1px solid var(--glass-border); }
          .objections-grid { grid-template-columns: 1fr !important; }
          .pricing-inner-grid { grid-template-columns: 1fr !important; }
          .pricing-inner-grid > div:first-child { border-right: none !important; border-bottom: 1px solid var(--glass-border); }
          .pricing-inner-grid > div { padding: 32px 24px !important; }
          .newsletter-form { flex-direction: column !important; }
          .how-it-works-grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
          .security-grid { grid-template-columns: 1fr !important; }
          .footer-columns { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .glass-card { padding: 24px !important; }
          .pain-cards-grid .glass-card { padding: 28px 24px !important; }
          .pain-cards-grid .glass-card h3 { font-size: 19px !important; min-height: auto !important; }
        }
        @media (max-width: 480px) {
          .how-it-works-grid { grid-template-columns: 1fr !important; }
          .stat-cards-grid { grid-template-columns: 1fr !important; }
          .footer-columns { grid-template-columns: 1fr !important; gap: 28px !important; }
          .pricing-after-trial { flex-wrap: wrap !important; gap: 4px 8px !important; }
          .glass-card { padding: 20px !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS - STEP-BY-STEP
         ════════════════════════════════════════════════════════ */}
      <Section id="how-it-works-steps">
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 72px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 100,
              background: 'var(--accent-primary-dim)', border: '1px solid rgba(0, 229, 200, 0.15)',
              fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)',
              marginBottom: 20,
            }}>
              <Zap size={14} /> {t.howItWorks?.badge || 'Simple Setup'}
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
              letterSpacing: -1.5, lineHeight: 1.15, marginBottom: 12,
            }}>
              {t.howItWorks?.heading || 'Up and Running in Minutes'}
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              {t.howItWorks?.subheading || 'Four simple steps to transform how you run your coaching business.'}
            </p>
          </div>

          <div className="how-it-works-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          }}>
            {[
              { icon: UserCheck, color: 'var(--accent-primary)', step: '01', title: t.howItWorks?.step1Title || 'Sign Up', desc: t.howItWorks?.step1Desc || 'Create your account in seconds. 14-day free trial, no credit card required.' },
              { icon: CreditCard, color: '#635bff', step: '02', title: t.howItWorks?.step2Title || 'Connect Stripe', desc: t.howItWorks?.step2Desc || 'Link your Stripe account to start accepting payments from clients directly.' },
              { icon: Users, color: 'var(--accent-warm)', step: '03', title: t.howItWorks?.step3Title || 'Add Clients & Plans', desc: t.howItWorks?.step3Desc || 'Import your clients, create custom coaching plans with your own pricing.' },
              { icon: DollarSign, color: 'var(--accent-success)', step: '04', title: t.howItWorks?.step4Title || 'Get Paid', desc: t.howItWorks?.step4Desc || 'Send invoices, clients pay in one click. Track everything from your dashboard.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <GlassCard key={i} delay={i * 0.1}>
                  <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: item.color,
                      fontFamily: 'var(--font-mono)', marginBottom: 16, letterSpacing: 1,
                    }}>
                      STEP {item.step}
                    </div>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: `${item.color}15`, border: `1px solid ${item.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <Icon size={22} color={item.color} />
                    </div>
                    <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {item.desc}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          SECURITY & TRUST
         ════════════════════════════════════════════════════════ */}
      <Section id="security">
        <div style={{ maxWidth: 950, margin: '0 auto', padding: '0 24px 72px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 100,
              background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)',
              fontSize: 13, fontWeight: 600, color: 'var(--accent-secondary)',
              marginBottom: 20,
            }}>
              <Shield size={14} /> {t.security?.badge || 'Enterprise-Grade Security'}
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
              letterSpacing: -1.5, lineHeight: 1.15, marginBottom: 12,
            }}>
              {t.security?.heading || 'Your Data. Your Clients. Protected.'}
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              {t.security?.subheading || 'We take security seriously. Every interaction on FitCore is encrypted, authenticated, and compliant.'}
            </p>
          </div>

          <div className="security-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          }}>
            {[
              { icon: Lock, color: 'var(--accent-primary)', title: t.security?.item1Title || 'Encrypted Messaging', desc: t.security?.item1Desc || 'All coach-client communication is encrypted in transit and at rest. Your conversations stay private - always.' },
              { icon: CreditCard, color: '#635bff', title: t.security?.item2Title || 'Stripe-Secured Payments', desc: t.security?.item2Desc || 'Payments are processed through Stripe Connect, PCI-DSS Level 1 compliant. We never see or store card details.' },
              { icon: Shield, color: 'var(--accent-success)', title: t.security?.item3Title || 'Data Ownership', desc: t.security?.item3Desc || 'You own your data. Client info, programs, and messages - export anytime, delete anytime. No lock-in.' },
              { icon: Eye, color: 'var(--accent-warm)', title: t.security?.item4Title || 'SSL Everywhere', desc: t.security?.item4Desc || 'Every connection to FitCore is encrypted with TLS/SSL. No exceptions, no compromises.' },
              { icon: UserCheck, color: 'var(--accent-secondary)', title: t.security?.item5Title || 'Role-Based Access', desc: t.security?.item5Desc || 'Coaches and clients each have their own portal. Clients only see their own data - nothing else.' },
              { icon: FileText, color: '#ef4444', title: t.security?.item6Title || 'Transparent Fees', desc: t.security?.item6Desc || 'A simple 5% platform fee on payments. No hidden charges, no surprise invoices. You see exactly what you pay.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <GlassCard key={i} delay={i * 0.08}>
                  <div style={{ padding: '24px 20px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${item.color}12`, border: `1px solid ${item.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                    }}>
                      <Icon size={20} color={item.color} />
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                      {item.desc}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FAQ
         ════════════════════════════════════════════════════════ */}
      <Section id="faq">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 72px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 100,
              background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)',
              fontSize: 13, fontWeight: 600, color: 'var(--accent-warm)',
              marginBottom: 20,
            }}>
              <HelpCircle size={14} /> FAQ
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
              letterSpacing: -1.5, lineHeight: 1.15,
            }}>
              {t.faq?.heading || 'Frequently Asked Questions'}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(t.faq?.items || [
              { q: 'How does pricing work?', a: 'FitCore charges a simple 5% platform fee on each client payment processed through the system. No monthly platform fees during your trial. After your 14-day free trial, it\'s $49/month + a one-time $100 setup fee.' },
              { q: 'Is there a free trial?', a: 'Yes! You get a full 14-day free trial with access to all features. No credit card required to start.' },
              { q: 'How do payments work?', a: 'You connect your own Stripe account through our dashboard. When you invoice a client, they receive a secure payment link. They pay directly - the money goes to your Stripe account minus the 5% platform fee.' },
              { q: 'Is my data secure?', a: 'Absolutely. All data is encrypted in transit (TLS/SSL) and at rest. Payments are processed through Stripe (PCI-DSS Level 1 compliant). We never store credit card information.' },
              { q: 'Can I create custom plans and pricing?', a: 'Yes. You define your own coaching plans with custom names, prices, and billing cycles (monthly, weekly, or one-time). Your pricing, your rules.' },
              { q: 'What features are included?', a: 'Everything: client management, messaging, workout program builder, invoicing with Stripe payments, analytics dashboard, check-ins, and more. All features are included in every plan.' },
              { q: 'Can my clients access their own portal?', a: 'Yes. Each client gets their own secure portal where they can view programs, track progress, chat with you, and pay invoices. Fully branded with your coaching identity.' },
              { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. You can cancel your subscription at any time from your account settings.' },
            ] as { q: string; a: string }[]).map((item, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                transition: 'border-color 0.2s',
                ...(faqOpen === i ? { borderColor: 'rgba(0, 229, 200, 0.2)' } : {}),
              }}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-primary)', fontSize: 15, fontWeight: 600,
                    fontFamily: 'var(--font-display)', textAlign: 'left',
                  }}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={18} style={{
                    color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 12,
                    transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }} />
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '0 20px 18px', fontSize: 14,
                        color: 'var(--text-secondary)', lineHeight: 1.7,
                      }}>
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
         ════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)',
        padding: '60px 24px 32px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 950, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48,
            marginBottom: 48,
          }} className="footer-columns">
            {/* Brand Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 240 }}>
                {t.footer?.tagline || 'Custom-built dashboards for fitness coaches who want to scale.'}
              </p>
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

            {/* Product Column */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t.footer?.productTitle || 'Product'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: t.nav.features, href: '#features' },
                  { label: t.nav.howItWorks, href: '#how-it-works-steps' },
                  { label: t.nav.pricing, href: '#pricing' },
                  { label: t.footer?.security || 'Security', href: '#security' },
                  { label: 'FAQ', href: '#faq' },
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
            </div>

            {/* Resources Column */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t.footer?.resourcesTitle || 'Resources'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Blog', href: lang === 'pl' ? '/pl/blog' : '/blog' },
                  { label: t.footer?.bookCall || 'Book a Call', href: 'https://cal.com/fitcore/demo', external: true },
                  { label: t.footer?.privacyPolicy || 'Privacy Policy', href: lang === 'pl' ? '/pl/privacy' : '/privacy' },
                  { label: t.footer?.termsOfService || 'Terms of Service', href: lang === 'pl' ? '/pl/terms' : '/terms' },
                ].map(link => (
                  <a key={link.label} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined} style={{
                    color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
                    fontWeight: 500, transition: 'color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >{link.label}</a>
                ))}
              </div>
            </div>

            {/* Contact Column */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t.footer?.contactTitle || 'Contact'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href={lang === 'pl' ? '/pl/contact' : '/contact'} style={{
                  color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
                  fontWeight: 500, transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >{t.footer?.contactUs || 'Contact Us'}</a>
                <a href="https://www.instagram.com/fitcoretech/" target="_blank" rel="noopener noreferrer" style={{
                  color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
                  fontWeight: 500, transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >Instagram</a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid var(--glass-border)', paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {t.footer.copyright}
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href={lang === 'pl' ? '/pl/privacy' : '/privacy'} style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 12, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              >{t.footer?.privacyPolicy || 'Privacy Policy'}</a>
              <a href={lang === 'pl' ? '/pl/terms' : '/terms'} style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 12, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              >{t.footer?.termsOfService || 'Terms of Service'}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Email Capture Modal ── */}
      <AnimatePresence>
        {emailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setEmailModalOpen(false); setEmailModalSent(false); setEmailModalValue(''); }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, #0f1318, #141a22)', border: '1px solid rgba(0,229,200,0.15)',
                borderRadius: '1rem', padding: '2.5rem 2rem', maxWidth: 420, width: '100%', textAlign: 'center',
                position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.4), 0 0 60px rgba(0,229,200,0.06)',
              }}
            >
              <button onClick={() => { setEmailModalOpen(false); setEmailModalSent(false); setEmailModalValue(''); }} style={{
                position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem',
              }}>✕</button>
              {!emailModalSent ? (<>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀</div>
                <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                  {lang === 'pl' ? 'Chcesz zobaczyć jak to działa z Twoimi klientami?' : 'Want to see how it works with your clients?'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: '0 0 1.5rem', lineHeight: 1.4 }}>
                  {lang === 'pl' ? 'Zostaw email — odezwiemy się w 24h. Zero zobowiązań.' : 'Drop your email — we\'ll reach out within 24h. Zero commitment.'}
                </p>
                <form onSubmit={handleEmailModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input type="email" required value={emailModalValue} onChange={e => setEmailModalValue(e.target.value)}
                    placeholder="your@email.com" style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
                      padding: '0.875rem 1rem', color: '#fff', fontSize: '0.95rem', outline: 'none',
                    }} />
                  <button type="submit" disabled={emailModalLoading} style={{
                    background: 'linear-gradient(135deg, #00e5c8, #00c4aa)', border: 'none', borderRadius: '0.5rem',
                    padding: '0.875rem 1rem', color: '#07090e', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                    opacity: emailModalLoading ? 0.7 : 1,
                  }}>{emailModalLoading ? (lang === 'pl' ? 'Wysyłam...' : 'Sending...') : (lang === 'pl' ? 'Chcę zobaczyć' : 'I want to see')}</button>
                </form>
              </>) : (
                <div style={{ padding: '1rem 0' }}>
                  <div style={{
                    width: '3rem', height: '3rem', borderRadius: '50%', background: 'linear-gradient(135deg, #00e5c8, #00c4aa)',
                    color: '#07090e', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>✓</div>
                  <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                    {lang === 'pl' ? 'Mamy to!' : 'Got it!'}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
                    {lang === 'pl' ? 'Odezwiemy się wkrótce.' : 'We\'ll reach out soon.'}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            padding-left: 20px !important;
            padding-right: 20px !important;
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
        @media (max-width: 480px) {
          .feature-row, .feature-row-reverse {
            padding-left: 16px !important;
            padding-right: 16px !important;
            gap: 24px !important;
          }
          .hero-cta-buttons {
            flex-direction: column !important;
            width: 100%;
          }
          .hero-cta-buttons a {
            width: 100%;
            justify-content: center;
            padding: 14px 24px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
