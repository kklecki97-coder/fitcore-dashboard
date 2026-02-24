import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Dumbbell, BarChart3, Calendar,
  Shield, Zap, ChevronRight, ChevronLeft, ArrowRight, Menu, X,
  Brain, Smartphone, Mail, Play, CheckCircle2,
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
    { label: 'What You Get', href: '#offer' },
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
            style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
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
              Book a Free Demo <ArrowRight size={18} />
            </a>
            <a href="#demo-video" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)', padding: '16px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 16, textDecoration: 'none', letterSpacing: 0.3,
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
          THE PROBLEM
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              Sound familiar?
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Most coaches juggle 5+ apps to run their business. It's slow, messy, and things fall through the cracks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            {[
              'Spreadsheets for client tracking',
              'A different app for programming workouts',
              'WhatsApp / Telegram / IG DMs scattered everywhere',
              'Manual invoicing and payment reminders',
              'No clear view of your revenue or retention',
              'Check-ins via forms that don\'t connect to anything',
            ].map((pain, i) => (
              <GlassCard key={i} delay={i * 0.06} style={{ padding: '20px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <X size={18} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{pain}</span>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FEATURES,Alternating Image + Text
         ════════════════════════════════════════════════════════ */}
      <Section id="features">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <Zap size={14} /> What's Inside
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5 }}>
              One Dashboard. Everything You Need.
            </h2>
          </div>
        </div>
      </Section>

      {/* Feature 1: Client Management */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
        }} className="feature-row">
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'var(--accent-primary-dim)', borderRadius: 8, padding: '6px 14px',
            }}>
              <Users size={16} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 0.5 }}>CLIENT MANAGEMENT</span>
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 16, lineHeight: 1.2 }}>
              Your entire roster, one screen
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Full client profiles with progress bars, plan tiers (Basic, Premium, Elite), revenue per client,
              last check-in dates, and streak tracking. Search, filter by status, and see who needs attention at a glance.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Progress tracking with visual bars', 'Plan & status management', 'Body composition + strength charts', 'AI-powered at-risk client alerts'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <img
              src="/2-clients.png"
              alt="Client management dashboard"
              style={{
                width: '100%', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
        </div>
      </Section>

      {/* Feature 2: Unified Inbox (reversed) */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
        }} className="feature-row-reverse">
          <div className="feature-image-reverse">
            <img
              src="/4-messages.png"
              alt="Unified messaging inbox"
              style={{
                width: '100%', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'rgba(41, 171, 226, 0.15)', borderRadius: 8, padding: '6px 14px',
            }}>
              <MessageSquare size={16} style={{ color: '#29ABE2' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#29ABE2', letterSpacing: 0.5 }}>UNIFIED INBOX</span>
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 16, lineHeight: 1.2 }}>
              Every conversation, one feed
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Telegram, WhatsApp, Instagram, Email. All your client messages stream into one inbox.
              Quick-reply templates for motivation, check-ins, reminders, and onboarding. No more switching between apps.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Multi-channel: Telegram, WhatsApp, IG, Email, SMS', 'Pre-built message templates', 'Read receipts & typing indicators', 'Search across all conversations'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} style={{ color: '#29ABE2', flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Feature 3: Programs */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
        }} className="feature-row">
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'var(--accent-secondary-dim)', borderRadius: 8, padding: '6px 14px',
            }}>
              <Dumbbell size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)', letterSpacing: 0.5 }}>WORKOUT PROGRAMS</span>
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 16, lineHeight: 1.2 }}>
              Build programs, assign in seconds
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Create workout programs from scratch or templates. Add exercises with sets, reps, RPE, tempo, and rest periods.
              Assign to clients with one click. Track active, draft, and template programs.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Exercise library with sets/reps/RPE/tempo', 'Template system for faster programming', 'One-click assign to any client', 'Duplicate & customize existing programs'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <img
              src="/3-programs.png"
              alt="Workout programming"
              style={{
                width: '100%', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
        </div>
      </Section>

      {/* Feature 4: Analytics (reversed) */}
      <Section>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
        }} className="feature-row-reverse">
          <div className="feature-image-reverse">
            <img
              src="/5-analytics.png"
              alt="Analytics dashboard"
              style={{
                width: '100%', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'var(--accent-warm-dim)', borderRadius: 8, padding: '6px 14px',
            }}>
              <BarChart3 size={16} style={{ color: 'var(--accent-warm)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)', letterSpacing: 0.5 }}>ANALYTICS & REVENUE</span>
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 16, lineHeight: 1.2 }}>
              Know your numbers
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Monthly revenue, projected annual, average client value, retention rate. All visualized.
              See revenue by plan, client progress distribution, and who your top performers are.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Revenue trends & projections', 'Client retention tracking', 'Revenue breakdown by plan tier', 'Top clients by engagement'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-warm)', flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          MORE FEATURES,Compact Grid
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 12 }}>
              Plus everything else
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
              Every feature a fitness coach actually needs, nothing you don't.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              { icon: ClipboardCheck, title: 'Weekly Check-Ins', desc: 'Mood, sleep, adherence, nutrition, energy. All tracked with trends and coach feedback.', color: '#E1306C' },
              { icon: CreditCard, title: 'Payments & Invoicing', desc: 'Generate invoices, track paid/pending/overdue. Send payment reminders with one click.', color: 'var(--accent-success)' },
              { icon: Calendar, title: 'Schedule', desc: 'Weekly training calendar with session booking. See who\'s training today at a glance.', color: 'var(--accent-warm)' },
              { icon: Brain, title: 'AI Insights', desc: 'Automated alerts for at-risk clients, missed check-ins, and coaching opportunities.', color: 'var(--accent-secondary)' },
              { icon: Smartphone, title: 'Mobile Ready', desc: 'Full functionality on phone, tablet, or desktop. Manage your business anywhere.', color: '#29ABE2' },
              { icon: LayoutDashboard, title: 'Overview Dashboard', desc: 'KPIs, revenue chart, at-risk clients, pending check-ins, daily quote. All at a glance.', color: 'var(--accent-primary)' },
            ].map((f, i) => (
              <GlassCard key={i} delay={i * 0.06} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '24px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: `${f.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
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
              2-minute walkthrough of the full dashboard
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
          WHAT YOU GET (replaces SaaS pricing)
         ════════════════════════════════════════════════════════ */}
      <Section id="offer">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-success)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <Shield size={14} /> What You Get
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              Your Complete Coaching Dashboard
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Everything included. No feature gates, no upsells. One dashboard built around how you coach.
            </p>
          </div>

          <GlassCard style={{
            padding: '48px 40px',
            border: '1px solid rgba(0, 229, 200, 0.2)',
            background: 'linear-gradient(135deg, rgba(14, 18, 27, 0.95) 0%, rgba(20, 25, 40, 0.95) 100%)',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20, marginBottom: 40,
            }}>
              {[
                'Client management with progress tracking',
                'Workout program builder',
                'Unified messaging inbox (all channels)',
                'Weekly check-in system',
                'Revenue analytics & projections',
                'Payment tracking & invoicing',
                'Training schedule & calendar',
                'AI-powered coaching insights',
                'Mobile responsive. Works on any device',
                'Your branding, colors, and logo',
                'Ongoing support & updates',
                'Data migration from your current tools',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <div style={{
              borderTop: '1px solid var(--glass-border)', paddingTop: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 500 }}>
                Pricing depends on your setup: number of clients, integrations, custom features.
                Book a free call and we'll give you an exact quote.
              </p>
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
                Book a Free Demo Call <ArrowRight size={18} />
              </a>
            </div>
          </GlassCard>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          SOCIAL PROOF,Placeholder for real testimonials/photos
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 12 }}>
              Built for coaches like you
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
              {/* TODO: Replace with real testimonials once you have them */}
              Here's what coaches say after switching to FitCore
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {[
              { name: 'Marcus Rivera', title: 'Strength & Performance Coach', initials: 'MR', color: '#00e5c8', quote: 'I used to spend Sunday evenings updating spreadsheets. Now everything syncs automatically. My clients get better check-ins and I actually have my weekends back.' },
              { name: 'Sarah Chen', title: 'Online Fitness Coach', initials: 'SC', color: '#6366f1', quote: 'The unified inbox alone saved me hours a week. All my client conversations in one place instead of jumping between five different apps. Game changer.' },
              { name: 'James Okafor', title: 'Body Transformation Specialist', initials: 'JO', color: '#f59e0b', quote: 'My clients love the progress tracking. They can see their own data, which keeps them accountable. Retention went up 30% in the first two months.' },
            ].map((coach, i) => (
              <GlassCard key={i} delay={i * 0.1} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: `${coach.color}20`, border: `2px solid ${coach.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: coach.color,
                  }}>
                    {coach.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{coach.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>{coach.title}</div>
                  </div>
                </div>
                <p style={{
                  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                  fontStyle: 'italic',
                }}>
                  "{coach.quote}"
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
         ════════════════════════════════════════════════════════ */}
      <Section>
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
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
                Get a dashboard that's built around how you actually coach. 15-minute call, no pressure, no commitment.
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
              { label: 'What You Get', href: '#offer' },
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
        }
      `}</style>
    </div>
  );
}
