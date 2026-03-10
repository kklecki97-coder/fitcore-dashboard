import { Settings } from 'lucide-react';
import { useLang } from '../i18n';
import type { ClientPage } from '../types';

interface HeaderProps {
  clientName: string;
  onNavigate: (page: ClientPage) => void;
}

export default function Header({ clientName, onNavigate }: HeaderProps) {
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
      <div style={styles.right}>
        <button
          style={styles.settingsBtn}
          onClick={() => onNavigate('settings')}
          title="Settings"
        >
          <Settings size={20} />
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
    gap: '12px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
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
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};
