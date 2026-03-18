import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import { useLang } from './i18n';
import { supabase } from './lib/supabase';

export default function ContactPage() {
  const { lang } = useLang();
  const homeUrl = lang === 'pl' ? '/pl/' : '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSending(true);
    setError('');

    try {
      const { error: dbError } = await supabase.from('contact_submissions').insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      if (dbError) {
        setError(lang === 'pl' ? 'Nie udało się wysłać. Spróbuj ponownie.' : 'Failed to send. Please try again.');
        console.error('Contact form error:', dbError);
      } else {
        setSent(true);
      }
    } catch {
      setError(lang === 'pl' ? 'Coś poszło nie tak.' : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    fontSize: 14, fontFamily: 'var(--font-display)',
    outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px 100px' }}>
        <Link to={homeUrl} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 14,
          fontWeight: 600, marginBottom: 40,
        }}>
          <ArrowLeft size={16} /> {lang === 'pl' ? 'Wróć do FitCore' : 'Back to FitCore'}
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--accent-primary-dim)', border: '1px solid rgba(0, 229, 200, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Mail size={24} color="var(--accent-primary)" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>
            {lang === 'pl' ? 'Skontaktuj się z nami' : 'Get in Touch'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {lang === 'pl'
              ? 'Masz pytanie? Chcesz zobaczyć demo? Napisz do nas.'
              : 'Have a question? Want to see a demo? Drop us a message.'}
          </p>
        </div>

        {sent ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: 'var(--bg-card)', border: '1px solid rgba(0, 229, 200, 0.15)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <CheckCircle2 size={40} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {lang === 'pl' ? 'Wiadomość wysłana!' : 'Message Sent!'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {lang === 'pl'
                ? 'Dzięki! Odpowiemy najszybciej jak to możliwe.'
                : "Thanks! We'll get back to you as soon as possible."}
            </p>
            <Link to={homeUrl} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
              color: '#07090e', fontWeight: 700, fontSize: 14, textDecoration: 'none',
              fontFamily: 'var(--font-display)',
            }}>
              <ArrowLeft size={16} /> {lang === 'pl' ? 'Wróć na stronę' : 'Back to Home'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)', padding: '32px 28px',
          }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                {lang === 'pl' ? 'Imię' : 'Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'pl' ? 'Twoje imię' : 'Your name'}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'pl' ? 'twoj@email.com' : 'your@email.com'}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                {lang === 'pl' ? 'Wiadomość' : 'Message'}
              </label>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={lang === 'pl' ? 'Jak możemy Ci pomóc?' : 'How can we help?'}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !name.trim() || !email.trim() || !message.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                background: 'linear-gradient(135deg, var(--accent-primary), #00c4aa)',
                color: '#07090e', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                fontFamily: 'var(--font-display)', transition: 'transform 0.2s, opacity 0.2s',
                opacity: (sending || !name.trim() || !email.trim() || !message.trim()) ? 0.6 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              {sending
                ? (lang === 'pl' ? 'Wysyłanie...' : 'Sending...')
                : (lang === 'pl' ? 'Wyślij wiadomość' : 'Send Message')}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {lang === 'pl' ? 'Lub napisz bezpośrednio:' : 'Or email us directly:'}{' '}
            <a href="mailto:contact@fitcore.tech" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
              contact@fitcore.tech
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
