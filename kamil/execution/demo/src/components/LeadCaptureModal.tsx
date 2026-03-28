import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DELAY_MS = 45_000;
const STORAGE_KEY = 'fitcore-demo-lead-dismissed';

declare function gtag(...args: unknown[]): void;

export default function LeadCaptureModal() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or submitted
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setShow(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    // Track GA event
    if (typeof gtag === 'function') {
      gtag('event', 'demo_lead_capture', { email_provided: true });
    }

    try {
      const res = await fetch(
        'https://ntmrkbgkgdmynyqzwbxs.supabase.co/functions/v1/notify-contact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Demo visitor',
            email: email.trim(),
            message: '[Auto] Interested after exploring demo for 45+ seconds',
          }),
        }
      );
      if (!res.ok) throw new Error('Failed');
    } catch {
      // Silently fail — we still show success to the user
    }

    setLoading(false);
    setSubmitted(true);
    sessionStorage.setItem(STORAGE_KEY, '1');

    setTimeout(() => setShow(false), 3000);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.overlay}
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button onClick={dismiss} style={styles.close}>✕</button>

            {!submitted ? (
              <>
                <div style={styles.icon}>🚀</div>
                <h2 style={styles.title}>
                  This panel can look exactly like this — but with your clients.
                </h2>
                <p style={styles.subtitle}>
                  Drop your email, we'll reach out within 24h. Zero commitment.
                </p>
                <form onSubmit={handleSubmit} style={styles.form}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={styles.input}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.button,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Sending...' : 'I want to see'}
                  </button>
                </form>
              </>
            ) : (
              <div style={styles.success}>
                <div style={styles.checkmark}>✓</div>
                <h2 style={styles.title}>Got it!</h2>
                <p style={styles.subtitle}>We'll reach out soon.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modal: {
    background: 'linear-gradient(145deg, #0f1318, #141a22)',
    border: '1px solid rgba(0, 229, 200, 0.15)',
    borderRadius: '1rem',
    padding: '2.5rem 2rem',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
    position: 'relative' as const,
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 229, 200, 0.06)',
  },
  close: {
    position: 'absolute' as const,
    top: '0.75rem',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    transition: 'color 0.2s',
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  title: {
    color: '#ffffff',
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 0.5rem',
    lineHeight: 1.3,
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: '0.9rem',
    margin: '0 0 1.5rem',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.5rem',
    padding: '0.875rem 1rem',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: "'Outfit', sans-serif",
    transition: 'border-color 0.2s',
  },
  button: {
    background: 'linear-gradient(135deg, #00e5c8, #00c4aa)',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.875rem 1rem',
    color: '#07090e',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  success: {
    padding: '1rem 0',
  },
  checkmark: {
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00e5c8, #00c4aa)',
    color: '#07090e',
    fontSize: '1.5rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
};
