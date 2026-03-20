import { Settings } from 'lucide-react';
import { useLang } from '../i18n';
import type { ClientPage } from '../types';

interface HeaderProps {
  clientName: string;
  isMobile?: boolean;
  onNavigate?: (page: ClientPage) => void;
}

export default function Header({ clientName, isMobile, onNavigate }: HeaderProps) {
  const { t } = useLang();

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        <div>
          <div style={styles.title}>{t.header.brandName}</div>
          <div style={styles.subtitle}>{clientName}</div>
        </div>
      </div>

      {isMobile && onNavigate && (
        <button
          onClick={() => onNavigate('settings')}
          style={styles.settingsBtn}
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      )}
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
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  settingsBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};
