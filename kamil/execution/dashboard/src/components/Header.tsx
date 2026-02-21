import { Menu } from 'lucide-react';
import type { Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  isMobile?: boolean;
  onMenuToggle?: () => void;
}

const pageTitles: Record<Page, string> = {
  overview: 'Overview',
  clients: 'Clients',
  'client-detail': 'Client Details',
  'add-client': 'Add Client',
  messages: 'Messages',
  analytics: 'Analytics',
  schedule: 'Schedule',
  settings: 'Settings',
  programs: 'Programs',
  'program-builder': 'Program Builder',
};

const pageSubtitles: Record<Page, string> = {
  overview: "Here's what's happening today",
  clients: 'Manage your client roster',
  'client-detail': 'Track progress and manage training',
  'add-client': 'Add a new client to your roster',
  messages: 'Stay connected with your clients',
  analytics: 'Revenue and performance insights',
  schedule: "Today's training sessions",
  settings: 'Customize your dashboard experience',
  programs: 'Build and manage workout programs',
  'program-builder': 'Design your workout program',
};

export default function Header({ currentPage, isMobile, onMenuToggle }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header style={{
      ...styles.header,
      padding: isMobile ? '0 16px' : '0 32px',
    }}>
      <div style={styles.left}>
        {isMobile && (
          <button onClick={onMenuToggle} style={styles.menuBtn}>
            <Menu size={20} />
          </button>
        )}
        <div>
          <h1 style={{
            ...styles.title,
            fontSize: isMobile ? '17px' : '20px',
          }}>{pageTitles[currentPage]}</h1>
          {!isMobile && <p style={styles.subtitle}>{pageSubtitles[currentPage]}</p>}
        </div>
      </div>

      {!isMobile && (
        <div style={styles.right}>
          <span style={styles.date}>{today}</span>
        </div>
      )}
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(var(--glass-blur))',
    position: 'sticky',
    top: 0,
    zIndex: 5,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuBtn: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 400,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
  },
  date: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 400,
  },
};
