import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Dumbbell, BarChart3, Zap, ChevronRight, ChevronLeft,
  ArrowRight, Menu, X, Brain, Smartphone, Mail, Play, CheckCircle2,
  ClipboardCheck, CreditCard, LayoutDashboard
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   FitCore Landing Page
   Positioning: Custom-built dashboards for fitness coaches (1-on-1)
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
const screenshots = [
  { src: '/1-overview.png', label: 'Dashboard Overview', desc: 'Everything at a glance: revenue, clients, check-ins, AI insights' },
  { src: '/2-clients.png', label: 'Client Management', desc: 'Full roster with progress, plans, revenue per client' },
  { src: '/3-programs.png', label: 'Workout Programs', desc: 'Build and assign programs with exercises, sets, reps, tempo' },
  { src: '/4-messages.png', label: 'Unified Inbox', desc: 'Telegram, WhatsApp, Instagram, Email: one conversation feed' },
  { src: '/5-analytics.png', label: 'Analytics & Revenue', desc: 'Revenue trends, retention, client value, plan distribution' },
];

function ScreenshotCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = () => { setDirection(1); setCurrent(i => (i + 1) % screenshots.length); };
  const prev = () => { setDirection(-1); setCurrent(i => (i - 1 + screenshots.length) % screenshots.length); };

  // Auto-advance
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
      {/* Browser Chrome */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: '0 8px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--glass-border)',
      }}>
        {/* Title bar */}
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

        {/* Screenshot */}
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

      {/* Controls */}
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

      {/* Dots */}
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

// ── Video Embed (Loom) ──
function VideoPlaceholder() {
  return (
    <div style={{
      position: 'relative', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', border: '1px solid var(--glass-border)',
    }}>
      <iframe
        src="https://www.loom.com/embed/26735e972f624b0bab6222c1a2c3dd66"
        frameBorder="0"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════ */
export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.96]);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#offer' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5, color: 'var(--text-primary)' }}>
            Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
          </div>
        </div>

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
            background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
            color: '#07090e', padding: '10px 24px', borderRadius: 'var(--radius-sm)',
            fontWeight: 600, fontSize: 14, textDecoration: 'none', letterSpacing: 0.3,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-primary-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >Book a Call</a>
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
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}>Book a Call</a>
          </motion.div>
        )}
      </motion.nav>

      {/* ════════════════════════════════════════════════════════
          HERO SECTION
         ════════════════════════════════════════════════════════ */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }}>
        <section style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '60px 24px 80px', position: 'relative', zIndex: 1,
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
              Custom-Built for Your Coaching Business
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
            Your Clients, Programs & Revenue{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
              in One Dashboard
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-secondary)', lineHeight: 1.6,
              maxWidth: 640, marginBottom: 48, fontWeight: 400,
            }}
          >
            We build custom dashboards for fitness coaches. Track clients, program workouts,
            manage check-ins, handle payments, and message everyone from one screen.
            branded with your colors and logo, ready in days.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', padding: '16px 32px', borderRadius: 'var(--radius-md)',
              fontWeight: 700, fontSize: 15, textDecoration: 'none', letterSpacing: 0.3,
              animation: 'pulse-glow 3s ease-in-out infinite',
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Book a Free Demo <ArrowRight size={18} />
            </a>
            <a href="https://demofitcore.tech" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc', padding: '16px 32px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 15, textDecoration: 'none', letterSpacing: 0.3,
              backdropFilter: 'blur(20px)', transition: 'border-color 0.2s, transform 0.2s, background 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.08))'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))'; }}
            >
              <LayoutDashboard size={18} /> Try the Dashboard
            </a>
            <a href="#demo-video" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)', padding: '16px 32px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 15, textDecoration: 'none', letterSpacing: 0.3,
              backdropFilter: 'blur(20px)', transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Play size={18} /> Watch Demo
            </a>
          </motion.div>
        </section>
      </motion.div>

      {/* ════════════════════════════════════════════════════════
          REAL DASHBOARD CAROUSEL
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <ScreenshotCarousel />
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          COACHES IN ACTION — AI-generated photos
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              Built for real coaches
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Whether you train clients in-person or online, your dashboard works wherever you do.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }} className="coaches-grid">
            {[
              { label: 'Reviewing client progress between sessions', aspect: '4/5', photo: '/coach-photo-1.png' },
              { label: 'Programming workouts from the gym floor', aspect: '4/5', photo: '/coach-photo-2.png' },
              { label: 'Tracking check-ins on the go', aspect: '4/5', photo: '/coach-photo-3.png' },
            ].map((photo, i) => (
              <GlassCard key={i} delay={i * 0.1} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ aspectRatio: photo.aspect, overflow: 'hidden' }}>
                  <img
                    src={photo.photo}
                    alt={photo.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--glass-border)' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
                    {photo.label}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FEATURES — compact grid
         ════════════════════════════════════════════════════════ */}
      <Section id="features">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <Zap size={14} /> What's Inside
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5 }}>
              One dashboard. Everything you need.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {[
              { icon: Users, title: 'Client Management', desc: 'Full roster with progress tracking, plan tiers, streaks, and at-risk alerts.', color: 'var(--accent-primary)' },
              { icon: Dumbbell, title: 'Workout Programs', desc: 'Build programs with sets, reps, RPE, tempo. Assign to clients in one click.', color: 'var(--accent-secondary)' },
              { icon: MessageSquare, title: 'Unified Inbox', desc: 'Telegram, WhatsApp, IG, Email — all conversations in one feed.', color: '#29ABE2' },
              { icon: ClipboardCheck, title: 'Weekly Check-Ins', desc: 'Mood, sleep, nutrition, energy. Tracked with trends and coach feedback.', color: '#E1306C' },
              { icon: BarChart3, title: 'Revenue & Analytics', desc: 'Monthly revenue, retention, client value, projections — all visualized.', color: 'var(--accent-warm)' },
              { icon: CreditCard, title: 'Payments', desc: 'Generate invoices, track paid/pending/overdue. One-click reminders.', color: 'var(--accent-success)' },
              { icon: Brain, title: 'AI Insights', desc: 'Automated alerts for at-risk clients, missed check-ins, and opportunities.', color: '#6366f1' },
              { icon: CheckCircle2, title: 'Your Brand', desc: 'Your colors, logo, and domain. Feels like your own product, not a generic SaaS.', color: 'var(--accent-primary)' },
            ].map((f, i) => (
              <GlassCard key={i} delay={i * 0.05} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '20px 24px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: `${f.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={17} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          DEMO VIDEO
         ════════════════════════════════════════════════════════ */}
      <Section id="demo-video">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 12 }}>
              See it in action
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              6-minute walkthrough of the full dashboard
            </p>
          </div>
          {/* TODO: Replace VideoPlaceholder with actual <video> or YouTube embed */}
          <VideoPlaceholder />
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
         ════════════════════════════════════════════════════════ */}
      <Section id="how-it-works">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <ChevronRight size={14} /> How It Works
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5 }}>
              Your Dashboard, Ready in Days
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { number: '01', title: 'Book a Free Call', desc: 'We hop on a 15-minute call. You tell us how you run your coaching business: what tools you use, what\'s not working, what you wish you had.' },
              { number: '02', title: 'We Build It for You', desc: 'We set up your custom dashboard with your branding, your client data structure, and the features that matter to you. No templates. Built from scratch.' },
              { number: '03', title: 'You Get a Walkthrough', desc: 'We walk you through your dashboard live. You test it, give feedback, and we tweak anything until it\'s exactly how you want it.' },
              { number: '04', title: 'Start Using It', desc: 'Import your clients, start programming workouts, track check-ins, and manage your whole business from one screen. We handle support and updates.' },
            ].map((step, i) => (
              <GlassCard key={i} delay={i * 0.12} style={{
                display: 'flex', gap: 24, alignItems: 'center',
                padding: '28px 32px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700,
                  color: 'var(--accent-primary)', opacity: 0.6, flexShrink: 0,
                  width: 60, textAlign: 'center',
                }}>
                  {step.number}
                </div>
                <div style={{
                  width: 1, height: 48, background: 'var(--glass-border)', flexShrink: 0,
                }} />
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
         ════════════════════════════════════════════════════════ */}
      <Section id="offer">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 120px', textAlign: 'center' }}>
          <GlassCard style={{
            padding: '64px 48px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(14, 18, 27, 0.9) 0%, rgba(20, 25, 40, 0.9) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.15)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 400, height: 400,
              background: 'radial-gradient(circle, var(--accent-primary-dim) 0%, transparent 70%)',
              pointerEvents: 'none', opacity: 0.5,
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>
                Stop juggling apps.
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 12px', lineHeight: 1.6 }}>
                Everything included, no upsells. Pricing depends on your setup.
              </p>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
                15-minute call, no pressure, no commitment.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                  color: '#07090e', padding: '16px 40px', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 16, textDecoration: 'none',
                  animation: 'pulse-glow 3s ease-in-out infinite',
                  transition: 'transform 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Book a Free Demo <ArrowRight size={18} />
                </a>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 20 }}>
                Or email us directly: <a href="mailto:contact@fitcore.tech" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>contact@fitcore.tech</a>
              </p>
            </div>
          </GlassCard>
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
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Pricing', href: '#offer' },
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
            &copy; 2026 FitCore. All rights reserved.
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
          .coaches-grid {
            grid-template-columns: 1fr !important;
            max-width: 400px !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
}
