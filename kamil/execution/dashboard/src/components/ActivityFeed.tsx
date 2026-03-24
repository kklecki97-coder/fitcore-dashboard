import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  ClipboardCheck,
  MessageSquare,
  DollarSign,
  Trophy,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import ActivityFeedModal from './ActivityFeedModal';
import { getInitials, getAvatarColor } from '../data';
import { buildFeed, FEED_EVENT_CONFIG } from '../utils/activity-feed';
import type { FeedEvent, FeedEventType } from '../utils/activity-feed';
import { relativeTime, getDaySeparator } from '../utils/relative-time';
import { useLang } from '../i18n';
import type { Client, Message, CheckIn, WorkoutLog, WorkoutSetLog, Invoice } from '../types';

// Icon map — lucide components by string name
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Dumbbell,
  ClipboardCheck,
  MessageSquare,
  DollarSign,
  Trophy,
  UserPlus,
};

interface FilterOption {
  key: string;
  label: string;
  types: FeedEventType[] | null; // null = all
}

interface ActivityFeedProps {
  clients: Client[];
  messages: Message[];
  checkIns: CheckIn[];
  workoutLogs: WorkoutLog[];
  workoutSetLogs: WorkoutSetLog[];
  invoices: Invoice[];
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages' | 'check-ins') => void;
  isMobile: boolean;
}

export default function ActivityFeed({
  clients,
  messages,
  checkIns,
  workoutLogs,
  workoutSetLogs,
  invoices,
  onViewClient: _onViewClient,
  onNavigate: _onNavigate,
  isMobile,
}: ActivityFeedProps) {
  // onViewClient and onNavigate kept in props for future use but currently modal handles all actions
  void _onViewClient; void _onNavigate;
  const { t, lang } = useLang();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState(false);
  const [, setTick] = useState(0);
  const [modalEvent, setModalEvent] = useState<FeedEvent | null>(null);

  // Refresh relative timestamps every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const filters: FilterOption[] = useMemo(() => [
    { key: 'all', label: t.activityFeed.filterAll, types: null },
    { key: 'workouts', label: t.activityFeed.filterWorkouts, types: ['workout_completed', 'workout_missed', 'personal_record'] },
    { key: 'checkins', label: t.activityFeed.filterCheckIns, types: ['checkin_submitted', 'checkin_reviewed'] },
    { key: 'messages', label: t.activityFeed.filterMessages, types: ['message_received'] },
    { key: 'payments', label: t.activityFeed.filterPayments, types: ['invoice_paid', 'invoice_overdue'] },
  ], [t]);

  const currentFilter = filters.find(f => f.key === activeFilter);

  const events = useMemo(() =>
    buildFeed(
      clients, messages, checkIns, workoutLogs, workoutSetLogs, invoices, lang as 'en' | 'pl',
      {
        limit: expanded ? 50 : (isMobile ? 5 : 4),
        filter: currentFilter?.types ?? undefined,
      },
    ),
    [clients, messages, checkIns, workoutLogs, workoutSetLogs, invoices, lang, expanded, isMobile, currentFilter],
  );

  // Group events by day for separators
  const groupedEvents = useMemo(() => {
    const groups: { label: string; events: FeedEvent[] }[] = [];
    let currentDay = '';
    for (const event of events) {
      const day = getDaySeparator(event.timestamp, lang as 'en' | 'pl');
      if (day !== currentDay) {
        currentDay = day;
        groups.push({ label: day, events: [] });
      }
      groups[groups.length - 1].events.push(event);
    }
    return groups;
  }, [events, lang]);

  const totalCount = useMemo(() =>
    buildFeed(clients, messages, checkIns, workoutLogs, workoutSetLogs, invoices, lang as 'en' | 'pl', {
      limit: 200,
      filter: currentFilter?.types ?? undefined,
    }).length,
    [clients, messages, checkIns, workoutLogs, workoutSetLogs, invoices, lang, currentFilter],
  );

  const hasMore = !expanded && totalCount > events.length;

  // Live indicator — check if newest event is <5 min old
  const isLive = events.length > 0 && (new Date().getTime() - new Date(events[0].timestamp).getTime()) < 300_000;

  return (
    <GlassCard delay={0.4} style={{ gridColumn: '1 / -1', ...(isMobile ? { padding: '16px' } : {}) }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h3 style={{ ...styles.title, fontSize: isMobile ? '15px' : '21px' }}>
            {t.activityFeed.title}
          </h3>
          {isLive && (
            <span style={styles.liveBadge}>
              <span style={styles.liveDot} />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ ...styles.filterRow, ...(isMobile ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } : {}) }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              ...styles.filterChip,
              ...(activeFilter === f.key ? styles.filterChipActive : {}),
              fontSize: isMobile ? '12px' : '13px',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: isMobile ? '13px' : '15px', color: 'var(--text-secondary)' }}>
            {currentFilter?.key !== 'all'
              ? t.activityFeed.noFilteredEvents
              : t.activityFeed.noEvents}
          </span>
        </div>
      ) : (
        <div style={styles.eventList}>
          <AnimatePresence mode="popLayout">
            {groupedEvents.map((group) => (
              <div key={group.label}>
                {/* Day separator */}
                <div style={{ ...styles.daySeparator, fontSize: isMobile ? '11px' : '12px' }}>
                  <span style={styles.daySeparatorLine} />
                  <span style={styles.daySeparatorText}>{group.label}</span>
                  <span style={styles.daySeparatorLine} />
                </div>

                {group.events.map((event, i) => (
                  <FeedEventCard
                    key={event.id}
                    event={event}
                    lang={lang as 'en' | 'pl'}
                    isMobile={isMobile}
                    delay={i * 0.03}
                    onOpenModal={setModalEvent}
                  />
                ))}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Show more / collapse */}
      {(hasMore || expanded) && events.length > 0 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          style={styles.showMoreBtn}
        >
          {expanded
            ? (lang === 'pl' ? 'Zwiń' : 'Show less')
            : (lang === 'pl' ? `Pokaż więcej (${totalCount - events.length})` : `Show more (${totalCount - events.length})`)
          }
          <ChevronDown size={14} style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }} />
        </button>
      )}
      {/* Modal — read-only event detail */}
      {modalEvent && (
        <ActivityFeedModal
          event={modalEvent}
          client={clients.find(c => c.id === modalEvent.clientId) || null}
          messages={messages}
          checkIns={checkIns}
          invoices={invoices}
          workoutLogs={workoutLogs}
          onClose={() => setModalEvent(null)}
          lang={lang as 'en' | 'pl'}
          isMobile={isMobile}
        />
      )}
    </GlassCard>
  );
}

// ── Individual Event Card ──

interface FeedEventCardProps {
  event: FeedEvent;
  lang: 'en' | 'pl';
  isMobile: boolean;
  delay: number;
  onOpenModal: (event: FeedEvent) => void;
}

function FeedEventCard({ event, lang, isMobile, delay, onOpenModal }: FeedEventCardProps) {
  const config = FEED_EVENT_CONFIG[event.type];
  const IconComponent = ICON_MAP[config.icon];
  const time = relativeTime(event.timestamp, lang);

  const actionLabel = event.actionType === 'reply'
    ? (lang === 'pl' ? 'Odpowiedz' : 'Reply')
    : event.actionType === 'review'
      ? (lang === 'pl' ? 'Sprawdź' : 'Review')
      : event.actionType === 'view'
        ? (lang === 'pl' ? 'Zobacz' : 'View')
        : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.3, delay }}
      style={styles.eventCard}
    >
      {/* Color bar */}
      <div style={{ ...styles.colorBar, background: config.color }} />

      {/* Avatar */}
      <div
        style={{ ...styles.avatar, background: getAvatarColor(event.clientId), cursor: 'pointer' }}
        onClick={() => onOpenModal(event)}
      >
        {getInitials(event.clientName)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.eventHeader}>
          <span style={{ ...styles.eventTitle, fontSize: isMobile ? '13px' : '14px' }}>
            {event.title}
          </span>
          <span style={{ ...styles.eventTime, fontSize: isMobile ? '11px' : '12px' }}>
            {time}
          </span>
        </div>
        {event.detail && (
          <div style={{ ...styles.eventDetail, fontSize: isMobile ? '12px' : '13px' }}>
            {event.detail}
          </div>
        )}
      </div>

      {/* Icon + Action */}
      <div style={styles.eventRight}>
        {IconComponent && <IconComponent size={isMobile ? 14 : 16} color={config.color} />}
        {actionLabel && (
          <button onClick={() => onOpenModal(event)} style={{ ...styles.actionBtn, fontSize: isMobile ? '11px' : '12px' }}>
            {actionLabel} →
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '21px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    margin: 0,
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent-success)',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-success)',
    boxShadow: '0 0 8px var(--accent-success)',
    animation: 'pulse 2s infinite',
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '16px',
    flexWrap: 'nowrap' as const,
    paddingBottom: '4px',
  },
  filterChip: {
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  filterChipActive: {
    background: 'var(--accent-primary-dim)',
    borderColor: 'var(--accent-primary)',
    color: 'var(--accent-primary)',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  daySeparator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0 6px',
  },
  daySeparatorLine: {
    flex: 1,
    height: '1px',
    background: 'var(--glass-border)',
  },
  daySeparatorText: {
    color: 'var(--text-tertiary)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap' as const,
  },
  eventCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s',
    cursor: 'default',
    position: 'relative' as const,
  },
  colorBar: {
    width: '3px',
    height: '32px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'var(--font-display)',
    flexShrink: 0,
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '8px',
  },
  eventTitle: {
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  eventTime: {
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono, JetBrains Mono)',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  eventDetail: {
    color: 'var(--text-secondary)',
    marginTop: '2px',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  eventRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    padding: '2px 0',
    whiteSpace: 'nowrap' as const,
    transition: 'opacity 0.15s',
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: 'var(--text-secondary)',
  },
  showMoreBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px 0',
    marginTop: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--accent-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
  },
};
