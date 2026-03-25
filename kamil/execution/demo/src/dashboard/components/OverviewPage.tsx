import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CalendarCheck,
  Sparkles,
  Zap,
  Bell,
  FileBarChart,
  ChevronDown,
  Send,
  RefreshCw,
  Dumbbell,
  MessageSquare,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor, revenueData } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, Message, WorkoutProgram, CheckIn, Invoice, WorkoutLog } from '../types';

const QUOTES = [
  { text: 'The only bad workout is the one that didn\'t happen.', author: 'Unknown' },
  { text: 'Success isn\'t always about greatness. It\'s about consistency.', author: 'Dwayne Johnson' },
  { text: 'Take care of your body. It\'s the only place you have to live.', author: 'Jim Rohn' },
  { text: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Arnold Schwarzenegger' },
  { text: 'Your body can stand almost anything. It\'s your mind that you have to convince.', author: 'Unknown' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'The resistance that you fight physically in the gym strengthens you.', author: 'Arnold Schwarzenegger' },
  { text: 'Don\'t count the days. Make the days count.', author: 'Muhammad Ali' },
  { text: 'What seems impossible today will one day become your warm-up.', author: 'Unknown' },
  { text: 'The best project you\'ll ever work on is you.', author: 'Sonny Franco' },
];

type ActivityFilter = 'all' | 'workouts' | 'check-ins' | 'messages' | 'payments';

interface OverviewPageProps {
  clients: Client[];
  messages: Message[];
  programs: WorkoutProgram[];
  checkIns: CheckIn[];
  invoices: Invoice[];
  workoutLogs: WorkoutLog[];
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages' | 'clients' | 'check-ins') => void;
}

function getTimeGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 18) return `Good afternoon, ${name}`;
  if (hour >= 18 && hour < 22) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

// ── Smart Coach insight types ──
interface SmartCoachInsight {
  id: string;
  clientId: string;
  clientName: string;
  text: string;
  urgency: 'urgent' | 'warning' | 'info';
  action: string;
  draftMessage?: string;
}

// ── Activity Feed item ──
interface ActivityItem {
  id: string;
  clientId: string;
  clientName: string;
  type: 'workout' | 'check-in' | 'message' | 'payment';
  description: string;
  meta?: string;
  timestamp: string;
  actionLabel: string;
  color: string;
}

export default function OverviewPage({ clients, messages, programs, checkIns, invoices, workoutLogs, onViewClient, onNavigate }: OverviewPageProps) {
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);
  const [smartCoachExpanded, setSmartCoachExpanded] = useState(true);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [showMoreActivity, setShowMoreActivity] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingClients = clients.filter(c => c.status === 'pending').length;
  const totalRevenue = clients.filter(c => c.status !== 'paused').reduce((sum, c) => sum + c.monthlyRate, 0);

  // Revenue change
  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const revenueChange = prevMonth ? Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;

  // At-risk clients
  const atRiskClients = clients.filter(c =>
    c.status === 'paused' || c.streak === 0 || c.progress < 30
  );

  // Pending check-ins
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pendingCheckInsList = checkIns.filter(ci => ci.reviewStatus === 'pending');

  // Daily quote
  const dailyQuote = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [new Date().toDateString()]);

  // Greeting
  const greeting = getTimeGreeting('Coach');
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Smart Coach Insights ──
  const smartCoachInsights = useMemo<SmartCoachInsight[]>(() => {
    const insights: SmartCoachInsight[] = [];

    // Check for clients with no recent activity (streak = 0)
    clients.forEach(c => {
      if (c.streak === 0 && c.status === 'active') {
        insights.push({
          id: `inactive-${c.id}`,
          clientId: c.id,
          clientName: c.name,
          text: `${c.name} - hasn't logged anything in 3 days`,
          urgency: 'urgent',
          action: 'Send motivational message',
          draftMessage: `Hey ${c.name.split(' ')[0]}! I noticed you've been quiet lately. Everything okay? Remember, consistency beats perfection. Let's get back on track this week!`,
        });
      }
    });

    // Unreviewed check-ins
    checkIns.filter(ci => ci.reviewStatus === 'pending' && ci.status === 'completed').forEach(ci => {
      insights.push({
        id: `checkin-${ci.id}`,
        clientId: ci.clientId,
        clientName: ci.clientName,
        text: `${ci.clientName} - check-in from ${new Date(ci.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} is unreviewed`,
        urgency: 'warning',
        action: 'Review',
      });
    });

    // Overdue invoices
    invoices.filter(inv => inv.status === 'overdue').forEach(inv => {
      insights.push({
        id: `invoice-${inv.id}`,
        clientId: inv.clientId,
        clientName: inv.clientName,
        text: `${inv.clientName} - payment of $${inv.amount} is overdue`,
        urgency: 'urgent',
        action: 'Send reminder',
        draftMessage: `Hi ${inv.clientName.split(' ')[0]}, just a friendly reminder that your invoice for $${inv.amount} is past due. Please let me know if you have any questions!`,
      });
    });

    // Clients with low progress
    clients.filter(c => c.progress < 30 && c.status === 'active').forEach(c => {
      insights.push({
        id: `lowprog-${c.id}`,
        clientId: c.id,
        clientName: c.name,
        text: `${c.name} - progress at ${c.progress}%, may need program adjustment`,
        urgency: 'warning',
        action: 'Review program',
      });
    });

    // Unread messages
    const unreadByClient = new Map<string, number>();
    messages.filter(m => !m.isRead && !m.isFromCoach).forEach(m => {
      unreadByClient.set(m.clientId, (unreadByClient.get(m.clientId) || 0) + 1);
    });
    unreadByClient.forEach((count, clientId) => {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        insights.push({
          id: `unread-${clientId}`,
          clientId,
          clientName: client.name,
          text: `${client.name} - ${count} unread message${count > 1 ? 's' : ''} waiting`,
          urgency: 'info',
          action: 'Reply',
        });
      }
    });

    return insights;
  }, [clients, checkIns, invoices, messages]);

  const urgentCount = smartCoachInsights.filter(i => i.urgency === 'urgent').length;
  const warningCount = smartCoachInsights.filter(i => i.urgency === 'warning').length;
  const draftsCount = smartCoachInsights.filter(i => i.draftMessage).length;

  const visibleInsights = showAllInsights ? smartCoachInsights : smartCoachInsights.slice(0, 4);

  // ── Activity Feed ──
  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Workout logs
    workoutLogs.forEach(log => {
      items.push({
        id: `wl-${log.id}`,
        clientId: log.clientId,
        clientName: log.clientName,
        type: 'workout',
        description: `completed ${log.type} workout (${log.duration}min)`,
        timestamp: log.date + 'T14:00:00',
        actionLabel: 'View',
        color: 'var(--accent-primary)',
      });
    });

    // Check-ins
    checkIns.filter(ci => ci.status === 'completed').forEach(ci => {
      const metaParts: string[] = [];
      if (ci.mood) metaParts.push(`Mood: ${ci.mood}/5`);
      if (ci.energy) metaParts.push(`Energy: ${ci.energy}/10`);
      if (ci.weight) metaParts.push(`Weight: ${ci.weight}kg`);
      items.push({
        id: `ci-${ci.id}`,
        clientId: ci.clientId,
        clientName: ci.clientName,
        type: 'check-in',
        description: 'submitted check-in',
        meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
        timestamp: ci.date + 'T10:00:00',
        actionLabel: 'Review',
        color: 'var(--accent-warm)',
      });
    });

    // Messages (from clients only)
    messages.filter(m => !m.isFromCoach).forEach(msg => {
      items.push({
        id: `msg-${msg.id}`,
        clientId: msg.clientId,
        clientName: msg.clientName,
        type: 'message',
        description: msg.text.length > 60 ? msg.text.slice(0, 60) + '...' : msg.text,
        timestamp: msg.timestamp,
        actionLabel: 'Reply',
        color: 'var(--accent-secondary)',
      });
    });

    // Payments
    invoices.filter(inv => inv.status === 'paid' && inv.paidDate).forEach(inv => {
      items.push({
        id: `pay-${inv.id}`,
        clientId: inv.clientId,
        clientName: inv.clientName,
        type: 'payment',
        description: `paid $${inv.amount} - ${inv.plan} plan`,
        timestamp: inv.paidDate! + 'T12:00:00',
        actionLabel: 'View',
        color: 'var(--accent-success)',
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  }, [workoutLogs, checkIns, messages, invoices]);

  const filteredActivity = activityFilter === 'all'
    ? activityItems
    : activityItems.filter(item => {
        if (activityFilter === 'workouts') return item.type === 'workout';
        if (activityFilter === 'check-ins') return item.type === 'check-in';
        if (activityFilter === 'messages') return item.type === 'message';
        if (activityFilter === 'payments') return item.type === 'payment';
        return true;
      });

  const visibleActivity = showMoreActivity ? filteredActivity : filteredActivity.slice(0, 8);
  const remainingActivity = filteredActivity.length - visibleActivity.length;

  // Group activity by date
  const groupedActivity = useMemo(() => {
    const groups: { label: string; items: ActivityItem[] }[] = [];
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateLabels = new Map<string, string>();

    visibleActivity.forEach(item => {
      const itemDate = new Date(item.timestamp);
      const dateKey = itemDate.toDateString();

      if (!dateLabels.has(dateKey)) {
        if (itemDate.toDateString() === now.toDateString()) {
          dateLabels.set(dateKey, 'TODAY');
        } else if (itemDate.toDateString() === yesterday.toDateString()) {
          dateLabels.set(dateKey, 'YESTERDAY');
        } else {
          dateLabels.set(dateKey, itemDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase());
        }
      }
    });

    dateLabels.forEach((label, dateKey) => {
      const items = visibleActivity.filter(i => new Date(i.timestamp).toDateString() === dateKey);
      if (items.length > 0) {
        groups.push({ label, items });
      }
    });

    return groups;
  }, [visibleActivity]);

  // Activity type icon
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'workout': return Dumbbell;
      case 'check-in': return CheckCircle2;
      case 'message': return MessageSquare;
      case 'payment': return CreditCard;
    }
  };

  const statCards = [
    {
      label: 'Active Clients',
      value: activeClients,
      change: pendingClients > 0 ? `${pendingClients} pending` : 'Stable',
      trend: pendingClients > 0 ? 'neutral' as const : 'up' as const,
      icon: Users,
      color: 'var(--accent-primary)',
      dimColor: 'var(--accent-primary-dim)',
    },
    {
      label: 'Monthly Revenue',
      value: totalRevenue,
      format: (n: number) => `$${n.toLocaleString()}`,
      change: revenueChange >= 0 ? `+${revenueChange}%` : `${revenueChange}%`,
      trend: revenueChange >= 0 ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'var(--accent-success)',
      dimColor: 'var(--accent-success-dim)',
    },
    {
      label: 'At-Risk Clients',
      value: atRiskClients.length,
      change: atRiskClients.length > 0 ? 'Needs attention' : 'All good',
      trend: atRiskClients.length > 0 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: atRiskClients.length > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
      dimColor: atRiskClients.length > 0 ? 'var(--accent-danger-dim)' : 'var(--accent-success-dim)',
    },
    {
      label: 'Pending Check-ins',
      value: pendingCheckInsList.length,
      change: pendingCheckInsList.length > 0 ? 'Due today' : 'All caught up',
      trend: 'neutral' as const,
      icon: CalendarCheck,
      color: 'var(--accent-warm)',
      dimColor: 'var(--accent-warm-dim)',
    },
  ];

  // ── Loading skeleton ──
  if (!ready) {
    return (
      <div style={{ ...styles.page, padding: isMobile ? '16px' : '32px 40px' }}>
        <div style={{ ...styles.quoteBar, padding: '24px 20px' }}>
          <div style={skeletonStyles.line200} />
          <div style={{ ...skeletonStyles.line100, marginTop: '8px' }} />
        </div>
        <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '16px' }}>
          {[0, 1, 2, 3].map(i => (
            <GlassCard key={i} delay={0}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={skeletonStyles.circle40} />
                <div style={skeletonStyles.badge} />
              </div>
              <div style={skeletonStyles.line120} />
              <div style={{ ...skeletonStyles.line80, marginTop: '8px' }} />
            </GlassCard>
          ))}
        </div>
        <GlassCard delay={0}>
          <div style={skeletonStyles.line140} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={skeletonStyles.circle28} />
                <div style={{ ...skeletonStyles.lineFull, flex: 1 }} />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '32px 40px', gap: isMobile ? '14px' : '24px' }}>

      {/* ── Greeting + Weekly Report ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <motion.div
          style={styles.greetingSection}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 style={{ ...styles.greetingText, fontSize: isMobile ? '22px' : '32px' }}>{greeting}</h1>
          <p style={{ ...styles.greetingDate, fontSize: isMobile ? '14px' : '15px' }}>{todayFormatted}</p>
        </motion.div>
        <motion.button
          onClick={() => setReportOpen(!reportOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: isMobile ? '8px 12px' : '10px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)',
            cursor: 'pointer', flexShrink: 0, marginTop: '4px',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          whileHover={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } as Record<string, string>}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <FileBarChart size={15} />
          {!isMobile && 'Weekly Report'}
        </motion.button>
      </div>

      {/* ── Daily Motivation ── */}
      <motion.div
        style={{ ...styles.quoteBar, ...(isMobile ? { padding: '8px 14px' } : { padding: '14px 28px' }) }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <span style={{ ...styles.quoteText, ...(isMobile ? { fontSize: '12px' } : { fontSize: '15px' }) }}>"{dailyQuote.text}"</span>
        <span style={{ ...styles.quoteAuthor, ...(isMobile ? { fontSize: '11px' } : { fontSize: '13px' }) }}> - {dailyQuote.author}</span>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '18px' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const displayValue = stat.format ? stat.format(stat.value) : stat.value.toString();
          return (
            <GlassCard key={stat.label} delay={i * 0.05} hover style={isMobile ? { padding: '14px 16px' } : { padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px' }}>
                <div style={{
                  ...styles.statIcon,
                  background: stat.dimColor,
                  boxShadow: `0 0 12px ${stat.dimColor}`,
                  width: isMobile ? '36px' : '38px',
                  height: isMobile ? '36px' : '38px',
                  borderRadius: '10px',
                  flexShrink: 0,
                }}>
                  <Icon size={isMobile ? 16 : 17} color={stat.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: isMobile ? '20px' : '20px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                      {displayValue}
                    </span>
                    {stat.trend !== 'neutral' && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: stat.trend === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1px',
                      }}>
                        {stat.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {stat.change}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: isMobile ? '12px' : '12px', color: 'var(--text-tertiary)', marginTop: '3px', lineHeight: 1.2 }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Smart Coach Widget ── */}
      <GlassCard delay={0.1} style={isMobile ? { padding: '16px' } : { padding: '24px 28px' }}>
        {/* Header */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setSmartCoachExpanded(!smartCoachExpanded)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(0,229,200,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={16} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Smart Coach
            </h3>
            {urgentCount > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                background: 'var(--accent-danger-dim)', color: 'var(--accent-danger)',
              }}>
                {urgentCount} urgent
              </span>
            )}
            {warningCount > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                background: 'var(--accent-warm-dim)', color: 'var(--accent-warm)',
              }}>
                {warningCount} this week
              </span>
            )}
          </div>
          <ChevronDown
            size={18}
            color="var(--text-tertiary)"
            style={{
              transform: smartCoachExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>

        <AnimatePresence>
          {smartCoachExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Drafts bar */}
              {draftsCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', marginTop: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,229,200,0.06)',
                  border: '1px solid rgba(0,229,200,0.12)',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {draftsCount} message{draftsCount > 1 ? 's' : ''} ready
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 14px', borderRadius: '8px',
                      background: 'var(--accent-primary)', border: 'none',
                      color: 'var(--text-on-accent)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-display)',
                    }}>
                      <Send size={11} /> Send All ({draftsCount})
                    </button>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'var(--font-display)',
                    }}>
                      <RefreshCw size={11} /> Regenerate
                    </button>
                  </div>
                </div>
              )}

              {/* Insight list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '14px' }}>
                {visibleInsights.map((insight, i) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${
                        insight.urgency === 'urgent' ? 'var(--accent-danger)' :
                        insight.urgency === 'warning' ? 'var(--accent-warm)' :
                        'var(--accent-primary)'
                      }`,
                    }}
                    onClick={() => onViewClient(insight.clientId)}
                  >
                    {/* Urgency dot */}
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: insight.urgency === 'urgent' ? 'var(--accent-danger)' :
                        insight.urgency === 'warning' ? 'var(--accent-warm)' : 'var(--accent-primary)',
                      boxShadow: insight.urgency === 'urgent' ? '0 0 8px var(--accent-danger-dim)' : 'none',
                    }} />

                    {/* Client avatar */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: getAvatarColor(insight.clientId),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: 'var(--text-on-accent)', flexShrink: 0,
                    }}>
                      {getInitials(insight.clientName)}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {insight.text}
                      </span>
                    </div>

                    {/* Action */}
                    <span style={{
                      fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {insight.action} &rarr;
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Show all */}
              {smartCoachInsights.length > 4 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAllInsights(!showAllInsights); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: '100%', padding: '10px 0', marginTop: '8px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {showAllInsights ? 'Show less' : `Show all ${smartCoachInsights.length}`}
                  <ChevronDown size={14} style={{
                    transform: showAllInsights ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* ── Dashboard Summary ── */}
      <GlassCard delay={0.15} style={isMobile ? { padding: '16px' } : { padding: '28px 32px' }}>
        <div style={styles.cardHeader}>
          <div style={styles.insightTitleRow}>
            <Sparkles size={isMobile ? 13 : 17} color="var(--accent-primary)" />
            <h3 style={{ ...styles.cardTitle, fontSize: isMobile ? '15px' : '18px' }}>Dashboard Summary</h3>
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            fontSize: isMobile ? '14px' : '15px', color: 'var(--text-primary)', lineHeight: 1.75,
            padding: isMobile ? '8px 10px' : '12px 4px', margin: 0, fontWeight: 400,
          }}
        >
          Your coaching business is looking solid this week. You have {activeClients} active clients generating ${totalRevenue.toLocaleString()} in monthly revenue{revenueChange > 0 ? `, up ${revenueChange}% from last month` : ''}, with {programs.filter(p => p.status === 'active' && !p.isTemplate).length} active programs running. {atRiskClients.length > 0 ? `${atRiskClients.length} client${atRiskClients.length > 1 ? 's' : ''} need${atRiskClients.length === 1 ? 's' : ''} attention — ` + atRiskClients.slice(0, 2).map(c => c.name.split(' ')[0]).join(' and ') + (atRiskClients.length > 2 ? ` and ${atRiskClients.length - 2} more` : '') + ' may benefit from a check-in message.' : 'All clients are on track with no at-risk flags.'} {pendingCheckInsList.length > 0 ? `You have ${pendingCheckInsList.length} pending check-in${pendingCheckInsList.length > 1 ? 's' : ''} to review today.` : 'All check-ins are reviewed and up to date.'} {clients.filter(c => c.streak >= 7).length > 0 ? `Notable streaks: ${clients.filter(c => c.streak >= 7).sort((a, b) => b.streak - a.streak).slice(0, 2).map(c => `${c.name.split(' ')[0]} (${c.streak} days)`).join(', ')}.` : ''} Keep the momentum going!
        </motion.p>
      </GlassCard>

      {/* ── Activity Feed ── */}
      <GlassCard delay={0.2} style={isMobile ? { padding: '16px' } : { padding: '28px 32px' }}>
        <div style={styles.cardHeader}>
          <div style={styles.insightTitleRow}>
            <Bell size={isMobile ? 13 : 17} color="var(--accent-primary)" />
            <h3 style={{ ...styles.cardTitle, fontSize: isMobile ? '15px' : '18px' }}>Activity Feed</h3>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginTop: '16px', flexWrap: 'wrap',
        }}>
          {(['all', 'workouts', 'check-ins', 'messages', 'payments'] as ActivityFilter[]).map(filter => (
            <button
              key={filter}
              onClick={() => { setActivityFilter(filter); setShowMoreActivity(false); }}
              style={{
                padding: '6px 14px', borderRadius: '20px',
                border: activityFilter === filter ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                background: activityFilter === filter ? 'var(--accent-primary-dim)' : 'transparent',
                color: activityFilter === filter ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Grouped items */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {groupedActivity.map((group) => (
            <div key={group.label}>
              {/* Date header */}
              <div style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)',
                letterSpacing: '0.5px', padding: '12px 0 6px', fontFamily: 'var(--font-display)',
              }}>
                {group.label}
              </div>

              {group.items.map((item, i) => {
                const Icon = getActivityIcon(item.type);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.02 }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${item.color}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => {
                      if (item.type === 'message') onNavigate('messages');
                      else if (item.type === 'check-in') onNavigate('check-ins');
                      else onViewClient(item.clientId);
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: getAvatarColor(item.clientId),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: 'var(--text-on-accent)', flexShrink: 0,
                    }}>
                      {getInitials(item.clientName)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        <span style={{ fontWeight: 600 }}>{item.clientName}</span>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{item.description}</span>
                      </div>
                      {item.meta && (
                        <div style={{
                          fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <Icon size={11} color={item.color} />
                          {item.meta}
                        </div>
                      )}
                    </div>

                    {/* Timestamp + action */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span style={{
                        fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {item.actionLabel} &rarr;
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}

          {filteredActivity.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              No activity to show
            </div>
          )}
        </div>

        {/* Show more */}
        {remainingActivity > 0 && !showMoreActivity && (
          <button
            onClick={() => setShowMoreActivity(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '12px 0', marginTop: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-display)',
            }}
          >
            Show more ({remainingActivity})
            <ChevronDown size={14} />
          </button>
        )}
      </GlassCard>

      {/* Weekly Report Modal (placeholder - just shows a simple overlay) */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                maxWidth: '480px',
                width: '90%',
                boxShadow: 'var(--shadow-elevated)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <FileBarChart size={20} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Weekly Report</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Active Clients</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{activeClients}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Revenue</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>${totalRevenue.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Check-ins Reviewed</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{checkIns.filter(ci => ci.reviewStatus === 'reviewed').length}/{checkIns.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Workouts Logged</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>{workoutLogs.filter(w => w.completed).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>At-Risk</span>
                  <span style={{ color: atRiskClients.length > 0 ? 'var(--accent-danger)' : 'var(--accent-success)', fontSize: '14px', fontWeight: 600 }}>
                    {atRiskClients.length > 0 ? `${atRiskClients.length} clients` : 'None'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                style={{
                  marginTop: '24px', width: '100%', padding: '10px',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)',
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  greetingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  greetingText: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
    margin: 0,
  },
  greetingDate: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-display)',
    margin: 0,
    textTransform: 'capitalize',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statIcon: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  insightTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quoteBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
  },
  quoteText: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
};

const shimmerBg: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite ease-in-out',
  borderRadius: '6px',
};

const skeletonStyles: Record<string, React.CSSProperties> = {
  line200: { ...shimmerBg, height: '18px', width: '60%', margin: '0 auto' },
  line140: { ...shimmerBg, height: '16px', width: '140px' },
  line120: { ...shimmerBg, height: '28px', width: '80px' },
  line100: { ...shimmerBg, height: '14px', width: '100px', margin: '0 auto' },
  line80: { ...shimmerBg, height: '14px', width: '100px' },
  lineFull: { ...shimmerBg, height: '14px', width: '100%' },
  circle40: { ...shimmerBg, width: '40px', height: '40px', borderRadius: 'var(--radius-md)' },
  circle28: { ...shimmerBg, width: '28px', height: '28px', borderRadius: '8px' },
  badge: { ...shimmerBg, width: '60px', height: '22px', borderRadius: '20px' },
};
