import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, MessageSquare, ClipboardCheck, DollarSign, Dumbbell, UserPlus, CheckCircle } from 'lucide-react';
import type { Page, AppNotification, NotificationType } from '../types';

interface HeaderProps {
  currentPage: Page;
  isMobile?: boolean;
  onMenuToggle?: () => void;
  notifications?: AppNotification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onNotificationClick?: (notif: AppNotification) => void;
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
  payments: 'Payments',
  'check-ins': 'Check-Ins',
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
  payments: 'Invoices and payment tracking',
  'check-ins': 'Review and manage weekly client check-ins',
};

const NOTIF_ICON_CONFIG: Record<NotificationType, { icon: typeof MessageSquare; color: string }> = {
  message: { icon: MessageSquare, color: 'var(--accent-primary)' },
  checkin: { icon: ClipboardCheck, color: 'var(--accent-warm)' },
  payment: { icon: DollarSign, color: 'var(--accent-success)' },
  program: { icon: Dumbbell, color: 'var(--accent-secondary)' },
  client: { icon: UserPlus, color: 'var(--accent-primary)' },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Header({ currentPage, isMobile, onMenuToggle, notifications = [], onMarkRead: _onMarkRead, onMarkAllRead, onNotificationClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

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

      <div style={styles.right}>
        {/* Notification Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsOpen(o => !o)}
            style={{
              ...styles.bellBtn,
              borderColor: isOpen ? 'var(--accent-primary)' : 'var(--glass-border)',
              background: isOpen ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
            }}
          >
            <Bell size={18} color={isOpen ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
            {unreadCount > 0 && (
              <span style={styles.badge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  ...styles.dropdown,
                  right: 0,
                  width: isMobile ? 'calc(100vw - 32px)' : '380px',
                }}
              >
                {/* Dropdown Header */}
                <div style={styles.dropdownHeader}>
                  <h3 style={styles.dropdownTitle}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      style={styles.markAllBtn}
                      onClick={() => {
                        onMarkAllRead?.();
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div style={styles.notifList}>
                  {notifications.length === 0 ? (
                    <div style={styles.emptyState}>
                      <CheckCircle size={32} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
                      <p style={styles.emptyText}>All caught up!</p>
                      <p style={styles.emptySubtext}>No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const config = NOTIF_ICON_CONFIG[notif.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={notif.id}
                          style={{
                            ...styles.notifItem,
                            background: notif.isRead ? 'transparent' : 'var(--accent-primary-dim)',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            onNotificationClick?.(notif);
                            setIsOpen(false);
                          }}
                        >
                          <div style={{
                            ...styles.notifIcon,
                            background: `${config.color}15`,
                          }}>
                            <Icon size={16} color={config.color} />
                          </div>
                          <div style={styles.notifContent}>
                            <div style={styles.notifTitleRow}>
                              <span style={{
                                ...styles.notifTitle,
                                fontWeight: notif.isRead ? 400 : 600,
                                color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                              }}>
                                {notif.title}
                              </span>
                              <span style={styles.notifTime}>{formatTimeAgo(notif.timestamp)}</span>
                            </div>
                            <p style={styles.notifDesc}>{notif.description}</p>
                          </div>
                          {!notif.isRead && (
                            <div style={styles.unreadDot} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Date */}
        {!isMobile && <span style={styles.date}>{today}</span>}
      </div>
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
    fontSize: '18px',
    color: 'var(--text-secondary)',
    fontWeight: 400,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  date: {
    fontSize: '18px',
    color: 'var(--text-tertiary)',
    fontWeight: 400,
  },
  bellBtn: {
    position: 'relative',
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 0.15s, background 0.15s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    background: '#ef4444',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    border: '2px solid var(--bg-card)',
    lineHeight: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: '1px solid var(--glass-border)',
  },
  dropdownTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s',
  },
  notifList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  notifItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 18px',
    borderBottom: '1px solid var(--glass-border)',
    transition: 'background 0.1s',
  },
  notifIcon: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  notifTitle: {
    fontSize: '14px',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  notifTime: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  notifDesc: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    flexShrink: 0,
    marginTop: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '8px',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptySubtext: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
};
