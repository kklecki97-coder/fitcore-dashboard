import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Users, MessageSquare, Dumbbell, BarChart3, CreditCard, Calendar,
  Shield, Zap, Globe, ChevronRight, Star, ArrowRight, Menu, X,
  TrendingUp, Brain, Smartphone, Lock, Palette, HeadphonesIcon, Mail
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   FitCore — Landing Page
   One scrollable page, dark luxe futuristic theme
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
      style={{
        position: 'relative',
        zIndex: 1,
        ...style,
      }}
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

// ── Stat Counter ──
function AnimatedStat({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * value);
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return (
    <span ref={ref} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 40, color: 'var(--accent-primary)', letterSpacing: '-1px' }}>
      {prefix}{display}{suffix}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════ */
export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Testimonials', href: '#testimonials' },
  ];

  const features = [
    { icon: Users, title: 'Client Management', desc: 'Complete client profiles with progress tracking, metrics history, goals, and notes. Filter by plan, status, or search instantly.', color: 'var(--accent-primary)' },
    { icon: Dumbbell, title: 'Workout Programming', desc: 'Build programs from scratch or templates. Add exercises with sets, reps, RPE, tempo, and rest. Assign to any client in seconds.', color: 'var(--accent-secondary)' },
    { icon: MessageSquare, title: 'Multi-Channel Inbox', desc: 'Telegram, WhatsApp, Email, Instagram — all conversations in one unified inbox. Never miss a client message again.', color: '#29ABE2' },
    { icon: BarChart3, title: 'Analytics & Insights', desc: 'Revenue trends, retention rates, client distribution, and AI-powered coaching insights. Know exactly how your business is performing.', color: 'var(--accent-warm)' },
    { icon: CreditCard, title: 'Payments & Invoicing', desc: 'Generate invoices, track payments, monitor overdue balances. Basic, Premium, and Elite plans with automatic billing periods.', color: 'var(--accent-success)' },
    { icon: Calendar, title: 'Schedule & Check-ins', desc: "Today's training calendar, scheduled check-ins with mood/sleep/adherence tracking, and automated follow-up reminders.", color: '#E1306C' },
  ];

  const advancedFeatures = [
    { icon: Brain, title: 'AI Coach Insights', desc: 'Automated analysis of client patterns. Get alerts for at-risk clients, missed check-ins, and revenue opportunities.' },
    { icon: TrendingUp, title: 'Progress Tracking', desc: 'Weight, body fat, bench press, squat, deadlift — all visualized with trend charts. Track streaks and adherence scores.' },
    { icon: Smartphone, title: 'Mobile Responsive', desc: 'Full functionality on any device. Manage your coaching business from your phone, tablet, or desktop.' },
    { icon: Lock, title: 'Secure & Private', desc: 'End-to-end encrypted data storage. Your clients\' information is protected with enterprise-grade security.' },
    { icon: Palette, title: 'Dark & Light Themes', desc: 'Switch between our signature dark luxe theme and a clean light mode. Your dashboard, your preference.' },
    { icon: Globe, title: 'Multi-Language Ready', desc: 'Built for coaches worldwide. Expandable localization system to serve clients in any language.' },
  ];

  const steps = [
    { number: '01', title: 'Onboard Your Clients', desc: 'Add clients with their goals, metrics, and plan. Import from spreadsheets or enter manually.' },
    { number: '02', title: 'Program & Schedule', desc: 'Build workout programs with our exercise library (70+ exercises). Assign programs and schedule check-ins.' },
    { number: '03', title: 'Communicate & Track', desc: 'Message clients across all channels. Track workouts, log progress, and review check-in data.' },
    { number: '04', title: 'Analyze & Grow', desc: 'Use analytics to understand retention, revenue, and performance. Let AI insights guide your coaching business.' },
  ];

  const testimonials = [
    { name: 'Sarah Mitchell', role: 'Online Fitness Coach', avatar: 'SM', text: 'FitCore completely transformed how I manage my clients. I went from juggling 5 different apps to having everything in one place. My retention rate jumped 30% in just two months.', stars: 5 },
    { name: 'Marcus Chen', role: 'Strength & Conditioning Coach', avatar: 'MC', text: 'The workout programming feature alone is worth it. I can build a full 12-week program in minutes and assign it to multiple clients. Game changer for scaling my business.', stars: 5 },
    { name: 'Elena Rodriguez', role: 'Online PT & Nutrition Coach', avatar: 'ER', text: 'I love the multi-channel inbox. My clients reach out on WhatsApp, Telegram, Instagram — and I see everything in one feed. No more missed messages or lost conversations.', stars: 5 },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 49,
      desc: 'Perfect for coaches just getting started',
      features: ['Up to 15 clients', 'Client management', 'Workout programming', 'Basic analytics', 'Email support'],
      popular: false,
    },
    {
      name: 'Professional',
      price: 99,
      desc: 'For established coaches scaling their business',
      features: ['Up to 50 clients', 'Everything in Starter', 'Multi-channel inbox', 'Advanced analytics & AI insights', 'Payments & invoicing', 'Priority support'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 199,
      desc: 'For coaching teams and large operations',
      features: ['Unlimited clients', 'Everything in Professional', 'Team collaboration', 'Custom branding', 'API access', 'Dedicated account manager'],
      popular: false,
    },
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
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5, color: 'var(--text-primary)' }}>
              Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
            </div>
          </div>
        </div>

        {/* Desktop Links */}
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
          <a href="#pricing" style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
            color: '#07090e', padding: '10px 24px', borderRadius: 'var(--radius-sm)',
            fontWeight: 600, fontSize: 14, textDecoration: 'none', letterSpacing: 0.3,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-primary-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >Get Started</a>
        </div>

        {/* Mobile Menu Toggle */}
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

        {/* Mobile Menu */}
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
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}>Get Started</a>
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
          padding: '120px 24px 80px', position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
        }}>
          {/* Badge */}
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

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.08,
              letterSpacing: '-2px', marginBottom: 24, maxWidth: 900,
            }}
          >
            Your Coaching Business,{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
              One Dashboard
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-secondary)', lineHeight: 1.6,
              maxWidth: 640, marginBottom: 48, fontWeight: 400,
            }}
          >
            Manage clients, program workouts, track progress, handle payments,
            and communicate across all channels — all from one premium dashboard
            designed specifically for fitness professionals.
          </motion.p>

          {/* CTA Buttons */}
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
              Start Free Trial <ArrowRight size={18} />
            </a>
            <a href="#features" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)', padding: '16px 36px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 16, textDecoration: 'none', letterSpacing: 0.3,
              backdropFilter: 'blur(20px)', transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              See Features
            </a>
          </motion.div>

          {/* Social Proof Mini */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, marginTop: 56,
              color: 'var(--text-tertiary)', fontSize: 13,
            }}
          >
            <div style={{ display: 'flex' }}>
              {['SM', 'MC', 'ER', 'JD', 'AK'].map((initials, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: '50%', marginLeft: i === 0 ? 0 : -8,
                  background: `linear-gradient(135deg, ${['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-warm)', '#E1306C', '#29ABE2'][i]}, ${['#00c4aa', '#818cf8', '#fbbf24', '#f472b6', '#5ec4e8'][i]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  border: '2px solid var(--bg-primary)', zIndex: 5 - i,
                  position: 'relative',
                }}>
                  {initials}
                </div>
              ))}
            </div>
            <span>Trusted by <strong style={{ color: 'var(--text-secondary)' }}>500+</strong> coaches worldwide</span>
          </motion.div>
        </section>
      </motion.div>

      {/* ════════════════════════════════════════════════════════
          DASHBOARD PREVIEW
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <GlassCard style={{
            padding: 0, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(7, 9, 14, 0.95) 100%)',
          }}>
            {/* Fake Dashboard UI */}
            <div style={{ padding: '24px 24px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{
                flex: 1, background: 'var(--bg-elevated)', borderRadius: 8,
                padding: '6px 16px', fontSize: 12, color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}>
                app.fitcore.io/dashboard
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {/* Simulated Dashboard Content */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                {/* Sidebar Mock */}
                <div style={{
                  width: 200, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                  padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
                  flexShrink: 0,
                }} className="preview-sidebar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>FitCore</span>
                  </div>
                  {['Overview', 'Clients', 'Programs', 'Messages', 'Analytics', 'Payments'].map((item, i) => (
                    <div key={item} style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      color: i === 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                      background: i === 0 ? 'var(--accent-primary-dim)' : 'transparent',
                    }}>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main Content Mock */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                    Dashboard Overview
                  </div>
                  {/* KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Active Clients', val: '24', color: 'var(--accent-primary)' },
                      { label: 'Revenue', val: '$4,850', color: 'var(--accent-success)' },
                      { label: 'Messages', val: '12', color: '#29ABE2' },
                      { label: 'Check-ins', val: '8', color: 'var(--accent-warm)' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{
                        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                        padding: '12px', border: '1px solid var(--glass-border)',
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: kpi.color }}>{kpi.val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Chart Mock */}
                  <div style={{
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                    padding: 16, border: '1px solid var(--glass-border)', height: 140,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenue Trend</div>
                    <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none" style={{ display: 'block' }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,60 C40,55 80,40 120,35 C160,30 200,45 240,25 C280,15 320,20 360,10 L400,5 L400,80 L0,80 Z" fill="url(#chartGrad)" />
                      <path d="M0,60 C40,55 80,40 120,35 C160,30 200,45 240,25 C280,15 320,20 360,10 L400,5" fill="none" stroke="var(--accent-primary)" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Gradient Fade at bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
              background: 'linear-gradient(transparent, var(--bg-primary))',
              pointerEvents: 'none',
            }} />
          </GlassCard>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          STATS BAR
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{
          maxWidth: 1000, margin: '0 auto', padding: '0 24px 100px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32,
          textAlign: 'center',
        }}>
          {[
            { value: 500, suffix: '+', label: 'Coaches Worldwide' },
            { value: 12000, suffix: '+', label: 'Clients Managed' },
            { value: 98, suffix: '%', label: 'Satisfaction Rate' },
            { value: 40, suffix: '%', label: 'Time Saved on Average', prefix: '' },
          ].map((stat, i) => (
            <GlassCard key={i} delay={i * 0.1} style={{ padding: '28px 20px', textAlign: 'center' }}>
              <AnimatedStat value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>{stat.label}</div>
            </GlassCard>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          FEATURES SECTION
         ════════════════════════════════════════════════════════ */}
      <Section id="features">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <Zap size={14} /> Core Features
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              Everything You Need to Coach
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Six powerful tools, one unified platform. Every feature designed to save you time and help your clients succeed.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {features.map((feature, i) => (
              <GlassCard key={i} delay={i * 0.08} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: `${feature.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <feature.icon size={22} style={{ color: feature.color }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{feature.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{feature.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          ADVANCED FEATURES / WHY FITCORE
         ════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-secondary)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <Shield size={14} /> Why FitCore
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              Built Different, Built Better
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Beyond the basics — advanced capabilities that set FitCore apart from every other coaching tool on the market.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {advancedFeatures.map((f, i) => (
              <GlassCard key={i} delay={i * 0.08} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: 'var(--accent-secondary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={18} style={{ color: 'var(--accent-secondary)' }} />
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
              Up and Running in Minutes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {steps.map((step, i) => (
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
          TESTIMONIALS
         ════════════════════════════════════════════════════════ */}
      <Section id="testimonials">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <Star size={14} /> Testimonials
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5 }}>
              Coaches Love FitCore
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {testimonials.map((t, i) => (
              <GlassCard key={i} delay={i * 0.1}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={16} fill="var(--accent-warm)" style={{ color: 'var(--accent-warm)' }} />
                  ))}
                </div>
                {/* Quote */}
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.role}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════
          PRICING
         ════════════════════════════════════════════════════════ */}
      <Section id="pricing">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--accent-success)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              <CreditCard size={14} /> Pricing
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20, alignItems: 'stretch',
          }}>
            {plans.map((plan, i) => (
              <GlassCard key={i} delay={i * 0.1} style={{
                display: 'flex', flexDirection: 'column',
                border: plan.popular ? '1px solid rgba(0, 229, 200, 0.3)' : undefined,
                position: 'relative', overflow: 'visible',
                boxShadow: plan.popular ? '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 229, 200, 0.3), 0 0 60px rgba(0, 229, 200, 0.08)' : undefined,
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                    color: '#07090e', padding: '4px 16px', borderRadius: 100,
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    Most Popular
                  </div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{plan.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 28 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, color: plan.popular ? 'var(--accent-primary)' : 'var(--text-primary)', letterSpacing: -2 }}>
                    ${plan.price}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>/month</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, flex: 1 }}>
                  {plan.features.map((feat, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'var(--accent-primary-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <a href="#" style={{
                  display: 'block', textAlign: 'center', padding: '14px 24px',
                  borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 14,
                  textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
                  ...(plan.popular
                    ? { background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)', color: '#07090e' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }
                  ),
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; if (plan.popular) e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-primary-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {plan.popular ? 'Start Free Trial' : 'Get Started'}
                </a>
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
            {/* Glow behind */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 400, height: 400,
              background: 'radial-gradient(circle, var(--accent-primary-dim) 0%, transparent 70%)',
              pointerEvents: 'none', opacity: 0.5,
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>
                Ready to Transform Your Coaching?
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
                Join 500+ fitness coaches who already use FitCore to manage their business, save time, and deliver better results.
              </p>
              <a href="#pricing" style={{
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
                Start Your Free Trial <ArrowRight size={18} />
              </a>
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
            <a href="mailto:Fitcorehq@gmail.com" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
              fontWeight: 500, transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              <Mail size={14} /> Fitcorehq@gmail.com
            </a>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {['Features', 'Pricing', 'Support', 'Privacy', 'Terms'].map(link => (
              <a key={link} href="#" style={{
                color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: 13,
                fontWeight: 500, transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              >{link}</a>
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
          .preview-sidebar { display: none !important; }
        }
        @media (min-width: 769px) {
          .nav-mobile-toggle { display: none !important; }
          .nav-mobile-menu { display: none !important; }
        }
      `}</style>
    </div>
  );
}
