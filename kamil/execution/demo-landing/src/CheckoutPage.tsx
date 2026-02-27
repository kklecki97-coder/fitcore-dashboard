import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Shield,
  Users, Dumbbell, MessageSquare, BarChart3, Zap, AlertTriangle,
} from 'lucide-react';
import { useLang } from './i18n';

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
  const { lang, t } = useLang();
  const homeUrl = lang === 'pl' ? '/pl/' : '/';
  const tc = t.checkout;

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
        <Link to={homeUrl} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 500, transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft size={16} /> {tc.backLink}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {tc.secureNote}
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
          <div id="top" style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
                Fit<span style={{ color: 'var(--accent-primary)' }}>Core</span>
              </span>
            </div>
          </div>
        </FadeIn>


        {/* ═══ TWO-COLUMN LAYOUT: Pricing + What's Included ═══ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32,
          marginBottom: 48,
        }} className="checkout-grid">

          {/* ── LEFT: Pricing breakdown ── */}
          <FadeIn delay={0.1} style={{ height: '100%' }}>
            <div style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(var(--glass-blur))',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(0, 229, 200, 0.15)',
              padding: '32px 28px',
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
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20,
              }}>
                {tc.howPricingWorks}
              </div>

              {/* Step 1: Today — Free Trial */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16,
                padding: '16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 229, 200, 0.04)',
                border: '1px solid rgba(0, 229, 200, 0.1)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent-primary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)' }}>1</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {tc.step1Title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 28, fontWeight: 800, color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -1.5, lineHeight: 1,
                    }}>{tc.step1Price}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{tc.step1Duration}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {tc.step1Desc}
                  </div>
                </div>
              </div>

              {/* Step 2: First payment — $100 setup + $49 month */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16,
                padding: '16px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent-secondary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)' }}>2</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {tc.step2Title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 28, fontWeight: 800, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -1.5, lineHeight: 1,
                    }}>{tc.step2Price}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{tc.step2OneTime}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tc.step2Setup}</span> {tc.step2SetupLabel}
                    {' + '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tc.step2Month}</span> {tc.step2MonthLabel}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.5 }}>
                    {tc.step2Note}
                  </div>
                </div>
              </div>

              {/* Step 3: After that — just monthly */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24,
                padding: '16px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent-warm-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-warm)' }}>3</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {tc.step3Title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 28, fontWeight: 800, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', letterSpacing: -1.5, lineHeight: 1,
                    }}>{tc.step3Price}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{tc.step3PerMonth}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {tc.step3Desc}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <a href="#top" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                color: '#07090e', padding: '14px 28px', borderRadius: 'var(--radius-md)',
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                width: '100%',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-primary-glow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {tc.startFreeTrial} <ArrowRight size={18} />
              </a>

              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 10 }}>
                {tc.noCreditCard}
              </div>
            </div>
          </FadeIn>

          {/* ── RIGHT: What's included ── */}
          <FadeIn delay={0.2} style={{ height: '100%' }}>
            <div style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(var(--glass-blur))',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              padding: '32px 28px',
              height: '100%',
              display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Top glow — matches left column */}
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 300, height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-secondary), transparent)',
              }} />

              <div style={{
                fontSize: 12, fontWeight: 800, color: 'var(--accent-warm)',
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20,
              }}>
                {tc.everythingYouGet}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, justifyContent: 'space-between' }}>
                {[
                  { icon: Users, label: tc.included[0].label, desc: tc.included[0].desc, color: 'var(--accent-primary)' },
                  { icon: Dumbbell, label: tc.included[1].label, desc: tc.included[1].desc, color: 'var(--accent-secondary)' },
                  { icon: MessageSquare, label: tc.included[2].label, desc: tc.included[2].desc, color: 'var(--accent-warm)' },
                  { icon: BarChart3, label: tc.included[3].label, desc: tc.included[3].desc, color: 'var(--accent-primary)' },
                  { icon: Zap, label: tc.included[4].label, desc: tc.included[4].desc, color: 'var(--accent-secondary)' },
                  { icon: AlertTriangle, label: tc.included[5].label, desc: tc.included[5].desc, color: 'var(--accent-danger)' },
                  { icon: Users, label: tc.included[6].label, desc: tc.included[6].desc, color: 'var(--accent-warm)' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(22, 28, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 1 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
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
              {tc.whatHappensNext}
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
            }} className="timeline-grid">
              {[
                { step: '1', title: tc.timeline[0].title, desc: tc.timeline[0].desc, color: 'var(--accent-primary)' },
                { step: '2', title: tc.timeline[1].title, desc: tc.timeline[1].desc, color: 'var(--accent-secondary)' },
                { step: '3', title: tc.timeline[2].title, desc: tc.timeline[2].desc, color: 'var(--accent-warm)' },
                { step: '4', title: tc.timeline[3].title, desc: tc.timeline[3].desc, color: 'var(--accent-primary)' },
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
              {tc.commonQuestions}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640, margin: '0 auto' }}>
              {tc.faq.map((item, i) => (
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
                {tc.bottomHeading}
              </h2>
              <p style={{
                fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28,
                maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.6,
              }}>
                {tc.bottomSubheading}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#top" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                  color: '#07090e', padding: '16px 40px', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 16, textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-primary-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {tc.bottomCta} <ArrowRight size={18} />
                </a>
                <a href="https://cal.com/fitcore/demo" target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s',
                  fontWeight: 500,
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  {tc.bottomSecondary}
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
          <Link to={homeUrl} style={{
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
            {tc.copyright}
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
