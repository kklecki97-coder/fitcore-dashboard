import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  MessageSquare,
  BarChart3,
  CalendarDays,
  Settings,
  LogOut,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n';
import type { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  profileName?: string;
  onLogout?: () => void;
}

const navPages: { icon: typeof LayoutDashboard; page: Page }[] = [
  { icon: LayoutDashboard, page: 'overview' },
  { icon: Users, page: 'clients' },
  { icon: Dumbbell, page: 'programs' },
  { icon: MessageSquare, page: 'messages' },
  { icon: ClipboardCheck, page: 'check-ins' },
  { icon: CreditCard, page: 'payments' },
  { icon: BarChart3, page: 'analytics' },
  { icon: CalendarDays, page: 'schedule' },
];

const navLabelKeys: Record<string, 'overview' | 'clients' | 'programs' | 'messages' | 'checkIns' | 'payments' | 'analytics' | 'schedule'> = {
  'overview': 'overview',
  'clients': 'clients',
  'programs': 'programs',
  'messages': 'messages',
  'check-ins': 'checkIns',
  'payments': 'payments',
  'analytics': 'analytics',
  'schedule': 'schedule',
};

export default function Sidebar({ currentPage, onNavigate, profileName = 'Coach Kamil', onLogout }: SidebarProps) {
  const { lang, t, switchLang } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLangToggle = () => {
    const newLang = lang === 'en' ? 'pl' : 'en';
    switchLang(newLang);
    if (newLang === 'pl' && !pathname.startsWith('/pl')) {
      navigate('/pl' + (pathname === '/' ? '/' : pathname));
    } else if (newLang === 'en' && pathname.startsWith('/pl')) {
      const enPath = pathname.replace(/^\/pl\/?/, '/') || '/';
      navigate(enPath);
    }
  };

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoSection} onClick={() => onNavigate('overview')}>
        <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 38, height: 38, borderRadius: '50%' }} />
        <div>
          <div style={styles.logoText}>FitCore</div>
          <div style={styles.logoSub}>{t.nav.coachPro}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navLabel}>{t.nav.menu}</div>
        {navPages.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;
          const labelKey = navLabelKeys[item.page];
          return (
            <motion.button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  style={styles.activeIndicator}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={22} style={{ opacity: isActive ? 1 : 0.5 }} />
              <span style={{ opacity: isActive ? 1 : 0.6 }}>{t.nav[labelKey]}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={styles.bottom}>
        <div style={styles.divider} />

        {/* Language toggle */}
        <button onClick={handleLangToggle} style={styles.langBtn}>
          {lang === 'en' ? t.lang.pl : t.lang.en}
        </button>

        <motion.button
          onClick={() => onNavigate('settings')}
          style={{
            ...styles.navItem,
            ...(currentPage === 'settings' ? styles.navItemActive : {}),
          }}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          {currentPage === 'settings' && (
            <motion.div
              layoutId="activeNav"
              style={styles.activeIndicator}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Settings size={22} style={{ opacity: currentPage === 'settings' ? 1 : 0.5 }} />
          <span style={{ opacity: currentPage === 'settings' ? 1 : 0.6 }}>{t.nav.settings}</span>
        </motion.button>
        <button
          onClick={() => {
            if (window.confirm(t.nav.logoutConfirm)) {
              onLogout?.();
            }
          }}
          style={styles.navItem}
        >
          <LogOut size={22} style={{ opacity: 0.5 }} />
          <span style={{ opacity: 0.6 }}>{t.nav.logOut}</span>
        </button>

        {/* Coach Profile */}
        <div style={styles.coachCard}>
          <div style={styles.coachAvatar}>{profileName.charAt(0).toUpperCase()}</div>
          <div>
            <div style={styles.coachName}>{profileName}</div>
            <div style={styles.coachPlan}>{t.nav.proPlan}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '100%',
    minWidth: '260px',
    height: '100vh',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 8px',
    marginBottom: '32px',
    cursor: 'pointer',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
  },
  logoText: {
    fontSize: '25px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  logoSub: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  navLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '1.5px',
    padding: '8px 12px 12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.15s',
    width: '100%',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '20px',
    borderRadius: '0 3px 3px 0',
    background: 'var(--accent-primary)',
    boxShadow: '0 0 8px var(--accent-primary-glow)',
  },
  bottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '8px 0 12px',
  },
  langBtn: {
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent-primary)',
    background: 'transparent',
    color: 'var(--accent-primary)',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    letterSpacing: '1px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginLeft: '12px',
    marginBottom: '8px',
    transition: 'background 0.15s',
  },
  coachCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    marginTop: '12px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
  },
  coachAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
  },
  coachName: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  coachPlan: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
};
