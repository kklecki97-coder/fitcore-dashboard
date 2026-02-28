import { Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n';
import type { Lang } from '../i18n';
import type { Theme } from '../types';

interface HeaderProps {
  clientName: string;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export default function Header({ clientName, theme, onThemeChange }: HeaderProps) {
  const { t, lang, switchLang } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLangSwitch = () => {
    const newLang: Lang = lang === 'en' ? 'pl' : 'en';
    switchLang(newLang);
    // Update URL
    if (newLang === 'pl') {
      navigate('/pl' + (pathname === '/' ? '/' : pathname), { replace: true });
    } else {
      const enPath = pathname.replace(/^\/pl\/?/, '/');
      navigate(enPath || '/', { replace: true });
    }
  };

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        <div>
          <div style={styles.title}>{t.header.brandName}</div>
          <div style={styles.subtitle}>{clientName}</div>
        </div>
      </div>
      <div style={styles.right}>
        <button
          style={styles.langBtn}
          onClick={handleLangSwitch}
          title={t.lang.switchLabel}
        >
          {lang === 'en' ? t.lang.pl : t.lang.en}
        </button>
        <button
          style={styles.themeBtn}
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          title={t.header.toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    borderBottom: '1px solid var(--glass-border)',
    background: 'var(--bg-secondary)',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  langBtn: {
    height: '36px',
    padding: '0 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--accent-primary)',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  themeBtn: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};
