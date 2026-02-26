import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Dumbbell, BarChart3,
  Zap, ChevronRight, ChevronLeft, ArrowRight, Menu, X,
  Mail, Play, CheckCircle2,
  LayoutDashboard,
  AlertTriangle, Eye, TrendingUp,
  Clock, DollarSign, UserMinus, Shield,
} from 'lucide-react';

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
const screenshots = [
  { src: '/1-overview.png', label: 'Dashboard Overview', desc: 'Revenue, clients, check-ins, smart alerts — all at a glance' },
  { src: '/2-clients.png', label: 'Client Management', desc: 'Every client\'s progress, plan, and status in one roster' },
  { src: '/3-programs.png', label: 'Workout Programs', desc: 'Build and assign programs with sets, reps, RPE, and tempo' },
  { src: '/4-messages.png', label: 'Unified Inbox', desc: 'Telegram, WhatsApp, Instagram, Email — one conversation feed' },
  { src: '/5-analytics.png', label: 'Analytics & Revenue', desc: 'Revenue trends, retention rates, client value, plan breakdown' },
];

function ScreenshotCarousel() {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.96]);

  const navLinks = [
    { label: 'Features', href: '#features' },
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
              Built for Fitness Coaches
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
            Your coaching is elite.{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
              Your business should look like it.
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
            You spent years mastering your craft. But your clients still get Google Sheets and WhatsApp voice notes.
            FitCore gives you a professional platform that matches your expertise — so your business finally looks as good as your coaching.
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
          THE REAL PROBLEM — EMOTIONAL, NOT OPERATIONAL
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: -1.5 }}>
              You're great at coaching.{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>You're drowning in everything else.</span>
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
                The Admin Trap
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                It's 11pm. You're copying a workout into WhatsApp, updating a spreadsheet, and chasing an unpaid invoice.
                This isn't what you signed up for. Your clients are paying for your expertise — not your evenings.
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
                The Perception Gap
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Your coaching is worth $400/month. But when a client gets a Google Form and a shared Drive folder,
                they feel $150/month. You're not undercharging because your coaching is weak —
                you're undercharging because your packaging undersells you.
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
                The Invisible Ceiling
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                You can feel the ceiling — somewhere around 20-30 clients — where adding one more breaks something.
                More tabs, more threads, more balls in the air. That ceiling isn't your capacity.
                It's your infrastructure.
              </p>
            </GlassCard>
          </div>
        </div>
      </Section>


      {/* ── Stakes Bridge Line ── */}
      <Section>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <p style={{
            fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 800, lineHeight: 1.15,
            letterSpacing: '-1.5px', margin: '0 auto',
          }}>
            Every month without a system{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-danger), var(--accent-warm), var(--accent-danger))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
              costs you clients, revenue, and hours you'll never get back.
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
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 0 }}>
              You're not saving money by not having a system.{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>You're paying for it differently.</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }} className="stat-cards-grid">
            {[
              {
                icon: Clock,
                value: '5+ hrs/week',
                label: 'on admin that software should handle',
                consequence: 'That\'s 20+ hours a month not coaching, not selling, not resting.',
                color: 'var(--accent-danger)',
                bg: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(239, 68, 68, 0.04) 0%, var(--bg-card) 60%)',
              },
              {
                icon: DollarSign,
                value: '$100–200/client',
                label: 'left on the table from undercharging',
                consequence: 'With 20 clients, that\'s $2,000–4,000/month you\'re leaving behind.',
                color: 'var(--accent-warm)',
                bg: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 60%)',
              },
              {
                icon: UserMinus,
                value: '10–20% churn',
                label: 'from poor client experience',
                consequence: 'Every 5 clients you lose to disorganisation costs you $500–1,000/month.',
                color: 'var(--accent-secondary)',
                bg: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                gradient: 'linear-gradient(160deg, rgba(99, 102, 241, 0.06) 0%, var(--bg-card) 60%)',
              },
              {
                icon: AlertTriangle,
                value: '20–30 clients',
                label: 'is your manual ceiling',
                consequence: 'Past that, something always slips. A check-in missed. A program late. A client lost.',
                color: 'var(--accent-primary)',
                bg: 'rgba(0, 229, 200, 0.1)',
                border: '1px solid rgba(0, 229, 200, 0.2)',
                gradient: 'linear-gradient(160deg, rgba(0, 229, 200, 0.04) 0%, var(--bg-card) 60%)',
              },
            ].map((stat, i) => (
              <GlassCard key={i} delay={i * 0.08} style={{
                padding: '48px 32px 40px', textAlign: 'center',
                border: stat.border,
                background: stat.gradient,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Icon — fixed height block */}
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: stat.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 28,
                }}>
                  <stat.icon size={22} style={{ color: stat.color }} />
                </div>
                {/* Stat number */}
                <div style={{
                  fontSize: 'clamp(24px, 2.8vw, 38px)', fontWeight: 800, color: stat.color,
                  fontFamily: 'var(--font-mono)', lineHeight: 1.1, letterSpacing: '-1px',
                  marginBottom: 14, flexShrink: 0, width: '100%', textAlign: 'center',
                }}>
                  {stat.value}
                </div>
                {/* Label — fixed height via minHeight to force consistent grid alignment */}
                <div style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                  lineHeight: 1.5, minHeight: '42px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                }}>
                  {stat.label}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>


      {/* ════════════════════════════════════════════════════════
          BEFORE / AFTER CONTRAST
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              What your clients see today vs. what they could see
            </h2>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
          }} className="before-after-grid">
            {/* BEFORE */}
            <GlassCard style={{
              padding: '36px 32px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(14, 18, 27, 0.85) 100%)',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
                background: 'var(--accent-danger-dim)', borderRadius: 8, padding: '6px 14px',
              }}>
                <X size={14} style={{ color: 'var(--accent-danger)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-danger)', letterSpacing: 0.5 }}>WITHOUT FITCORE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  'Workout plan buried in a WhatsApp thread from 3 weeks ago',
                  'Progress photos scattered across their camera roll',
                  'Check-ins via a Google Form that nobody reviews on time',
                  '"Just Venmo me" payment process',
                  'No visibility into their own progress or trends',
                  'Feels like they\'re paying for a texting buddy, not a professional service',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <X size={16} style={{ color: 'var(--accent-danger)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* AFTER */}
            <GlassCard style={{
              padding: '36px 32px',
              border: '1px solid rgba(0, 229, 200, 0.2)',
              background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.05) 0%, rgba(14, 18, 27, 0.85) 100%)',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
                background: 'var(--accent-primary-dim)', borderRadius: 8, padding: '6px 14px',
              }}>
                <CheckCircle2 size={14} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 0.5 }}>WITH FITCORE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  'Their program in a clean, branded portal they can access anytime',
                  'Progress photos, weight trends, and PRs tracked automatically',
                  'Weekly check-ins with mood, sleep, nutrition — all in one place',
                  'Professional invoicing with status tracking',
                  'Charts showing their body composition and strength over months',
                  'Feels like working with a premium, organized professional',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: 600, margin: '0 auto' }}>
              The coach charging $400/month isn't better than you.
              They just have better infrastructure. Their client experience does the convincing.
            </p>
          </div>
        </div>
      </Section>


      {/* ════════════════════════════════════════════════════════
          FEATURE ROWS — ALTERNATING IMAGE + TEXT
         ════════════════════════════════════════════════════════ */}

      {/* Feature 1: Client Management */}
      <Section>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Client Management</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              Your entire roster, one screen
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              Every client's progress, plan tier, revenue, streak, and last check-in — visible at a glance.
              Filter by status, spot who needs attention, and never lose track of anyone.
            </p>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: '#29ABE2', letterSpacing: 0.8, textTransform: 'uppercase' }}>Unified Inbox</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              Every conversation, one feed
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              Telegram, WhatsApp, Instagram, Email — all in one inbox.
              Quick-reply templates, read receipts, and smart suggestions. No more switching between apps.
            </p>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Workout Programs</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              Build programs, assign in seconds
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              50+ exercise library with sets, reps, RPE, tempo, and rest periods.
              Save as templates, duplicate, and assign to any client with one click.
            </p>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Analytics & Revenue</span>
            </div>
            <h3 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
              Know your numbers
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 440 }}>
              Monthly revenue, projected annual, retention rate, average client value.
              See which plan tier drives the most income and who your top performers are.
            </p>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          COACH DASHBOARD — SCREENSHOT CAROUSEL + FEATURES
         ════════════════════════════════════════════════════════ */}
      <Section id="features">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <LayoutDashboard size={14} /> The Dashboard
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5 }}>
              One screen. Every client. No tab-switching.
            </h2>
          </div>
        </div>
      </Section>

      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 60px' }}>
          <ScreenshotCarousel />
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
        </div>
      </Section>


      {/* ════════════════════════════════════════════════════════
          WHAT YOU GET
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
              Your Complete Coaching Platform
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Everything included. No feature gates, no upsells. One platform built around how you coach.
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
                'Workout program builder with exercise library',
                'Unified messaging inbox (all channels)',
                'Weekly check-in system with wellness metrics',
                'Revenue analytics & projections',
                'Payment tracking & invoicing',
                'Training schedule & calendar',
                'Smart alerts for at-risk clients',
                'Branded client portal included',
                'Mobile responsive — works on any device',
                'Your branding, colors, and logo',
                'Ongoing support & updates',
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
          FINAL CTA — STAKES-DRIVEN
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
                Every month without a system costs you clients, revenue, and hours you'll never get back.
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
                15-minute call. No pressure. No commitment.
                Just a conversation about what your business could look like with the right infrastructure.
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
          .before-after-grid {
            grid-template-columns: 1fr !important;
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
