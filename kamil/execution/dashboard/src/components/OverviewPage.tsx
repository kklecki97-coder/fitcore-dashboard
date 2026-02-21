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
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import GlassCard from './GlassCard';
import { clients, revenueData, messages } from '../data';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client } from '../types';

interface OverviewPageProps {
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages') => void;
}

export default function OverviewPage({ onViewClient, onNavigate }: OverviewPageProps) {
  const isMobile = useIsMobile();
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalRevenue = clients.filter(c => c.status !== 'paused').reduce((sum, c) => sum + c.monthlyRate, 0);
  const unreadMessages = messages.filter(m => !m.isRead && !m.isFromCoach);

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
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
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
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No at-risk clients right now</span>
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
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{client.name}</div>
                      <div style={styles.riskReasons}>
                        {reasons.map((r, j) => (
                          <span key={j} style={styles.riskTag}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
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
  legendText: {
    fontSize: '12px',
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
    fontSize: '10px',
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
