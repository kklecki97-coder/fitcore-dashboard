import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, ArrowUpRight,
  CreditCard, Target, Award,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import GlassCard from './GlassCard';
import { revenueData } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client } from '../types';

interface AnalyticsPageProps {
  clients: Client[];
}

export default function AnalyticsPage({ clients }: AnalyticsPageProps) {
  const isMobile = useIsMobile();
  const activePayingClients = clients.filter(c => c.status !== 'paused');
  const totalRevenue = activePayingClients.reduce((sum, c) => sum + c.monthlyRate, 0);
  const projectedAnnual = totalRevenue * 12;
  const avgClientValue = activePayingClients.length > 0 ? Math.round(totalRevenue / activePayingClients.length) : 0;

  // Calculate retention from actual client data
  const retentionRate = clients.length > 0
    ? Math.round((clients.filter(c => c.status === 'active').length / clients.length) * 1000) / 10
    : 100;

  // Compute revenue change
  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const revenueChangePercent = prevMonth ? Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;

  const planDistribution = [
    { name: 'Elite', value: clients.filter(c => c.plan === 'Elite').length, color: '#f59e0b' },
    { name: 'Premium', value: clients.filter(c => c.plan === 'Premium').length, color: '#6366f1' },
    { name: 'Basic', value: clients.filter(c => c.plan === 'Basic').length, color: '#525a6e' },
  ];

  const planRevenue = [
    { name: 'Elite', revenue: clients.filter(c => c.plan === 'Elite' && c.status !== 'paused').reduce((s, c) => s + c.monthlyRate, 0) },
    { name: 'Premium', revenue: clients.filter(c => c.plan === 'Premium').reduce((s, c) => s + c.monthlyRate, 0) },
    { name: 'Basic', revenue: clients.filter(c => c.plan === 'Basic').reduce((s, c) => s + c.monthlyRate, 0) },
  ];

  const retentionData = revenueData.map((rd) => {
    // Use per-month client count from revenueData vs total for a rough retention estimate
    return { month: rd.month, rate: clients.length > 0 ? Math.round((rd.clients / clients.length) * 1000) / 10 : 100 };
  });

  const progressDistribution = [
    { range: '0-25%', count: clients.filter(c => c.progress <= 25).length },
    { range: '26-50%', count: clients.filter(c => c.progress > 25 && c.progress <= 50).length },
    { range: '51-75%', count: clients.filter(c => c.progress > 50 && c.progress <= 75).length },
    { range: '76-100%', count: clients.filter(c => c.progress > 75).length },
  ];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Revenue Stats */}
      <div style={{ ...styles.statsRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        {[
          {
            label: 'Monthly Revenue',
            value: `$${totalRevenue.toLocaleString()}`,
            change: revenueChangePercent >= 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
            icon: DollarSign,
            color: 'var(--accent-success)',
            dim: 'var(--accent-success-dim)',
          },
          {
            label: 'Projected Annual',
            value: `$${projectedAnnual.toLocaleString()}`,
            change: revenueChangePercent >= 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
            icon: TrendingUp,
            color: 'var(--accent-primary)',
            dim: 'var(--accent-primary-dim)',
          },
          {
            label: 'Avg. Client Value',
            value: `$${avgClientValue}`,
            change: `${activePayingClients.length} clients`,
            icon: CreditCard,
            color: 'var(--accent-secondary)',
            dim: 'var(--accent-secondary-dim)',
          },
          {
            label: 'Retention Rate',
            value: `${retentionRate}%`,
            change: retentionRate >= 90 ? 'Excellent' : retentionRate >= 75 ? 'Good' : 'Needs focus',
            icon: Target,
            color: 'var(--accent-warm)',
            dim: 'var(--accent-warm-dim)',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} delay={i * 0.05} hover>
              <div style={styles.statTop}>
                <div style={{ ...styles.statIcon, background: stat.dim }}>
                  <Icon size={18} color={stat.color} />
                </div>
                <div style={{ ...styles.changeBadge, color: 'var(--accent-success)', background: 'var(--accent-success-dim)' }}>
                  <ArrowUpRight size={12} />
                  {stat.change}
                </div>
              </div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </GlassCard>
          );
        })}
      </div>

      {/* Revenue Over Time + Plan Distribution */}
      <div style={{ ...styles.chartRow, flexDirection: isMobile ? 'column' : 'row' }}>
        <GlassCard delay={0.2} style={{ flex: 2 }}>
          <h3 style={styles.chartTitle}>Revenue Over Time</h3>
          <div style={{ height: isMobile ? 220 : 280, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    fontSize: '13px',
                  }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#revenueGrad2)" dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.25} style={{ flex: 1 }}>
          <h3 style={styles.chartTitle}>Client Distribution</h3>
          <div style={{ height: isMobile ? 220 : 280, marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={85}
                  innerRadius={55}
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {planDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#8b92a5', fontSize: '12px', fontFamily: 'Outfit' }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', fontSize: '13px',
                  }}
                  formatter={(value, name) => [`${value} clients`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div style={{ ...styles.bottomRow, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Revenue by Plan */}
        <GlassCard delay={0.3}>
          <h3 style={styles.chartTitle}>Revenue by Plan</h3>
          <div style={{ height: 220, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planRevenue} layout="vertical">
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#8b92a5' }} width={70} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', fontSize: '13px',
                  }}
                  formatter={(value) => [`$${value}/mo`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={24}>
                  <Cell fill="#f59e0b" />
                  <Cell fill="#6366f1" />
                  <Cell fill="#525a6e" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Retention */}
        <GlassCard delay={0.35}>
          <h3 style={styles.chartTitle}>Client Retention</h3>
          <div style={{ height: 220, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData}>
                <defs>
                  <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5c8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00e5c8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e' }} />
                <YAxis domain={[70, 105]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', fontSize: '13px',
                  }}
                  formatter={(value) => [`${value}%`, 'Retention']}
                />
                <Area type="monotone" dataKey="rate" stroke="#00e5c8" strokeWidth={2} fill="url(#retentionGrad)" dot={{ r: 4, fill: '#00e5c8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Progress Distribution */}
        <GlassCard delay={0.4}>
          <h3 style={styles.chartTitle}>Client Progress</h3>
          <div style={{ height: 220, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressDistribution}>
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e' }} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={36} name="Clients">
                  <Cell fill="var(--accent-danger)" />
                  <Cell fill="var(--accent-warm)" />
                  <Cell fill="var(--accent-primary)" />
                  <Cell fill="var(--accent-success)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Top Earners */}
      <GlassCard delay={0.45}>
        <div style={{ ...styles.tableHeader, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '8px' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={18} color="var(--accent-warm)" />
            <h3 style={styles.chartTitle}>Revenue Breakdown by Client</h3>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {clients.filter(c => c.status !== 'paused').length} active paying clients
          </span>
        </div>
        <div style={{ ...styles.table, overflowX: isMobile ? 'auto' : undefined }}>
          <div style={{ ...styles.tableRow, minWidth: isMobile ? '500px' : undefined }}>
            <span style={{ ...styles.tableHead, width: '40px' }}>#</span>
            <span style={{ ...styles.tableHead, flex: 1 }}>Client</span>
            <span style={{ ...styles.tableHead, width: '80px' }}>Plan</span>
            <span style={{ ...styles.tableHead, width: '100px' }}>Monthly</span>
            <span style={{ ...styles.tableHead, width: '100px' }}>Annual</span>
            <span style={{ ...styles.tableHead, width: '80px' }}>Status</span>
          </div>
          {[...clients].sort((a, b) => b.monthlyRate - a.monthlyRate).map((client, i) => (
            <motion.div
              key={client.id}
              style={{ ...styles.tableRow, minWidth: isMobile ? '500px' : undefined }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.03 }}
            >
              <span style={{ ...styles.tableCell, width: '40px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {i + 1}
              </span>
              <span style={{ ...styles.tableCell, flex: 1, fontWeight: 500 }}>{client.name}</span>
              <span style={{ ...styles.tableCell, width: '80px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                  color: client.plan === 'Elite' ? 'var(--accent-warm)' : client.plan === 'Premium' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                  background: client.plan === 'Elite' ? 'var(--accent-warm-dim)' : client.plan === 'Premium' ? 'var(--accent-secondary-dim)' : 'rgba(255,255,255,0.05)',
                }}>
                  {client.plan}
                </span>
              </span>
              <span style={{ ...styles.tableCell, width: '100px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ${client.monthlyRate}
              </span>
              <span style={{ ...styles.tableCell, width: '100px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                ${(client.monthlyRate * 12).toLocaleString()}
              </span>
              <span style={{ ...styles.tableCell, width: '80px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block',
                  background: client.status === 'active' ? 'var(--accent-success)' : client.status === 'paused' ? 'var(--accent-warm)' : 'var(--accent-secondary)',
                  marginRight: '6px',
                }} />
                <span style={{ textTransform: 'capitalize', fontSize: '13px' }}>{client.status}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
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
  statsRow: {
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
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  chartRow: {
    display: 'flex',
    gap: '16px',
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: 600,
  },
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    gap: '12px',
  },
  tableHead: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tableCell: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
  },
};
