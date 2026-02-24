import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CreditCard, Target, Award, Dumbbell, ClipboardCheck, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import GlassCard from './GlassCard';
import { revenueData, getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, Invoice, WorkoutLog, CheckIn } from '../types';

interface AnalyticsPageProps {
  clients: Client[];
  invoices: Invoice[];
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  onViewClient: (id: string) => void;
}

export default function AnalyticsPage({ clients, invoices, workoutLogs, checkIns, onViewClient }: AnalyticsPageProps) {
  const isMobile = useIsMobile();

  // ── Revenue from real invoices ──
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const currentPeriod = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const previousPeriod = prevDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const thisMonthInvoices = invoices.filter(inv => inv.period === currentPeriod);
  const lastMonthInvoices = invoices.filter(inv => inv.period === previousPeriod);
  const thisMonthRevenue = thisMonthInvoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const lastMonthRevenue = lastMonthInvoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const totalCollected = paidInvoices.reduce((s, inv) => s + inv.amount, 0);
  const projectedAnnual = thisMonthRevenue * 12;

  const revenueChangePercent = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : thisMonthRevenue > 0 ? 100 : 0;

  // Avg client value from actual paid invoices this month
  const activePayingClients = clients.filter(c => c.status !== 'paused');
  const avgClientValue = activePayingClients.length > 0
    ? Math.round(thisMonthRevenue / activePayingClients.length)
    : 0;

  // ── Retention ──
  const retentionRate = clients.length > 0
    ? Math.round((clients.filter(c => c.status === 'active').length / clients.length) * 1000) / 10
    : 100;

  // ── Engagement metrics ──
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const recentWorkouts = workoutLogs.filter(w => new Date(w.date) >= thirtyDaysAgo);
  const completedWorkouts = recentWorkouts.filter(w => w.completed);
  const workoutCompletionRate = recentWorkouts.length > 0
    ? Math.round((completedWorkouts.length / recentWorkouts.length) * 100)
    : 0;
  const avgWorkoutsPerWeek = activePayingClients.length > 0
    ? Math.round((completedWorkouts.length / activePayingClients.length / 4) * 10) / 10
    : 0;

  const completedCheckIns = checkIns.filter(ci => ci.status === 'completed');
  const scheduledOrDone = checkIns.filter(ci => ci.status === 'completed' || ci.status === 'missed');
  const checkInRate = scheduledOrDone.length > 0
    ? Math.round((completedCheckIns.length / scheduledOrDone.length) * 100)
    : 0;

  // ── Revenue chart from invoices (aggregate by period) ──
  const periodRevenue: Record<string, number> = {};
  const periodClients: Record<string, Set<string>> = {};
  paidInvoices.forEach(inv => {
    periodRevenue[inv.period] = (periodRevenue[inv.period] || 0) + inv.amount;
    if (!periodClients[inv.period]) periodClients[inv.period] = new Set();
    periodClients[inv.period].add(inv.clientId);
  });
  // Merge invoice-derived data with revenueData (keep revenueData months for chart continuity)
  const revenueChartData = revenueData.map(rd => ({
    month: rd.month,
    revenue: periodRevenue[`${rd.month} 2026`] ?? periodRevenue[`${rd.month} 2025`] ?? rd.revenue,
    clients: periodClients[`${rd.month} 2026`]?.size ?? periodClients[`${rd.month} 2025`]?.size ?? rd.clients,
  }));

  // ── Plan distribution ──
  const planDistribution = [
    { name: 'Elite', value: clients.filter(c => c.plan === 'Elite').length, color: '#f59e0b' },
    { name: 'Premium', value: clients.filter(c => c.plan === 'Premium').length, color: '#6366f1' },
    { name: 'Basic', value: clients.filter(c => c.plan === 'Basic').length, color: '#525a6e' },
  ];

  // Revenue by plan from actual invoices
  const planRevenue = [
    { name: 'Elite', revenue: paidInvoices.filter(inv => inv.plan === 'Elite').reduce((s, inv) => s + inv.amount, 0) },
    { name: 'Premium', revenue: paidInvoices.filter(inv => inv.plan === 'Premium').reduce((s, inv) => s + inv.amount, 0) },
    { name: 'Basic', revenue: paidInvoices.filter(inv => inv.plan === 'Basic').reduce((s, inv) => s + inv.amount, 0) },
  ];

  // ── Retention chart ──
  const retentionData = revenueChartData.map((rd) => ({
    month: rd.month,
    rate: clients.length > 0 ? Math.round((rd.clients / clients.length) * 1000) / 10 : 100,
  }));

  // ── Progress distribution ──
  const progressDistribution = [
    { range: '0-25%', count: clients.filter(c => c.progress <= 25).length },
    { range: '26-50%', count: clients.filter(c => c.progress > 25 && c.progress <= 50).length },
    { range: '51-75%', count: clients.filter(c => c.progress > 50 && c.progress <= 75).length },
    { range: '76-100%', count: clients.filter(c => c.progress > 75).length },
  ];

  // ── Per-client engagement data for table ──
  const clientEngagement = clients.map(client => {
    const cWorkouts = recentWorkouts.filter(w => w.clientId === client.id);
    const cCompleted = cWorkouts.filter(w => w.completed).length;
    const cCheckIns = checkIns.filter(ci => ci.clientId === client.id && ci.status === 'completed').length;
    const cMissed = checkIns.filter(ci => ci.clientId === client.id && ci.status === 'missed').length;
    const cInvoicesPaid = paidInvoices.filter(inv => inv.clientId === client.id).reduce((s, inv) => s + inv.amount, 0);
    return {
      ...client,
      workoutsCompleted: cCompleted,
      workoutsTotal: cWorkouts.length,
      checkInsCompleted: cCheckIns,
      checkInsMissed: cMissed,
      totalPaid: cInvoicesPaid,
    };
  }).sort((a, b) => b.totalPaid - a.totalPaid);

  // ── Stat cards config ──
  const statCards = [
    {
      label: 'Monthly Revenue',
      value: `$${thisMonthRevenue.toLocaleString()}`,
      change: revenueChangePercent,
      changeLabel: revenueChangePercent >= 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
      positive: revenueChangePercent >= 0,
      icon: DollarSign,
      color: 'var(--accent-success)',
      dim: 'var(--accent-success-dim)',
    },
    {
      label: 'Projected Annual',
      value: `$${projectedAnnual.toLocaleString()}`,
      change: revenueChangePercent,
      changeLabel: revenueChangePercent >= 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
      positive: revenueChangePercent >= 0,
      icon: TrendingUp,
      color: 'var(--accent-primary)',
      dim: 'var(--accent-primary-dim)',
    },
    {
      label: 'Avg. Client Value',
      value: `$${avgClientValue}`,
      change: 0,
      changeLabel: `${activePayingClients.length} clients`,
      positive: true,
      icon: CreditCard,
      color: 'var(--accent-secondary)',
      dim: 'var(--accent-secondary-dim)',
    },
    {
      label: 'Retention Rate',
      value: `${retentionRate}%`,
      change: 0,
      changeLabel: retentionRate >= 90 ? 'Excellent' : retentionRate >= 75 ? 'Good' : 'Needs focus',
      positive: retentionRate >= 75,
      icon: Target,
      color: 'var(--accent-warm)',
      dim: 'var(--accent-warm-dim)',
    },
  ];

  const tooltipStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle-strong)',
    borderRadius: '10px', boxShadow: 'var(--shadow-elevated)',
    fontSize: '18px',
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Revenue Stats */}
      <div style={{ ...styles.statsRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const BadgeIcon = stat.positive ? ArrowUpRight : ArrowDownRight;
          return (
            <GlassCard key={stat.label} delay={i * 0.05} hover>
              <div style={styles.statTop}>
                <div style={{ ...styles.statIcon, background: stat.dim }}>
                  <Icon size={18} color={stat.color} />
                </div>
                <div style={{
                  ...styles.changeBadge,
                  color: stat.positive ? 'var(--accent-success)' : 'var(--accent-danger)',
                  background: stat.positive ? 'var(--accent-success-dim)' : 'rgba(239,68,68,0.1)',
                }}>
                  <BadgeIcon size={12} />
                  {stat.changeLabel}
                </div>
              </div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </GlassCard>
          );
        })}
      </div>

      {/* Engagement Stats Row */}
      <div style={{ ...styles.statsRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}>
        <GlassCard delay={0.15} hover>
          <div style={styles.engagementCard}>
            <div style={{ ...styles.engagementIcon, background: 'rgba(99,102,241,0.1)' }}>
              <Dumbbell size={18} color="var(--accent-secondary)" />
            </div>
            <div>
              <div style={styles.engagementValue}>{completedWorkouts.length}</div>
              <div style={styles.engagementLabel}>Workouts (30d)</div>
            </div>
            <div style={styles.engagementMeta}>
              <span style={{ color: workoutCompletionRate >= 80 ? 'var(--accent-success)' : 'var(--accent-warm)' }}>
                {workoutCompletionRate}% completed
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>
                ~{avgWorkoutsPerWeek}/wk per client
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={0.2} hover>
          <div style={styles.engagementCard}>
            <div style={{ ...styles.engagementIcon, background: 'rgba(0,229,200,0.1)' }}>
              <ClipboardCheck size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <div style={styles.engagementValue}>{checkInRate}%</div>
              <div style={styles.engagementLabel}>Check-In Rate</div>
            </div>
            <div style={styles.engagementMeta}>
              <span style={{ color: checkInRate >= 80 ? 'var(--accent-success)' : 'var(--accent-warm)' }}>
                {completedCheckIns.length} completed
              </span>
              <span style={{ color: 'var(--accent-danger)' }}>
                {checkIns.filter(ci => ci.status === 'missed').length} missed
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={0.25} hover>
          <div style={styles.engagementCard}>
            <div style={{ ...styles.engagementIcon, background: 'rgba(34,197,94,0.1)' }}>
              <Activity size={18} color="var(--accent-success)" />
            </div>
            <div>
              <div style={styles.engagementValue}>${totalCollected.toLocaleString()}</div>
              <div style={styles.engagementLabel}>Total Collected</div>
            </div>
            <div style={styles.engagementMeta}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {paidInvoices.length} invoices paid
              </span>
              <span style={{ color: 'var(--accent-warm)' }}>
                {invoices.filter(inv => inv.status === 'overdue').length} overdue
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Revenue Over Time + Plan Distribution */}
      <div style={{ ...styles.chartRow, flexDirection: isMobile ? 'column' : 'row' }}>
        <GlassCard delay={0.3} style={{ flex: 2 }}>
          <h3 style={styles.chartTitle}>Revenue Over Time</h3>
          <div style={{ height: isMobile ? 220 : 280, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`$${value}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#revenueGrad2)" dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.35} style={{ flex: 1 }}>
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
                  formatter={(value) => <span style={{ color: '#8b92a5', fontSize: '17px', fontFamily: 'Outfit' }}>{value}</span>}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} clients`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div style={{ ...styles.bottomRow, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Revenue by Plan */}
        <GlassCard delay={0.4}>
          <h3 style={styles.chartTitle}>Revenue by Plan</h3>
          <div style={{ height: 220, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planRevenue} layout="vertical">
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 18, fill: '#8b92a5' }} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`$${value}`, 'Revenue']} />
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
        <GlassCard delay={0.45}>
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
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e' }} />
                <YAxis domain={[70, 105]} axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, 'Retention']} />
                <Area type="monotone" dataKey="rate" stroke="#00e5c8" strokeWidth={2} fill="url(#retentionGrad)" dot={{ r: 4, fill: '#00e5c8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Progress Distribution */}
        <GlassCard delay={0.5}>
          <h3 style={styles.chartTitle}>Client Progress</h3>
          <div style={{ height: 220, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressDistribution}>
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 15, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e' }} />
                <Tooltip contentStyle={tooltipStyle} />
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

      {/* Revenue & Engagement Table */}
      <GlassCard delay={0.55}>
        <div style={{ ...styles.tableHeader, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '8px' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={18} color="var(--accent-warm)" />
            <h3 style={styles.chartTitle}>Client Breakdown</h3>
          </div>
          <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            {activePayingClients.length} active clients
          </span>
        </div>
        <div style={{ ...styles.table, overflowX: isMobile ? 'auto' : undefined }}>
          <div style={{ ...styles.tableRow, minWidth: isMobile ? '700px' : undefined }}>
            <span style={{ ...styles.tableHead, width: '40px' }}>#</span>
            <span style={{ ...styles.tableHead, flex: 1 }}>Client</span>
            <span style={{ ...styles.tableHead, width: '80px' }}>Plan</span>
            <span style={{ ...styles.tableHead, width: '100px' }}>Revenue</span>
            <span style={{ ...styles.tableHead, width: '90px' }}>Workouts</span>
            <span style={{ ...styles.tableHead, width: '90px' }}>Check-Ins</span>
            <span style={{ ...styles.tableHead, width: '80px' }}>Status</span>
          </div>
          {clientEngagement.map((client, i) => (
            <motion.div
              key={client.id}
              style={{ ...styles.tableRow, minWidth: isMobile ? '700px' : undefined, cursor: 'pointer' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.03 }}
              onClick={() => onViewClient(client.id)}
            >
              <span style={{ ...styles.tableCell, width: '40px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {i + 1}
              </span>
              <span style={{ ...styles.tableCell, flex: 1, fontWeight: 500, gap: '8px' }}>
                <div style={{ ...styles.avatar, background: getAvatarColor(client.id) }}>
                  {getInitials(client.name)}
                </div>
                <span style={styles.clientNameLink}>{client.name}</span>
              </span>
              <span style={{ ...styles.tableCell, width: '80px' }}>
                <span style={{
                  fontSize: '15px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                  color: client.plan === 'Elite' ? 'var(--accent-warm)' : client.plan === 'Premium' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                  background: client.plan === 'Elite' ? 'var(--accent-warm-dim)' : client.plan === 'Premium' ? 'var(--accent-secondary-dim)' : 'var(--bg-subtle-hover)',
                }}>
                  {client.plan}
                </span>
              </span>
              <span style={{ ...styles.tableCell, width: '100px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ${client.totalPaid.toLocaleString()}
              </span>
              <span style={{ ...styles.tableCell, width: '90px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{client.workoutsCompleted}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginLeft: '2px' }}>/{client.workoutsTotal}</span>
              </span>
              <span style={{ ...styles.tableCell, width: '90px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: client.checkInsMissed > 0 ? 'var(--text-primary)' : 'var(--accent-success)' }}>
                  {client.checkInsCompleted}
                </span>
                {client.checkInsMissed > 0 && (
                  <span style={{ color: 'var(--accent-danger)', fontSize: '14px', marginLeft: '4px' }}>
                    ({client.checkInsMissed} missed)
                  </span>
                )}
              </span>
              <span style={{ ...styles.tableCell, width: '80px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block',
                  background: client.status === 'active' ? 'var(--accent-success)' : client.status === 'paused' ? 'var(--accent-warm)' : 'var(--accent-secondary)',
                  marginRight: '6px',
                }} />
                <span style={{ textTransform: 'capitalize', fontSize: '18px' }}>{client.status}</span>
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
    fontSize: '17px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '20px',
  },
  statValue: {
    fontSize: '39px',
    fontWeight: 700,
    letterSpacing: '-1px',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  engagementCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  engagementIcon: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementValue: {
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
  },
  engagementLabel: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  engagementMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '14px',
    fontWeight: 500,
  },
  chartRow: {
    display: 'flex',
    gap: '16px',
  },
  chartTitle: {
    fontSize: '21px',
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
    transition: 'background 0.1s',
  },
  tableHead: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tableCell: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    flexShrink: 0,
  },
  clientNameLink: {
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};
