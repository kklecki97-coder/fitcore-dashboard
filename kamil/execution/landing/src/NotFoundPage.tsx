import { useLang } from './i18n';

export default function NotFoundPage() {
  const { lang } = useLang();
  const isPolish = lang === 'pl';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #07090e)',
      color: 'var(--text-primary, #e8eaed)',
      fontFamily: 'Outfit, sans-serif',
      padding: 24,
      textAlign: 'center',
    }}>
      <h1 style={{
        fontSize: 'clamp(80px, 15vw, 160px)',
        fontWeight: 800,
        color: 'var(--accent-primary, #00e5c8)',
        lineHeight: 1,
        margin: 0,
      }}>
        404
      </h1>
      <p style={{
        fontSize: 'clamp(18px, 3vw, 24px)',
        color: 'var(--text-secondary, #8b949e)',
        margin: '16px 0 32px',
        maxWidth: 480,
      }}>
        {isPolish
          ? 'Strona, której szukasz, nie istnieje lub została przeniesiona.'
          : "The page you're looking for doesn't exist or has been moved."}
      </p>
      <a href={isPolish ? '/pl/' : '/'} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'linear-gradient(135deg, var(--accent-primary, #00e5c8), #00c4aa)',
        color: '#07090e',
        padding: '14px 32px',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 16,
        textDecoration: 'none',
        transition: 'transform 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {isPolish ? '← Wróć na stronę główną' : '← Back to Homepage'}
      </a>
    </div>
  );
}
