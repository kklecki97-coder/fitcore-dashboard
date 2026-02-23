import { Sun, Moon } from 'lucide-react';
import type { Theme } from '../types';

interface HeaderProps {
  clientName: string;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export default function Header({ clientName, theme, onThemeChange }: HeaderProps) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        <div>
          <div style={styles.title}>FitCore</div>
          <div style={styles.subtitle}>{clientName}</div>
        </div>
      </div>
      <button
        style={styles.themeBtn}
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
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
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#07090e',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
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
