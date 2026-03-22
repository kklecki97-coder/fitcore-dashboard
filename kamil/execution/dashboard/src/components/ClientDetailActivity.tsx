import { motion } from 'framer-motion';
import {
  MessageSquare, FileText, Activity, Dumbbell, Edit3,
  ClipboardCheck, Clock,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getLocale } from '../lib/locale';
import { useLang } from '../i18n';
import type { Client } from '../types';

interface ClientDetailActivityProps {
  client: Client;
  isMobile: boolean;
}

export default function ClientDetailActivity({
  client,
  isMobile,
}: ClientDetailActivityProps) {
  const { lang, t } = useLang();
  const dateLocale = getLocale(lang);

  const activityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare size={14} color="var(--accent-primary)" />;
      case 'check-in': return <ClipboardCheck size={14} color="var(--accent-success)" />;
      case 'notes': return <FileText size={14} color="var(--accent-secondary)" />;
      case 'program': return <Dumbbell size={14} color="var(--accent-warm)" />;
      case 'plan': return <Edit3 size={14} color="var(--accent-primary)" />;
      default: return <Activity size={14} color="var(--text-tertiary)" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t.header.mAgo(mins);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t.header.hAgo(hrs);
    const days = Math.floor(hrs / 24);
    if (days < 7) return t.header.dAgo(days);
    return date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  };

  if (!client.activityLog || client.activityLog.length === 0) return null;

  return (
    <GlassCard delay={0.28} style={isMobile ? { padding: '14px 16px' } : undefined}>
      <div style={styles.trainingSectionHeader}>
        <div>
          <h3 style={{ ...styles.chartTitle, ...(isMobile ? { fontSize: '15px' } : {}) }}>{t.clientDetail.activityLog}</h3>
          <p style={{ ...styles.trainingSubtitle, ...(isMobile ? { fontSize: '12px' } : {}) }}>{t.clientDetail.events(client.activityLog.length)}</p>
        </div>
      </div>
      <div style={styles.activityTimeline}>
        {client.activityLog
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8)
          .map((event, idx) => (
            <motion.div
              key={`${event.date}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              style={{ ...styles.activityItem, ...(isMobile ? { padding: '8px 10px', gap: '10px' } : {}) }}
            >
              <div style={{ ...styles.activityIcon, ...(isMobile ? { width: '28px', height: '28px', borderRadius: '6px' } : {}) }}>{activityIcon(event.type)}</div>
              <div style={styles.activityContent}>
                <span style={{ ...styles.activityDesc, ...(isMobile ? { fontSize: '12px' } : {}) }}>{event.description}</span>
                <span style={{ ...styles.activityTime, ...(isMobile ? { fontSize: '11px' } : {}) }}>
                  <Clock size={11} />
                  {timeAgo(event.date)}
                </span>
              </div>
            </motion.div>
          ))}
      </div>
    </GlassCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  chartTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  trainingSectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  trainingSubtitle: {
    fontSize: '17px',
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
  activityTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.1s',
    borderBottom: '1px solid var(--border-subtle)',
  },
  activityIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--bg-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: '8px',
    minWidth: 0,
  },
  activityDesc: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activityTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
