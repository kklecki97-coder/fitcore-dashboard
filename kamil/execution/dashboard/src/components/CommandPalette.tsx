import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, Users, Dumbbell, MessageSquare,
  BarChart3, Settings, CreditCard, ClipboardCheck, ArrowRight,
  UserPlus, PlusCircle, Sparkles, FileSpreadsheet,
} from 'lucide-react';
import { useLang } from '../i18n';
import { getInitials, getAvatarColor } from '../data';
import type { Page, Client } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onViewClient: (id: string) => void;
  clients: Client[];
}

interface CommandItem {
  id: string;
  type: 'page' | 'client' | 'action';
  label: string;
  subtitle?: string;
  icon?: typeof Search;
  color?: string;
  action: () => void;
}

export default function CommandPalette({ open, onClose, onNavigate, onViewClient, clients }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Pages
  const pageItems: CommandItem[] = useMemo(() => [
    { id: 'p-overview', type: 'page', label: t.nav.overview, icon: LayoutDashboard, action: () => { onNavigate('overview'); onClose(); } },
    { id: 'p-clients', type: 'page', label: t.nav.clients, icon: Users, action: () => { onNavigate('clients'); onClose(); } },
    { id: 'p-programs', type: 'page', label: t.nav.programs, icon: Dumbbell, action: () => { onNavigate('programs'); onClose(); } },
    { id: 'p-messages', type: 'page', label: t.nav.messages, icon: MessageSquare, action: () => { onNavigate('messages'); onClose(); } },
    { id: 'p-checkins', type: 'page', label: t.nav.checkIns, icon: ClipboardCheck, action: () => { onNavigate('check-ins'); onClose(); } },
    { id: 'p-payments', type: 'page', label: t.nav.payments, icon: CreditCard, action: () => { onNavigate('payments'); onClose(); } },
    { id: 'p-analytics', type: 'page', label: t.nav.analytics, icon: BarChart3, action: () => { onNavigate('analytics'); onClose(); } },
    { id: 'p-settings', type: 'page', label: t.header.pages.settings?.title ?? 'Settings', icon: Settings, action: () => { onNavigate('settings'); onClose(); } },
  ], [t, onNavigate, onClose]);

  // Actions
  const actionItems: CommandItem[] = useMemo(() => [
    { id: 'a-invite', type: 'action', label: t.commandPalette?.inviteClient ?? 'Invite Client', icon: UserPlus, color: 'var(--accent-primary)', action: () => { onNavigate('clients'); onClose(); } },
    { id: 'a-new-program', type: 'action', label: t.commandPalette?.createProgram ?? 'Create Program', icon: PlusCircle, color: 'var(--accent-secondary)', action: () => { onNavigate('program-create-chooser'); onClose(); } },
    { id: 'a-ai-program', type: 'action', label: t.commandPalette?.aiProgram ?? 'AI Program Builder', icon: Sparkles, color: 'var(--accent-warm)', action: () => { onNavigate('ai-program-creator'); onClose(); } },
    { id: 'a-import', type: 'action', label: t.commandPalette?.importProgram ?? 'Import from Excel', icon: FileSpreadsheet, color: 'var(--accent-success)', action: () => { onNavigate('program-import'); onClose(); } },
  ], [t, onNavigate, onClose]);

  // Client items
  const clientItems: CommandItem[] = useMemo(() =>
    clients.map(c => ({
      id: `c-${c.id}`,
      type: 'client' as const,
      label: c.name,
      subtitle: `${c.plan} · ${c.status === 'active' ? '●' : c.status === 'paused' ? '⏸' : '○'} ${c.status}`,
      color: getAvatarColor(c.id),
      action: () => { onViewClient(c.id); onClose(); },
    })),
  [clients, onViewClient, onClose]);

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show pages + actions when empty, limit clients to top 5
      return [
        ...pageItems,
        ...actionItems,
        ...clientItems.slice(0, 5),
      ];
    }
    const q = query.toLowerCase();
    const matches = (item: CommandItem) =>
      item.label.toLowerCase().includes(q) ||
      (item.subtitle?.toLowerCase().includes(q) ?? false);
    return [
      ...clientItems.filter(matches),
      ...pageItems.filter(matches),
      ...actionItems.filter(matches),
    ];
  }, [query, pageItems, actionItems, clientItems]);

  // Clamp selection
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        filtered[selectedIdx]?.action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIdx, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  const sectionLabel = (type: string) => {
    switch (type) {
      case 'client': return t.commandPalette?.clients ?? 'Clients';
      case 'page': return t.commandPalette?.pages ?? 'Pages';
      case 'action': return t.commandPalette?.actions ?? 'Actions';
      default: return '';
    }
  };

  // Group items by type for section headers
  let lastType = '';
  let globalIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={s.overlay}
          onClick={onClose}
        >
          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={s.palette}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={s.inputWrap}>
              <Search size={18} color="var(--text-tertiary)" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t.commandPalette?.placeholder ?? 'Search clients, pages, actions...'}
                style={s.input}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd style={s.kbd}>ESC</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} style={s.list}>
              {filtered.length === 0 ? (
                <div style={s.empty}>
                  {t.commandPalette?.noResults ?? 'No results found'}
                </div>
              ) : (
                filtered.map((item) => {
                  globalIdx++;
                  const idx = globalIdx;
                  const isSelected = idx === selectedIdx;
                  const showSection = item.type !== lastType;
                  lastType = item.type;

                  return (
                    <div key={item.id}>
                      {showSection && (
                        <div style={s.sectionLabel}>{sectionLabel(item.type)}</div>
                      )}
                      <div
                        style={{
                          ...s.item,
                          background: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                        }}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIdx(idx)}
                      >
                        {/* Icon */}
                        {item.type === 'client' ? (
                          <div style={{
                            ...s.avatar,
                            background: item.color || 'var(--bg-subtle-hover)',
                          }}>
                            {getInitials(item.label)}
                          </div>
                        ) : (
                          <div style={{
                            ...s.iconWrap,
                            color: item.color || 'var(--text-secondary)',
                          }}>
                            {item.icon && <item.icon size={16} />}
                          </div>
                        )}

                        {/* Label */}
                        <div style={s.labelWrap}>
                          <span style={{
                            ...s.label,
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}>
                            {item.label}
                          </span>
                          {item.subtitle && (
                            <span style={s.subtitle}>{item.subtitle}</span>
                          )}
                        </div>

                        {/* Arrow */}
                        {isSelected && (
                          <ArrowRight size={14} color="var(--accent-primary)" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div style={s.footer}>
              <span style={s.footerHint}>
                <kbd style={s.kbdSmall}>↑↓</kbd> {t.commandPalette?.navigate ?? 'navigate'}
              </span>
              <span style={s.footerHint}>
                <kbd style={s.kbdSmall}>↵</kbd> {t.commandPalette?.select ?? 'select'}
              </span>
              <span style={s.footerHint}>
                <kbd style={s.kbdSmall}>esc</kbd> {t.commandPalette?.close ?? 'close'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  palette: {
    width: '560px',
    maxWidth: '100%',
    maxHeight: '480px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    borderBottom: '1px solid var(--glass-border)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    caretColor: 'var(--accent-primary)',
  },
  kbd: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-tertiary)',
    background: 'var(--bg-subtle-hover)',
    border: '1px solid var(--glass-border)',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-tertiary)',
    padding: '10px 12px 4px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background 0.1s',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  iconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--bg-subtle-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empty: {
    padding: '32px',
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 18px',
    borderTop: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
  },
  footerHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  kbdSmall: {
    padding: '1px 5px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-tertiary)',
    background: 'var(--bg-subtle-hover)',
    border: '1px solid var(--glass-border)',
  },
};
