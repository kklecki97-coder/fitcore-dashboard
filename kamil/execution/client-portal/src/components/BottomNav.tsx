import { Home, Zap, CalendarDays, ClipboardCheck, TrendingUp, MessageSquare, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../i18n';
import type { ClientPage } from '../types';

interface BottomNavProps {
  currentPage: ClientPage;
  onNavigate: (page: ClientPage) => void;
  isMobile: boolean;
  onLogout?: () => void;
  unreadCount?: number;
}

const navIcons: Record<string, typeof Home> = {
  home: Home,
  program: Zap,
  calendar: CalendarDays,
  'check-in': ClipboardCheck,
  progress: TrendingUp,
  messages: MessageSquare,
  settings: Settings,
};

const navPages: ClientPage[] = ['home', 'calendar', 'program', 'progress', 'messages'];

export default function BottomNav({ currentPage, onNavigate, isMobile, onLogout, unreadCount = 0 }: BottomNavProps) {
  const { t } = useLang();

  const navLabels: Record<string, string> = {
    home: t.nav.home,
    program: t.nav.program,
    calendar: t.nav.calendar,
    'check-in': t.nav.checkIn,
    progress: t.nav.progress,
    messages: t.nav.messages,
    settings: t.nav.settings,
  };

  if (isMobile) {
    return (
      <nav style={styles.bottomBar}>
        {navPages.map((page) => {
          const active = currentPage === page;
          const Icon = navIcons[page];
          const isCenter = page === 'program';

          if (isCenter) {
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                style={styles.centerBtn}
              >
                <Icon size={24} />
              </button>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              style={{
                ...styles.bottomItem,
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={20} />
                {page === 'messages' && unreadCount > 0 && (
                  <span style={styles.unreadBadge}>{unreadCount}</span>
                )}
              </div>
              <span
                style={{
                  ...styles.bottomLabel,
                  opacity: active ? 1 : 0,
                  maxHeight: active ? '16px' : '0px',
                }}
                aria-hidden={!active}
              >
                {navLabels[page]}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop: labeled left sidebar
  return (
    <nav style={styles.sideNav}>
      {/* Logo */}
      <div style={styles.logoWrap}>
        <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        <div>
          <div style={styles.logoTitle}>FitCore</div>
          <div style={styles.logoSub}>CLIENT PORTAL</div>
        </div>
      </div>

      {/* Menu label */}
      <div style={styles.menuLabel}>MENU</div>

      {/* Nav items */}
      <div style={styles.sideNavItems}>
        {navPages.map((page) => {
          const active = currentPage === page;
          const Icon = navIcons[page];
          return (
            <motion.button
              key={page}
              onClick={() => onNavigate(page)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              style={{
                ...styles.sideItem,
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-primary-dim)' : 'transparent',
              }}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  style={styles.activeBar}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <Icon size={20} style={{ opacity: active ? 1 : 0.5 }} />
                {page === 'messages' && unreadCount > 0 && (
                  <span style={styles.unreadBadge}>{unreadCount}</span>
                )}
              </div>
              <span style={{ fontSize: '14px', fontWeight: active ? 600 : 500, opacity: active ? 1 : 0.6 }}>
                {navLabels[page]}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom section: settings + logout */}
      <div style={styles.bottomSection}>
        <div style={styles.divider} />

        {/* Settings */}
        <motion.button
          onClick={() => onNavigate('settings')}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          style={{
            ...styles.sideItem,
            color: currentPage === 'settings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            background: currentPage === 'settings' ? 'var(--accent-primary-dim)' : 'transparent',
          }}
        >
          {currentPage === 'settings' && (
            <motion.div
              layoutId="nav-indicator"
              style={styles.activeBar}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <Settings size={20} style={{ opacity: currentPage === 'settings' ? 1 : 0.5, flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: currentPage === 'settings' ? 600 : 500, opacity: currentPage === 'settings' ? 1 : 0.6 }}>
            {navLabels.settings}
          </span>
        </motion.button>

        {/* Logout */}
        {onLogout && (
          <motion.button
            onClick={onLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            style={{
              ...styles.sideItem,
              color: 'var(--text-tertiary)',
              background: 'transparent',
            }}
          >
            <LogOut size={18} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={{ fontSize: '14px', fontWeight: 500, opacity: 0.6 }}>
              {t.nav.logOut}
            </span>
          </motion.button>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Mobile bottom bar
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--glass-border)',
    backdropFilter: 'blur(20px)',
    zIndex: 50,
    padding: '0 8px env(safe-area-inset-bottom, 0px)',
  },
  bottomItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 12px',
    minHeight: '44px',
    fontFamily: 'var(--font-display)',
    transition: 'color 0.15s',
  },
  bottomLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    transition: 'all 0.2s',
    overflow: 'hidden',
  },
  centerBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'var(--accent-primary)',
    color: '#07090e',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 0 16px rgba(0,229,200,0.3)',
    flexShrink: 0,
  },

  // Desktop side nav
  sideNav: {
    width: 'var(--nav-width)',
    minWidth: 'var(--nav-width)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px 16px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 8px',
    marginBottom: '24px',
  },
  logoTitle: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '1.2px',
    color: 'var(--accent-primary)',
    textTransform: 'uppercase',
  },
  menuLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px',
    color: 'var(--text-tertiary)',
    padding: '0 8px',
    marginBottom: '8px',
  },
  sideNavItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  sideItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.15s',
    textAlign: 'left',
    width: '100%',
  },
  activeBar: {
    position: 'absolute',
    left: '0px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '20px',
    borderRadius: '0 3px 3px 0',
    background: 'var(--accent-primary)',
    boxShadow: '0 0 8px var(--accent-primary-glow)',
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '8px 0',
  },
  unreadBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-8px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    background: 'var(--accent-danger)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
  },
};
