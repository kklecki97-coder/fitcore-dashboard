import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  CreditCard, Target, Award, Dumbbell, ClipboardCheck, Activity, UserPlus,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
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
  const clientsWhoPaidThisMonth = new Set(thisMonthInvoices.filter(inv => inv.status === 'paid').map(inv => inv.clientId)).size;
  const avgClientValue = clientsWhoPaidThisMonth > 0
    ? Math.round(thisMonthRevenue / clientsWhoPaidThisMonth)
    : 0;

  // ── Retention ──
  const retentionRate = clients.length > 0
    ? Math.round((clients.filter(c => c.status === 'active').length / clients.length) * 1000) / 10
    : 100;

  // ── New clients this month ──
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newClientsThisMonth = clients.filter(c => new Date(c.startDate) >= currentMonthStart);

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

  // ── Revenue chart from invoices (last 6 months) ──
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueChartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = monthNames[d.getMonth()];
    const monthPaid = paidInvoices.filter(inv => {
      if (!inv.paidDate) return false;
      const pd = new Date(inv.paidDate);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    });
    return {
      month: label,
      revenue: monthPaid.reduce((s, inv) => s + inv.amount, 0),
      clients: new Set(monthPaid.map(inv => inv.clientId)).size,
    };
  });

  // ── Plan distribution for Revenue by Plan ──
  const planColors = ['#00e5c8', '#6366f1', '#f59e0b', '#e8637a', '#3b82f6', '#8b5cf6', '#10b981', '#525a6e'];
  const uniquePlans = [...new Set(clients.map(c => c.plan).filter(Boolean))];

  // Revenue by plan from actual invoices (dynamic)
  const uniqueInvoicePlans = [...new Set(paidInvoices.map(inv => inv.plan).filter(Boolean))];
  const planRevenue = uniqueInvoicePlans.map(plan => ({
    name: plan,
    revenue: paidInvoices.filter(inv => inv.plan === plan).reduce((s, inv) => s + inv.amount, 0),
  }));

  // Currency helper
  const fmtMoney = (v: number) => `$${v.toLocaleString()}`;

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
      value: fmtMoney(thisMonthRevenue),
      change: revenueChangePercent,
      changeLabel: revenueChangePercent >= 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
      positive: revenueChangePercent >= 0,
      icon: DollarSign,
      color: 'var(--accent-success)',
      dim: 'var(--accent-success-dim)',
    },
    {
      label: 'Projected Annual',
      value: fmtMoney(projectedAnnual),
      change: revenueChangePercent,
      changeLabel: revenueChangePercent >= 0 ? `+${revenueChangePercent}%` : `${revenueChangePercent}%`,
      positive: revenueChangePercent >= 0,
      icon: TrendingUp,
      color: 'var(--accent-primary)',
      dim: 'var(--accent-primary-dim)',
    },
    {
      label: 'Avg. Client Value',
      value: fmtMoney(avgClientValue),
      change: 0,
      changeLabel: `${clientsWhoPaidThisMonth} active clients`,
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
    background: '#0c1017', border: '1px solid rgba(0,229,200,0.15)',
    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 12px rgba(0,229,200,0.05)',
    backdropFilter: 'blur(20px)',
    fontSize: '13px', color: '#e0e0e0', padding: '10px 14px',
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '32px 40px', gap: isMobile ? '14px' : '24px' }}>
      {/* Revenue Stats - Row 1 */}
      <div style={{ ...styles.statsRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '18px' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const BadgeIcon = stat.positive ? ArrowUpRight : ArrowDownRight;
          return (
            <GlassCard key={stat.label} delay={i * 0.05} hover style={isMobile ? { padding: '14px 16px' } : { padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px' }}>
                <div style={{
                  ...styles.statIcon,
                  width: isMobile ? '34px' : '38px',
                  height: isMobile ? '34px' : '38px',
                  borderRadius: '10px',
                  background: stat.dim,
                  boxShadow: `0 0 12px ${stat.dim}`,
                  flexShrink: 0,
                }}>
                  <Icon size={isMobile ? 15 : 17} color={stat.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'var(--font-display)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stat.value}
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: stat.positive ? 'var(--accent-success)' : 'var(--accent-danger)',
                      display: 'inline-flex', alignItems: 'center', gap: '1px',
                    }}>
                      <BadgeIcon size={10} />
                      {stat.changeLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--text-tertiary)', marginTop: '3px', lineHeight: 1.2 }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Engagement Stats - Row 2 */}
      <div style={{ ...styles.statsRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '18px' }}>
        {[
          { icon: Dumbbell, iconColor: 'var(--accent-secondary)', dim: 'rgba(99,102,241,0.1)', value: String(completedWorkouts.length), label: 'Workouts (30d)', meta1: { text: `${workoutCompletionRate}% completed`, color: workoutCompletionRate >= 80 ? 'var(--accent-success)' : 'var(--accent-warm)' }, meta2: { text: `~${avgWorkoutsPerWeek}/wk per client`, color: 'var(--text-tertiary)' }, delay: 0.15 },
          { icon: ClipboardCheck, iconColor: 'var(--accent-primary)', dim: 'rgba(0,229,200,0.1)', value: `${checkInRate}%`, label: 'Check-In Rate', meta1: { text: `${completedCheckIns.length} completed`, color: checkInRate >= 80 ? 'var(--accent-success)' : 'var(--accent-warm)' }, meta2: { text: `${checkIns.filter(ci => ci.status === 'missed').length} missed`, color: 'var(--accent-danger)' }, delay: 0.2 },
          { icon: Activity, iconColor: 'var(--accent-success)', dim: 'rgba(34,197,94,0.1)', value: fmtMoney(totalCollected), label: 'All-Time Revenue', meta1: { text: `${paidInvoices.length} invoices paid`, color: 'var(--text-secondary)' }, meta2: { text: `${invoices.filter(inv => inv.status === 'overdue').length} overdue`, color: 'var(--accent-warm)' }, delay: 0.25 },
          { icon: UserPlus, iconColor: '#6366f1', dim: 'rgba(99,102,241,0.15)', value: String(newClientsThisMonth.length), label: 'New Clients This Month', meta1: { text: 'this month', color: newClientsThisMonth.length > 0 ? 'var(--accent-success)' : 'var(--text-tertiary)' }, meta2: null, delay: 0.3 },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <GlassCard key={i} delay={card.delay} hover style={isMobile ? { padding: '14px 16px' } : { padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px' }}>
                <div style={{
                  width: isMobile ? '34px' : '38px', height: isMobile ? '34px' : '38px',
                  borderRadius: '10px', background: card.dim, boxShadow: `0 0 12px ${card.dim}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={isMobile ? 15 : 17} color={card.iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{card.value}</div>
                  <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{card.label}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px', fontSize: isMobile ? '10px' : '11px', fontWeight: 500 }}>
                    <span style={{ color: card.meta1.color }}>{card.meta1.text}</span>
                    {card.meta2 && <span style={{ color: card.meta2.color }}>{card.meta2.text}</span>}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Revenue by Plan - CSS bars */}
      <GlassCard delay={0.3} style={isMobile ? { padding: '16px' } : undefined}>
        <h3 style={{ ...styles.chartTitle, fontSize: isMobile ? '15px' : '16px' }}>Revenue by Plan</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: isMobile ? '12px' : '16px' }}>
          {(() => {
            const maxRevenue = Math.max(...planRevenue.map(p => p.revenue), 1);
            const totalPlanRevenue = planRevenue.reduce((s, p) => s + p.revenue, 0);
            return planRevenue.map((plan, i) => {
              const pct = totalPlanRevenue > 0 ? Math.round((plan.revenue / totalPlanRevenue) * 100) : 0;
              const color = planColors[i % planColors.length];
              return (
                <div key={plan.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{plan.name}</span>
                      <span style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--text-tertiary)' }}>{pct}%</span>
                    </div>
                    <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {fmtMoney(plan.revenue)}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      style={{ height: '100%', borderRadius: '3px', background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(plan.revenue / maxRevenue) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </GlassCard>

      {/* Revenue Trend */}
      <GlassCard delay={0.35} style={isMobile ? { padding: '16px' } : undefined}>
        <h3 style={{ ...styles.chartTitle, fontSize: isMobile ? '15px' : '16px' }}>Revenue Trend</h3>
        <div style={{ height: isMobile ? 180 : 280, marginTop: isMobile ? '12px' : '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="revenueGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis domain={[(min: number) => Math.floor(min * 0.9), (max: number) => Math.ceil(max * 1.05)]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => fmtMoney(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [fmtMoney(value as number), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#revenueGrad2)" dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Client Breakdown Table */}
      <GlassCard delay={0.55} style={isMobile ? { padding: '16px' } : undefined}>
        <div style={{ ...styles.tableHeader, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '6px' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
            <Award size={isMobile ? 15 : 18} color="var(--accent-warm)" />
            <h3 style={{ ...styles.chartTitle, fontSize: isMobile ? '15px' : '16px' }}>Client Breakdown</h3>
          </div>
          <span style={{ fontSize: isMobile ? '12px' : '18px', color: 'var(--text-secondary)' }}>
            {activePayingClients.length} active clients
          </span>
        </div>
        <div style={{ ...styles.table, overflowX: isMobile ? 'auto' : undefined }}>
          <div style={{ ...styles.tableRow, minWidth: isMobile ? '580px' : undefined }}>
            <span style={{ ...styles.tableHead, width: isMobile ? '28px' : '40px', fontSize: isMobile ? '11px' : '15px' }}>#</span>
            <span style={{ ...styles.tableHead, flex: 1, fontSize: isMobile ? '11px' : '15px' }}>Client</span>
            <span style={{ ...styles.tableHead, width: isMobile ? '65px' : '80px', fontSize: isMobile ? '11px' : '15px' }}>Plan</span>
            <span style={{ ...styles.tableHead, width: isMobile ? '80px' : '100px', fontSize: isMobile ? '11px' : '15px' }}>Revenue</span>
            <span style={{ ...styles.tableHead, width: isMobile ? '70px' : '90px', fontSize: isMobile ? '11px' : '15px' }}>Workouts</span>
            <span style={{ ...styles.tableHead, width: isMobile ? '70px' : '90px', fontSize: isMobile ? '11px' : '15px' }}>Check-Ins</span>
            <span style={{ ...styles.tableHead, width: isMobile ? '60px' : '80px', fontSize: isMobile ? '11px' : '15px' }}>Status</span>
          </div>
          {clientEngagement.map((client, i) => (
            <motion.div
              key={client.id}
              style={{ ...styles.tableRow, minWidth: isMobile ? '580px' : undefined, cursor: 'pointer', padding: isMobile ? '8px 10px' : '10px 12px', gap: isMobile ? '8px' : '12px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.03 }}
              onClick={() => onViewClient(client.id)}
            >
              <span style={{ ...styles.tableCell, width: isMobile ? '28px' : '40px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: isMobile ? '13px' : '18px' }}>
                {i + 1}
              </span>
              <span style={{ ...styles.tableCell, flex: 1, fontWeight: 500, gap: isMobile ? '6px' : '8px' }}>
                <div style={{ ...styles.avatar, background: getAvatarColor(client.id), ...(isMobile ? { width: '24px', height: '24px', fontSize: '10px' } : {}) }}>
                  {getInitials(client.name)}
                </div>
                <span style={{ ...styles.clientNameLink, fontSize: isMobile ? '13px' : '18px' }}>{client.name}</span>
              </span>
              <span style={{ ...styles.tableCell, width: isMobile ? '65px' : '80px' }}>
                <span style={{
                  fontSize: isMobile ? '11px' : '15px', fontWeight: 600, padding: isMobile ? '1px 6px' : '2px 8px', borderRadius: '12px',
                  color: planColors[uniquePlans.indexOf(client.plan) % planColors.length] || 'var(--text-secondary)',
                  background: `${planColors[uniquePlans.indexOf(client.plan) % planColors.length] || '#525a6e'}18`,
                }}>
                  {client.plan}
                </span>
              </span>
              <span style={{ ...styles.tableCell, width: isMobile ? '80px' : '100px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: isMobile ? '13px' : '18px' }}>
                {fmtMoney(client.totalPaid)}
              </span>
              <span style={{ ...styles.tableCell, width: isMobile ? '70px' : '90px', fontSize: isMobile ? '13px' : '18px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{client.workoutsCompleted}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: isMobile ? '11px' : '14px', marginLeft: '2px' }}>/{client.workoutsTotal}</span>
              </span>
              <span style={{ ...styles.tableCell, width: isMobile ? '70px' : '90px', fontSize: isMobile ? '13px' : '18px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: client.checkInsMissed > 0 ? 'var(--text-primary)' : 'var(--accent-success)' }}>
                  {client.checkInsCompleted}
                </span>
                {client.checkInsMissed > 0 && (
                  <span style={{ color: 'var(--accent-danger)', fontSize: isMobile ? '11px' : '14px', marginLeft: '4px' }}>
                    ({client.checkInsMissed} missed)
                  </span>
                )}
              </span>
              <span style={{ ...styles.tableCell, width: isMobile ? '60px' : '80px' }}>
                <span style={{
                  width: isMobile ? '6px' : '8px', height: isMobile ? '6px' : '8px', borderRadius: '50%', display: 'inline-block',
                  background: client.status === 'active' ? 'var(--accent-success)' : client.status === 'paused' ? 'var(--accent-warm)' : 'var(--accent-secondary)',
                  marginRight: isMobile ? '4px' : '6px',
                }} />
                <span style={{ textTransform: 'capitalize', fontSize: isMobile ? '12px' : '18px' }}>{client.status}</span>
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
    gap: '12px',
  },
  statIcon: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
  },
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: '1fr',
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
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tableCell: {
    fontSize: '14px',
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
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};
