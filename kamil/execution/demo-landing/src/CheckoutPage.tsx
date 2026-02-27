import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Shield,
  Users, Dumbbell, MessageSquare, BarChart3, Zap, AlertTriangle,
} from 'lucide-react';

// ── Stripe Payment Link (replace with real URL after creating Stripe account) ──
const CHECKOUT_URL = 'https://buy.stripe.com/PLACEHOLDER';

// ── Animated wrapper ──
function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export default function CheckoutPage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, var(--accent-primary-dim) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Top bar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(7, 9, 14, 0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '0 24px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 500, transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft size={16} /> Back to FitCore
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Secure checkout powered by Stripe
          </span>
        </div>
      </motion.nav>


      {/* ── Main content ── */}
      <div style={{
        maxWidth: 960, margin: '0 auto', padding: '60px 24px 120px',
        position: 'relative', zIndex: 1,
      }}>

        {/* ═══ HEADER ═══ */}
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
                Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800,
              letterSpacing: -1.5, marginBottom: 12, lineHeight: 1.15,
            }}>
              You're one step away from<br />
              <span style={{ color: 'var(--accent-primary)' }}>running your coaching like a business.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Here's exactly what happens when you start.
            </p>
          </div>
        </FadeIn>


        {/* ═══ TWO-COLUMN LAYOUT: Pricing + What's Included ═══ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32,
          marginBottom: 48,
        }} className="checkout-grid">

          {/* ── LEFT: Pricing breakdown ── */}
          <FadeIn delay={0.1}>
            <div style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(var(--glass-blur))',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(0, 229, 200, 0.15)',
              padding: '40px 36px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Top glow */}
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 300, height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
              }} />

              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent-warm)',
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 28,
              }}>
                How Pricing Works
              </div>

              {/* Step 1: Today — Free Trial */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24,
                padding: '20px', borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 229, 200, 0.04)',
                border: '1px solid rgba(0, 229, 200, 0.1)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--accent-primary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-primary)' }}>1</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Today — Start Your Free Trial
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 36, fontWeight: 800, color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -2, lineHeight: 1,
                    }}>$0</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>for 14 days</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    Full platform access. No card required. Add your clients, build programs, test everything.
                  </div>
                </div>
              </div>

              {/* Step 2: First payment — $100 setup + $49 month */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24,
                padding: '20px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--accent-secondary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>2</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    After Trial — First Payment
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 36, fontWeight: 800, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -2, lineHeight: 1,
                    }}>$149</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>one-time</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>$100</span> setup fee
                    {' + '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>$49</span> first month
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
                    Only charged if you decide to continue after the trial.
                  </div>
                </div>
              </div>

              {/* Step 3: After that — just monthly */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32,
                padding: '20px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--accent-warm-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-warm)' }}>3</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    After That — Just Monthly
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 36, fontWeight: 800, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -2, lineHeight: 1,
                    }}>$49</span>
                    <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500 }}>/month</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    No setup fee again. Cancel anytime. No contracts. No per-client limits.
                  </div>
                </div>
              </div>

              {/* CTA */}
              <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                color: '#07090e', padding: '16px 32px', borderRadius: 'var(--radius-md)',
                fontWeight: 700, fontSize: 16, textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                width: '100%',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-primary-glow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Start Free Trial <ArrowRight size={18} />
              </a>

              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 10 }}>
                No credit card required — 14 days free
              </div>
            </div>
          </FadeIn>

          {/* ── RIGHT: What's included ── */}
          <FadeIn delay={0.2}>
            <div style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(var(--glass-blur))',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
              padding: '40px 36px',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 28,
              }}>
                Everything You Get
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { icon: Users, label: 'Full client management', desc: 'Roster, streaks, revenue, status — all in one view', color: 'var(--accent-primary)' },
                  { icon: Dumbbell, label: 'Workout program builder', desc: '50+ exercises, templates, drag-and-drop scheduling', color: 'var(--accent-secondary)' },
                  { icon: MessageSquare, label: 'Unified inbox', desc: 'Telegram, WhatsApp, Instagram, Email — one thread per client', color: 'var(--accent-warm)' },
                  { icon: BarChart3, label: 'Analytics & revenue tracking', desc: 'See which clients drive revenue and who needs attention', color: 'var(--accent-primary)' },
                  { icon: Zap, label: 'Weekly check-in system', desc: 'Automated reminders, mood/sleep/nutrition tracking', color: 'var(--accent-secondary)' },
                  { icon: AlertTriangle, label: 'Smart alerts for at-risk clients', desc: 'Know before they churn — missed check-ins, dropped streaks', color: 'var(--accent-danger)' },
                  { icon: Users, label: 'No per-client limits', desc: '10 clients or 80 — same price, no extra fees', color: 'var(--accent-warm)' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                      background: `${item.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </FadeIn>
        </div>


        {/* ═══ TIMELINE: What happens after you pay ═══ */}
        <FadeIn delay={0.3}>
          <div style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(var(--glass-blur))',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            padding: '40px 48px', marginBottom: 48,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 32,
              textAlign: 'center',
            }}>
              What Happens Next
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
            }} className="timeline-grid">
              {[
                {
                  step: '1',
                  title: 'Start your free trial',
                  desc: 'Sign up in 30 seconds. No credit card, no commitment.',
                  color: 'var(--accent-primary)',
                },
                {
                  step: '2',
                  title: 'Use it for 14 days',
                  desc: 'Full access. Add clients, build programs, test everything.',
                  color: 'var(--accent-secondary)',
                },
                {
                  step: '3',
                  title: 'Decide if it\'s for you',
                  desc: 'Love it? Pay $149 ($100 setup + $49 first month) and keep going. Not for you? Walk away free.',
                  color: 'var(--accent-warm)',
                },
                {
                  step: '4',
                  title: '$49/month after that',
                  desc: 'Simple monthly subscription. Cancel anytime, no contracts.',
                  color: 'var(--accent-primary)',
                },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `${item.color}20`,
                    border: `2px solid ${item.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)' }}>
                      {item.step}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>


        {/* ═══ FAQ ═══ */}
        <FadeIn delay={0.35}>
          <div style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(var(--glass-blur))',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            padding: '40px 48px', marginBottom: 48,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 28,
              textAlign: 'center',
            }}>
              Common Questions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640, margin: '0 auto' }}>
              {[
                {
                  q: 'Do I need a credit card to start the trial?',
                  a: 'No. The 14-day trial is completely free — no card, no payment info, nothing. Just sign up and start using the platform.',
                },
                {
                  q: 'What happens after the 14 days?',
                  a: 'If you want to continue, your first payment is $149 — that\'s the $100 one-time setup fee plus your first month ($49). After that, it\'s just $49/month. If it\'s not for you, just stop — nothing is charged.',
                },
                {
                  q: 'What is the $100 setup fee for?',
                  a: 'It\'s a one-time payment that gives you permanent access to the FitCore platform — client management, workout builder, inbox, analytics, check-ins, and everything else.',
                },
                {
                  q: 'Can I cancel the monthly subscription anytime?',
                  a: 'Yes. No contracts, no cancellation fees. Cancel whenever you want and keep using the platform until the end of your billing period.',
                },
                {
                  q: 'Is there a limit on how many clients I can manage?',
                  a: 'No. Whether you have 10 clients or 80, the price is the same. Your growth doesn\'t cost you more.',
                },
                {
                  q: 'What if I want to talk to someone first?',
                  a: 'No problem. You can book a free 15-minute demo call instead — no commitment, just a walkthrough of the platform.',
                },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '20px 24px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {item.q}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>


        {/* ═══ BOTTOM CTA ═══ */}
        <FadeIn delay={0.4}>
          <div style={{
            textAlign: 'center',
            background: 'linear-gradient(160deg, rgba(14, 18, 27, 0.97) 0%, rgba(18, 22, 36, 0.97) 100%)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(0, 229, 200, 0.15)',
            padding: '48px 40px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', bottom: -80, left: '50%', transform: 'translateX(-50%)',
              width: 400, height: 200,
              background: 'radial-gradient(ellipse, rgba(0, 229, 200, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{
                fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800,
                letterSpacing: -1, marginBottom: 12, lineHeight: 1.2,
              }}>
                Ready to run your coaching like a real business?
              </h2>
              <p style={{
                fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28,
                maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.6,
              }}>
                14 days free. No credit card. No risk.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                  color: '#07090e', padding: '16px 40px', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 16, textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-primary-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  Start Free Trial <ArrowRight size={18} />
                </a>
                <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s',
                  fontWeight: 500,
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  or book a free demo first →
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>


      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)', padding: '32px 24px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
        }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none', fontSize: 13, color: 'var(--text-tertiary)',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
          </Link>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            &copy; 2026 FitCore. All rights reserved.
          </span>
        </div>
      </footer>


      {/* ── Responsive ── */}
      <style>{`
        @media (max-width: 768px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
          .timeline-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .timeline-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
