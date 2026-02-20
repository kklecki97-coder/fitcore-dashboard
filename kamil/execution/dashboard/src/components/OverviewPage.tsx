import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  TrendingUp,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import GlassCard from './GlassCard';
import { clients, revenueData, scheduleToday, messages, workoutLogs } from '../data';
import { getInitials, getAvatarColor } from '../data';
import type { Client } from '../types';

interface OverviewPageProps {
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages') => void;
}

export default function OverviewPage({ onViewClient, onNavigate }: OverviewPageProps) {
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalRevenue = clients.filter(c => c.status !== 'paused').reduce((sum, c) => sum + c.monthlyRate, 0);
  const avgProgress = Math.round(clients.reduce((sum, c) => sum + c.progress, 0) / clients.length);
  const todayWorkouts = workoutLogs.filter(w => w.completed).length;
  const totalWorkouts = workoutLogs.length;
  const unreadMessages = messages.filter(m => !m.isRead && !m.isFromCoach);

  const weeklyData = [
    { day: 'Mon', sessions: 6, completed: 5 },
    { day: 'Tue', sessions: 5, completed: 5 },
    { day: 'Wed', sessions: 7, completed: 6 },
    { day: 'Thu', sessions: 4, completed: 4 },
    { day: 'Fri', sessions: 6, completed: 5 },
    { day: 'Sat', sessions: 3, completed: 3 },
    { day: 'Sun', sessions: 1, completed: 1 },
  ];

  const statCards = [
    {
      label: 'Active Clients',
      value: activeClients.toString(),
      change: '+2',
      trend: 'up' as const,
      icon: Users,
      color: 'var(--accent-primary)',
      dimColor: 'var(--accent-primary-dim)',
    },
    {
      label: 'Monthly Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: '+12%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'var(--accent-success)',
      dimColor: 'var(--accent-success-dim)',
    },
    {
      label: 'Avg. Progress',
      value: `${avgProgress}%`,
      change: '+5%',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'var(--accent-secondary)',
      dimColor: 'var(--accent-secondary-dim)',
    },
    {
      label: 'Today\'s Sessions',
      value: `${todayWorkouts}/${totalWorkouts}`,
      change: `${todayWorkouts} done`,
      trend: 'neutral' as const,
      icon: Flame,
      color: 'var(--accent-warm)',
      dimColor: 'var(--accent-warm-dim)',
    },
  ];

  return (
    <div style={styles.page}>
      {/* Stat Cards Row */}
      <div style={styles.statsGrid}>
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
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </GlassCard>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div style={styles.mainGrid}>
        {/* Revenue Chart */}
        <GlassCard delay={0.2} style={{ gridColumn: 'span 2' }}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Revenue Overview</h3>
              <p style={styles.cardSubtitle}>Monthly recurring revenue</p>
            </div>
            <div style={styles.legendRow}>
              <span style={styles.legendDot('#00e5c8')} />
              <span style={styles.legendText}>Revenue</span>
            </div>
          </div>
          <div style={{ height: 220, marginTop: '16px' }}>
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
                  tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'Outfit' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#151a28',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    fontSize: '13px',
                    fontFamily: 'Outfit',
                  }}
                  labelStyle={{ color: '#8b92a5' }}
                  itemStyle={{ color: '#00e5c8' }}
                  formatter={(value: number) => [`$${value}`, 'Revenue']}
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

        {/* Weekly Sessions */}
        <GlassCard delay={0.25}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Weekly Sessions</h3>
              <p style={styles.cardSubtitle}>Completion rate this week</p>
            </div>
          </div>
          <div style={{ height: 220, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={4}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'Outfit' }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#151a28',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    fontSize: '13px',
                    fontFamily: 'Outfit',
                  }}
                  labelStyle={{ color: '#8b92a5' }}
                />
                <Bar dataKey="sessions" fill="rgba(99, 102, 241, 0.3)" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#6366f1" radius={[6, 6, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div style={styles.bottomGrid}>
        {/* Today's Schedule */}
        <GlassCard delay={0.3}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Today's Schedule</h3>
              <p style={styles.cardSubtitle}>{scheduleToday.length} sessions planned</p>
            </div>
            <Clock size={16} color="var(--text-tertiary)" />
          </div>
          <div style={styles.scheduleList}>
            {scheduleToday.map((s, i) => (
              <motion.div
                key={i}
                style={{
                  ...styles.scheduleItem,
                  opacity: s.status === 'completed' ? 0.5 : 1,
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: s.status === 'completed' ? 0.5 : 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
              >
                <div style={styles.scheduleTime}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{s.time}</span>
                </div>
                <div style={styles.scheduleDot(s.status)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{s.client}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.type}</div>
                </div>
                {s.status === 'completed' && <CheckCircle2 size={16} color="var(--accent-success)" />}
                {s.status === 'current' && (
                  <span style={styles.liveBadge}>
                    <span style={styles.liveDot} />
                    LIVE
                  </span>
                )}
                {s.status === 'upcoming' && <Circle size={16} color="var(--text-tertiary)" />}
              </motion.div>
            ))}
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
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{client.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{client.plan}</div>
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
        <GlassCard delay={0.4}>
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
                >
                  <div style={{ ...styles.avatar, background: getAvatarColor(msg.clientId), flexShrink: 0 }}>
                    {getInitials(msg.clientName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.msgHeader}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{msg.clientName}</span>
                      {!msg.isRead && <span style={styles.unreadDot} />}
                    </div>
                    <div style={styles.msgText}>{msg.text}</div>
                  </div>
                  <MessageSquare size={14} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                </motion.div>
              ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties | ((...args: any[]) => React.CSSProperties)> = {
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
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '20px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-1px',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '16px',
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
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardSubtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: (color: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
  }),
  legendText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '16px',
  },
  scheduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s',
    cursor: 'default',
  },
  scheduleTime: {
    width: '48px',
    color: 'var(--text-secondary)',
  },
  scheduleDot: (status: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: status === 'completed' ? 'var(--accent-success)' :
                status === 'current' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
    boxShadow: status === 'current' ? '0 0 8px var(--accent-primary)' : 'none',
    flexShrink: 0,
  }),
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    padding: '3px 8px',
    borderRadius: '20px',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    animation: 'pulse 2s ease-in-out infinite',
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
    fontSize: '12px',
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
    fontSize: '11px',
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
    fontSize: '12px',
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
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.15s',
  },
};
