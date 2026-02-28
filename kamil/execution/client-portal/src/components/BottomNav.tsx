import { Home, Dumbbell, ClipboardCheck, TrendingUp, MessageSquare, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../i18n';
import type { ClientPage } from '../types';

interface BottomNavProps {
  currentPage: ClientPage;
  onNavigate: (page: ClientPage) => void;
  isMobile: boolean;
  onLogout?: () => void;
}

const navIcons: Record<ClientPage, typeof Home> = {
  home: Home,
  program: Dumbbell,
  'check-in': ClipboardCheck,
  progress: TrendingUp,
  messages: MessageSquare,
};

const navPages: ClientPage[] = ['home', 'program', 'check-in', 'progress', 'messages'];

export default function BottomNav({ currentPage, onNavigate, isMobile, onLogout }: BottomNavProps) {
  const { t } = useLang();

  const navLabels: Record<ClientPage, string> = {
    home: t.nav.home,
    program: t.nav.program,
    'check-in': t.nav.checkIn,
    progress: t.nav.progress,
    messages: t.nav.messages,
  };

  if (isMobile) {
    return (
      <nav style={styles.bottomBar}>
        {navPages.map((page) => {
          const active = currentPage === page;
          const Icon = navIcons[page];
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              style={{
                ...styles.bottomItem,
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon size={20} />
              <span style={{
                ...styles.bottomLabel,
                opacity: active ? 1 : 0,
                maxHeight: active ? '16px' : '0px',
              }}>
                {navLabels[page]}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop: slim left sidebar
  return (
    <nav style={styles.sideNav}>
      <div style={styles.sideNavItems}>
        {navPages.map((page) => {
          const active = currentPage === page;
          const Icon = navIcons[page];
          return (
            <motion.button
              key={page}
              onClick={() => onNavigate(page)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                ...styles.sideItem,
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-primary-dim)' : 'transparent',
              }}
              title={navLabels[page]}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  style={styles.activeBar}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} />
            </motion.button>
          );
        })}
      </div>

      {onLogout && (
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{
            ...styles.sideItem,
            color: 'var(--text-tertiary)',
            background: 'transparent',
          }}
          title={t.nav.logOut}
        >
          <LogOut size={18} />
        </motion.button>
      )}
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

  // Desktop side nav
  sideNav: {
    width: 'var(--nav-width)',
    minWidth: 'var(--nav-width)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    paddingBottom: '16px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
  },
  sideNavItems: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  sideItem: {
    position: 'relative',
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.15s',
  },
  activeBar: {
    position: 'absolute',
    left: '-2px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '20px',
    borderRadius: '0 3px 3px 0',
    background: 'var(--accent-primary)',
    boxShadow: '0 0 8px var(--accent-primary-glow)',
  },
};
