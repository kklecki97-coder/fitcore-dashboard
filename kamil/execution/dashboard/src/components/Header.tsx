import { Bell, Search, ChevronDown } from 'lucide-react';
import type { Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  unreadCount: number;
}

const pageTitles: Record<Page, string> = {
  overview: 'Overview',
  clients: 'Clients',
  'client-detail': 'Client Details',
  messages: 'Messages',
  analytics: 'Analytics',
  schedule: 'Schedule',
  settings: 'Settings',
};

const pageSubtitles: Record<Page, string> = {
  overview: "Here's what's happening today",
  clients: 'Manage your client roster',
  'client-detail': 'Track progress and manage training',
  messages: 'Stay connected with your clients',
  analytics: 'Revenue and performance insights',
  schedule: "Today's training sessions",
  settings: 'Customize your dashboard experience',
};

export default function Header({ currentPage, unreadCount }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>{pageTitles[currentPage]}</h1>
        <p style={styles.subtitle}>{pageSubtitles[currentPage]}</p>
      </div>

      <div style={styles.right}>
        <span style={styles.date}>{today}</span>

        {/* Search */}
        <div style={styles.searchBox}>
          <Search size={15} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search..."
            style={styles.searchInput}
          />
          <kbd style={styles.kbd}>/</kbd>
        </div>

        {/* Notifications */}
        <button style={styles.iconBtn}>
          <Bell size={18} />
          {unreadCount > 0 && <span style={styles.notifDot} />}
        </button>

        {/* Profile */}
        <button style={styles.profileBtn}>
          <div style={styles.profileAvatar}>K</div>
          <ChevronDown size={14} color="var(--text-secondary)" />
        </button>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 'var(--header-height)',
    padding: '0 32px',
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
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '20px',
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
    gap: '16px',
  },
  date: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 400,
    marginRight: '8px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    minWidth: '200px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    flex: 1,
  },
  kbd: {
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  iconBtn: {
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    boxShadow: '0 0 6px var(--accent-primary)',
  },
  profileBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    cursor: 'pointer',
  },
  profileAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
  },
};
