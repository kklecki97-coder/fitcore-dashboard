import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  Flame,
  Dumbbell,
  Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import GlassCard from './GlassCard';
import { revenueData } from '../data';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, Message, WorkoutProgram } from '../types';

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

interface OverviewPageProps {
  clients: Client[];
  messages: Message[];
  programs: WorkoutProgram[];
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages') => void;
}

export default function OverviewPage({ clients, messages, programs, onViewClient, onNavigate }: OverviewPageProps) {
  const isMobile = useIsMobile();
  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingClients = clients.filter(c => c.status === 'pending').length;
  const totalRevenue = clients.filter(c => c.status !== 'paused').reduce((sum, c) => sum + c.monthlyRate, 0);
  const unreadMessages = messages.filter(m => !m.isRead && !m.isFromCoach);

  // Compute revenue change from last two months
  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const revenueChange = prevMonth ? Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;

  // At-risk: paused, streak dropped to 0, or progress below 30%
  const atRiskClients = clients.filter(c =>
    c.status === 'paused' || c.streak === 0 || c.progress < 30
  );

  // Pending check-ins: next check-in is today or overdue (not "—")
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pendingCheckIns = clients.filter(c => {
    if (c.nextCheckIn === '—') return false;
    const checkInDate = new Date(c.nextCheckIn);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate <= today;
  });


  // Daily quote — rotate by day of year
  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  // AI Summary — smart aggregation from real data
  const insights = useMemo(() => {
    const items: { icon: React.ElementType; text: string; color: string }[] = [];

    // Active clients this week
    const active = clients.filter(c => c.status === 'active');
    items.push({
      icon: Users,
      text: `${active.length}/${clients.length} clients active this week`,
      color: 'var(--accent-primary)',
    });

    // Best streak
    const topStreak = [...clients].sort((a, b) => b.streak - a.streak)[0];
    if (topStreak && topStreak.streak > 0) {
      items.push({
        icon: Flame,
        text: `${topStreak.name}'s ${topStreak.streak}-day streak — longest active`,
        color: 'var(--accent-warm)',
      });
    }

    // PR / top progress
    const topProgress = [...clients].sort((a, b) => b.progress - a.progress)[0];
    if (topProgress) {
      const latestBench = topProgress.metrics.benchPress[topProgress.metrics.benchPress.length - 1];
      items.push({
        icon: TrendingUp,
        text: `${topProgress.name} leading at ${topProgress.progress}% progress (Bench: ${latestBench}kg)`,
        color: 'var(--accent-success)',
      });
    }

    // Overdue check-ins
    if (pendingCheckIns.length > 0) {
      const names = pendingCheckIns.slice(0, 3).map(c => c.name.split(' ')[0]);
      items.push({
        icon: Clock,
        text: `${pendingCheckIns.length} check-in${pendingCheckIns.length > 1 ? 's' : ''} overdue (${names.join(', ')})`,
        color: 'var(--accent-danger)',
      });
    }

    // Unread messages
    if (unreadMessages.length > 0) {
      items.push({
        icon: MessageSquare,
        text: `${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''} waiting`,
        color: 'var(--accent-secondary)',
      });
    }

    // Revenue trend
    const revChange = prevMonth ? ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
    items.push({
      icon: DollarSign,
      text: revChange >= 0
        ? `Revenue up ${Math.round(revChange)}% vs last month`
        : `Revenue down ${Math.abs(Math.round(revChange))}% vs last month`,
      color: revChange >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
    });

    // Active programs
    const activePrograms = programs.filter(p => p.status === 'active' && !p.isTemplate);
    if (activePrograms.length > 0) {
      items.push({
        icon: Dumbbell,
        text: `${activePrograms.length} active program${activePrograms.length > 1 ? 's' : ''} running`,
        color: 'var(--accent-primary)',
      });
    }

    return items;
  }, [clients, pendingCheckIns, unreadMessages, programs, lastMonth, prevMonth]);

  const statCards = [
    {
      label: 'Active Clients',
      value: activeClients.toString(),
      change: pendingClients > 0 ? `${pendingClients} pending` : 'Stable',
      trend: pendingClients > 0 ? 'neutral' as const : 'up' as const,
      icon: Users,
      color: 'var(--accent-primary)',
      dimColor: 'var(--accent-primary-dim)',
    },
    {
      label: 'Monthly Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: revenueChange >= 0 ? `+${revenueChange}%` : `${revenueChange}%`,
      trend: revenueChange >= 0 ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'var(--accent-success)',
      dimColor: 'var(--accent-success-dim)',
    },
    {
      label: 'At-Risk Clients',
      value: atRiskClients.length.toString(),
      change: atRiskClients.length > 0 ? 'Needs attention' : 'All good',
      trend: atRiskClients.length > 0 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: atRiskClients.length > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
      dimColor: atRiskClients.length > 0 ? 'var(--accent-danger-dim)' : 'var(--accent-success-dim)',
    },
    {
      label: 'Pending Check-ins',
      value: pendingCheckIns.length.toString(),
      change: pendingCheckIns.length > 0 ? 'Due today' : 'All caught up',
      trend: 'neutral' as const,
      icon: CalendarCheck,
      color: 'var(--accent-warm)',
      dimColor: 'var(--accent-warm-dim)',
    },
  ];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Daily Motivation — Top of Page */}
      <motion.div
        style={styles.quoteBar}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={styles.quoteText}>"{dailyQuote.text}"</div>
        <div style={styles.quoteAuthor}>— {dailyQuote.author}</div>
      </motion.div>

      {/* Stat Cards Row */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '16px' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} delay={i * 0.05} hover>
              <div style={styles.statTop}>
                <div style={{ ...styles.statIcon, background: stat.dimColor }}>
                  <Icon size={18} color={stat.color} />
                </div>
                {stat.trend !== 'neutral' && (
                  <div style={{
                    ...styles.changeBadge,
                    color: stat.trend === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)',
                    background: stat.trend === 'up' ? 'var(--accent-success-dim)' : 'var(--accent-danger-dim)',
                  }}>
                    {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div style={{ ...styles.statValue, fontSize: isMobile ? '22px' : '28px' }}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </GlassCard>
          );
        })}
      </div>

      {/* Dashboard Summary */}
      <GlassCard delay={0.15}>
        <div style={styles.cardHeader}>
          <div style={styles.insightTitleRow}>
            <Sparkles size={15} color="var(--accent-primary)" />
            <h3 style={styles.cardTitle}>Dashboard Summary</h3>
          </div>
        </div>
        <div style={{ ...styles.insightList, ...(isMobile ? {} : { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 24px' }) }}>
          {insights.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                style={styles.insightRow}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
              >
                <div style={{ ...styles.insightIcon, background: `${item.color}15` }}>
                  <Icon size={14} color={item.color} />
                </div>
                <span style={styles.insightText}>{item.text}</span>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Revenue Chart */}
      <GlassCard delay={0.2}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Revenue Overview</h3>
            <p style={styles.cardSubtitle}>Monthly recurring revenue</p>
          </div>
          <div style={styles.legendRow}>
            <span style={getLegendDotStyle('#00e5c8')} />
            <span style={styles.legendText}>Revenue</span>
          </div>
        </div>
        <div style={{ height: isMobile ? 180 : 220, marginTop: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5c8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00e5c8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'Outfit' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: '#151a28',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  fontSize: '18px',
                  fontFamily: 'Outfit',
                }}
                labelStyle={{ color: '#8b92a5' }}
                itemStyle={{ color: '#00e5c8' }}
                formatter={(value) => [`$${value}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#00e5c8"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={{ fill: '#00e5c8', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#07090e' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Bottom Row */}
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
        {/* At-Risk Clients */}
        <GlassCard delay={0.3}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>At-Risk Clients</h3>
              <p style={styles.cardSubtitle}>
                {atRiskClients.length > 0
                  ? `${atRiskClients.length} client${atRiskClients.length > 1 ? 's' : ''} need${atRiskClients.length === 1 ? 's' : ''} attention`
                  : 'All clients on track'}
              </p>
            </div>
            <AlertTriangle size={16} color={atRiskClients.length > 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)'} />
          </div>
          <div style={styles.riskList}>
            {atRiskClients.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>No at-risk clients right now</span>
              </div>
            ) : (
              atRiskClients.map((client, i) => {
                const reasons: string[] = [];
                if (client.status === 'paused') reasons.push('Paused');
                if (client.streak === 0) reasons.push('No streak');
                if (client.progress < 30) reasons.push(`${client.progress}% progress`);
                return (
                  <motion.div
                    key={client.id}
                    style={styles.riskItem}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    onClick={() => onViewClient(client.id)}
                  >
                    <div style={{ ...styles.avatar, background: getAvatarColor(client.id) }}>
                      {getInitials(client.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>{client.name}</div>
                      <div style={styles.riskReasons}>
                        {reasons.map((r, j) => (
                          <span key={j} style={styles.riskTag}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '17px', color: 'var(--text-tertiary)' }}>
                      {client.lastActive}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* Top Performers */}
        <GlassCard delay={0.35}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Top Performers</h3>
              <p style={styles.cardSubtitle}>Highest progress this month</p>
            </div>
            <TrendingUp size={16} color="var(--text-tertiary)" />
          </div>
          <div style={styles.clientList}>
            {[...clients]
              .sort((a, b) => b.progress - a.progress)
              .slice(0, 5)
              .map((client: Client, i: number) => (
                <motion.div
                  key={client.id}
                  style={styles.clientRow}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  onClick={() => onViewClient(client.id)}
                >
                  <div style={{ ...styles.rank, color: i === 0 ? 'var(--accent-warm)' : 'var(--text-tertiary)' }}>
                    #{i + 1}
                  </div>
                  <div style={{ ...styles.avatar, background: getAvatarColor(client.id) }}>
                    {getInitials(client.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>{client.name}</div>
                    <div style={{ fontSize: '17px', color: 'var(--text-secondary)' }}>{client.plan}</div>
                  </div>
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                      <motion.div
                        style={{
                          ...styles.progressFill,
                          background: client.progress > 80 ? 'var(--accent-success)' : client.progress > 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${client.progress}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span style={styles.progressText}>{client.progress}%</span>
                  </div>
                </motion.div>
              ))}
          </div>
        </GlassCard>

        {/* Recent Messages */}
        <GlassCard delay={0.4} style={{ gridColumn: '1 / -1' }}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Recent Messages</h3>
              <p style={styles.cardSubtitle}>{unreadMessages.length} unread</p>
            </div>
            <button onClick={() => onNavigate('messages')} style={styles.viewAllBtn}>
              View all
            </button>
          </div>
          <div style={styles.messageList}>
            {messages
              .filter(m => !m.isFromCoach)
              .slice(0, 5)
              .map((msg, i) => (
                <motion.div
                  key={msg.id}
                  style={styles.messageItem}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  onClick={() => onNavigate('messages')}
                >
                  <div style={{ ...styles.avatar, background: getAvatarColor(msg.clientId), flexShrink: 0 }}>
                    {getInitials(msg.clientName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.msgHeader}>
                      <span style={{ fontSize: '18px', fontWeight: 500 }}>{msg.clientName}</span>
                      {!msg.isRead && <span style={styles.unreadDot} />}
                    </div>
                    <div style={styles.msgText}>{msg.text}</div>
                  </div>
                  <MessageSquare size={14} color="var(--accent-primary)" style={{ flexShrink: 0, cursor: 'pointer' }} />
                </motion.div>
              ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function getLegendDotStyle(color: string): React.CSSProperties {
  return {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
  };
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  statIcon: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '17px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '20px',
  },
  statValue: {
    fontSize: '39px',
    fontWeight: 700,
    letterSpacing: '-1px',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '21px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardSubtitle: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendText: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  riskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '16px',
  },
  riskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  riskReasons: {
    display: 'flex',
    gap: '4px',
    marginTop: '3px',
    flexWrap: 'wrap',
  },
  riskTag: {
    fontSize: '14px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '8px',
    background: 'var(--accent-danger-dim)',
    color: 'var(--accent-danger)',
    letterSpacing: '0.3px',
  },
  emptyState: {
    padding: '24px 0',
    textAlign: 'center',
  },
  clientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '16px',
  },
  clientRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  rank: {
    fontSize: '17px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    width: '24px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
    color: '#07090e',
    flexShrink: 0,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100px',
  },
  progressBar: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
  },
  progressText: {
    fontSize: '17px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    width: '32px',
    textAlign: 'right',
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '16px',
  },
  messageItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  msgHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  msgText: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
    lineHeight: 1.5,
  },
  unreadDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
  },
  viewAllBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '17px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.15s',
  },
  insightTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  insightList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  insightRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
  },
  insightIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightText: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  quoteBar: {
    textAlign: 'center',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
  },
  quoteText: {
    fontSize: '21px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: '17px',
    color: 'var(--text-tertiary)',
    marginTop: '6px',
    fontWeight: 500,
  },
};
