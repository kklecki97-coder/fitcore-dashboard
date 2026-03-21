import { useMemo, useState, useEffect, useCallback } from 'react';
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
  Loader2,
  RefreshCw,
  ChevronDown,
  FileBarChart,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import GlassCard from './GlassCard';
import AnimatedNumber from './AnimatedNumber';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useAIBriefing } from '../hooks/useAIBriefing';
import { useLang } from '../i18n';
import { formatCurrency } from '../lib/locale';
import { computeRevenueChartData, calculateRevenueChange } from '../utils/analytics';
import { filterAtRiskClients } from '../utils/client-analysis';
import { getDailyQuote } from '../utils/formatting';
import { computeWeeklyReport } from '../utils/weekly-report';
import WeeklyReport from './WeeklyReport';
import type { Client, Message, WorkoutProgram, Invoice, WorkoutLog, CheckIn, HabitAssignment, HabitLog } from '../types';

const QUOTE_AUTHORS = [
  'Unknown',
  'Dwayne Johnson',
  'Jim Rohn',
  'Arnold Schwarzenegger',
  'Unknown',
  'Jim Rohn',
  'Arnold Schwarzenegger',
  'Muhammad Ali',
  'Unknown',
  'Sonny Franco',
];

interface OverviewPageProps {
  clients: Client[];
  messages: Message[];
  programs: WorkoutProgram[];
  invoices: Invoice[];
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages' | 'clients') => void;
  profileName?: string;
  habitAssignments?: HabitAssignment[];
  habitLogs?: HabitLog[];
}

function getTimeGreeting(t: { overview: { greetingMorning: (n: string) => string; greetingAfternoon: (n: string) => string; greetingEvening: (n: string) => string; greetingNight: (n: string) => string } }, name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t.overview.greetingMorning(name);
  if (hour >= 12 && hour < 18) return t.overview.greetingAfternoon(name);
  if (hour >= 18 && hour < 22) return t.overview.greetingEvening(name);
  return t.overview.greetingNight(name);
}

export default function OverviewPage({ clients, messages, programs, invoices, workoutLogs, checkIns, onViewClient, onNavigate, profileName, habitAssignments, habitLogs }: OverviewPageProps) {
  const isMobile = useIsMobile();
  const { t, lang } = useLang();
  const { briefing, loading: briefingLoading, refresh: refreshBriefing } = useAIBriefing(clients, invoices, workoutLogs, checkIns, messages, programs, lang);
  const [ready, setReady] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const reportData = useMemo(() => computeWeeklyReport(clients, messages, invoices, workoutLogs, checkIns), [clients, messages, invoices, workoutLogs, checkIns]);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Time-based greeting
  const coachFirstName = profileName ? profileName.split(' ')[0] : '';
  const greeting = coachFirstName ? getTimeGreeting(t, coachFirstName) : '';
  const todayFormatted = new Date().toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingClients = clients.filter(c => c.status === 'pending').length;
  const totalRevenue = clients.filter(c => c.status !== 'paused').reduce((sum, c) => sum + c.monthlyRate, 0);
  const unreadMessages = messages.filter(m => !m.isRead && !m.isFromCoach);

  // Compute revenue chart from real invoices
  const revenueData = useMemo(() => computeRevenueChartData(invoices), [invoices]);

  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const revenueChange = calculateRevenueChange(lastMonth.revenue, prevMonth?.revenue ?? 0);

  // At-risk: based on real data - paused, no workouts in 7 days, or overdue check-in
  const atRiskClients = filterAtRiskClients(clients, workoutLogs);
  // Used for at-risk reason display below
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Pending check-ins: check-ins that coach hasn't reviewed yet
  const pendingCheckInsList = checkIns.filter(ci => ci.reviewStatus === 'pending');


  // Daily quote - rotate by day of year
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyQuote = useMemo(() => getDailyQuote(t.overview.quotes, QUOTE_AUTHORS), [new Date().toDateString(), t]);

  // AI briefing fallback stats (when no API key or error)
  const fallbackStats = useMemo(() => [
    `${clients.filter(c => c.status === 'active').length} ${lang === 'pl' ? 'aktywnych klientow' : 'active clients'}, ${clients.filter(c => c.status === 'paused').length} ${lang === 'pl' ? 'wstrzymanych' : 'paused'}`,
    `${lang === 'pl' ? 'Przychod w tym miesiacu' : 'Revenue this month'}: ${invoices.filter(i => i.status === 'paid' && i.period === new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })).reduce((s, i) => s + i.amount, 0)} ${lang === 'pl' ? 'zl' : '$'}`,
    `${checkIns.filter(ci => ci.reviewStatus === 'pending').length} ${lang === 'pl' ? 'check-inow do przegladniecia' : 'check-ins to review'}`,
    `${messages.filter(m => !m.isFromCoach && !m.isRead).length} ${lang === 'pl' ? 'nieprzeczytanych wiadomosci' : 'unread messages'}`,
  ], [clients, invoices, checkIns, messages, lang]);

  const fmtCurrency = useCallback((n: number) => formatCurrency(n, lang), [lang]);

  const statCards = [
    {
      label: t.overview.activeClients,
      numericValue: activeClients,
      change: pendingClients > 0 ? t.overview.pending(pendingClients) : t.overview.stable,
      trend: pendingClients > 0 ? 'neutral' as const : 'up' as const,
      icon: Users,
      color: 'var(--accent-primary)',
      dimColor: 'var(--accent-primary-dim)',
    },
    {
      label: t.overview.monthlyRevenue,
      numericValue: totalRevenue,
      format: fmtCurrency,
      change: revenueChange >= 0 ? `+${revenueChange}%` : `${revenueChange}%`,
      trend: revenueChange >= 0 ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'var(--accent-success)',
      dimColor: 'var(--accent-success-dim)',
    },
    {
      label: t.overview.atRiskClients,
      numericValue: atRiskClients.length,
      change: atRiskClients.length > 0 ? t.overview.needsAttention : t.overview.allGood,
      trend: atRiskClients.length > 0 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: atRiskClients.length > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
      dimColor: atRiskClients.length > 0 ? 'var(--accent-danger-dim)' : 'var(--accent-success-dim)',
    },
    {
      label: t.overview.pendingCheckIns,
      numericValue: pendingCheckInsList.length,
      change: pendingCheckInsList.length > 0 ? t.overview.dueToday : t.overview.allCaughtUp,
      trend: 'neutral' as const,
      icon: CalendarCheck,
      color: 'var(--accent-warm)',
      dimColor: 'var(--accent-warm-dim)',
    },
  ];

  // Welcome state for new coaches with zero clients
  if (ready && clients.length === 0) {
    return (
      <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px', alignItems: 'center', justifyContent: 'center' }}>
        {greeting && (
          <motion.div
            style={styles.greetingSection}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1 style={{ ...styles.greetingText, fontSize: isMobile ? '22px' : '28px' }}>{greeting}</h1>
            <p style={styles.greetingDate}>{todayFormatted}</p>
          </motion.div>
        )}
        <motion.div
          style={styles.quoteBar}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: greeting ? 0.15 : 0 }}
        >
          <span style={styles.quoteText}>"{dailyQuote.text}"</span>
          <span style={styles.quoteAuthor}> - {dailyQuote.author}</span>
        </motion.div>
        <GlassCard delay={0.1}>
          <div style={{ textAlign: 'center', padding: isMobile ? '32px 16px' : '48px 32px' }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Users size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
            </motion.div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {t.overview.welcomeTitle}
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              {t.overview.welcomeSub}
            </p>
            <motion.button
              onClick={() => onNavigate('clients')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                border: 'none',
                color: 'var(--text-on-accent)',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                cursor: 'pointer',
                boxShadow: '0 0 20px var(--accent-primary-dim)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Users size={16} />
              {t.overview.getStarted}
            </motion.button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
        {/* Quote skeleton */}
        <div style={{ ...styles.quoteBar, padding: '24px 20px' }}>
          <div style={skeletonStyles.line200} />
          <div style={{ ...skeletonStyles.line100, marginTop: '8px' }} />
        </div>

        {/* Stat cards skeleton */}
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

        {/* Summary skeleton */}
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

        {/* Chart skeleton */}
        <GlassCard delay={0}>
          <div style={skeletonStyles.line140} />
          <div style={{ ...skeletonStyles.chartBlock, marginTop: '16px' }} />
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Personalized Greeting + Weekly Report Button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        {greeting && (
          <motion.div
            style={styles.greetingSection}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1 style={{ ...styles.greetingText, fontSize: isMobile ? '22px' : '28px' }}>{greeting}</h1>
            <p style={styles.greetingDate}>{todayFormatted}</p>
          </motion.div>
        )}
        {clients.length > 0 && (
          <motion.button
            onClick={() => setReportOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: isMobile ? '8px 12px' : '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)',
              cursor: 'pointer', flexShrink: 0, marginTop: '4px',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            whileHover={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FileBarChart size={15} />
            {!isMobile && t.weeklyReport.button}
          </motion.button>
        )}
      </div>

      {/* Daily Motivation */}
      <motion.div
        style={styles.quoteBar}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: greeting ? 0.15 : 0 }}
      >
        <span style={styles.quoteText}>"{dailyQuote.text}"</span>
        <span style={styles.quoteAuthor}> - {dailyQuote.author}</span>
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
              <div style={{ ...styles.statValue, fontSize: isMobile ? '22px' : '28px' }}>
                <AnimatedNumber value={stat.numericValue} format={stat.format} />
              </div>
              <div style={styles.statLabel}>{stat.label}</div>
            </GlassCard>
          );
        })}
      </div>

      {/* AI Dashboard Summary */}
      <GlassCard delay={0.15}>
        <div style={styles.cardHeader}>
          <div style={styles.insightTitleRow}>
            <Sparkles size={15} color="var(--accent-primary)" />
            <h3 style={styles.cardTitle}>{t.overview.dashboardSummary}</h3>
          </div>
          {!briefingLoading && briefing && (
            <button onClick={refreshBriefing} style={styles.viewAllBtn} title={lang === 'pl' ? 'Odswiez' : 'Refresh'}>
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        {briefingLoading ? (
          <div style={{ padding: '20px 10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Loader2 size={16} className="spin" color="var(--accent-primary)" />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t.overview.aiAnalyzing}
            </span>
          </div>
        ) : briefing ? (
          <div style={{ position: 'relative' }}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.7,
                padding: '8px 10px', margin: 0, fontWeight: 400,
                ...(isMobile && !summaryExpanded ? {
                  maxHeight: '120px',
                  overflow: 'hidden',
                } : {}),
              }}
            >
              {briefing}
            </motion.p>
            {isMobile && !summaryExpanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
                background: 'linear-gradient(transparent, var(--bg-card, #0d1117))',
                pointerEvents: 'none',
              }} />
            )}
            {isMobile && (
              <button
                onClick={() => setSummaryExpanded(prev => !prev)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  width: '100%', padding: '8px 0', marginTop: summaryExpanded ? '4px' : '0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent-primary)', fontSize: '13px', fontFamily: 'Outfit',
                }}
              >
                {summaryExpanded ? (lang === 'pl' ? 'Zwiń' : 'Show less') : (lang === 'pl' ? 'Rozwiń' : 'Show more')}
                <ChevronDown size={14} style={{
                  transform: summaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {fallbackStats.map((stat, i) => (
              <div key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
                {stat}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Revenue Chart */}
      <GlassCard delay={0.2}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>{t.overview.revenueOverview}</h3>
            <p style={styles.cardSubtitle}>{t.overview.monthlyRecurring}</p>
          </div>
          <div style={styles.legendRow}>
            <span style={getLegendDotStyle('#00e5c8')} />
            <span style={styles.legendText}>{t.overview.revenue}</span>
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
                domain={[(min: number) => Math.floor(min * 0.9), (max: number) => Math.ceil(max * 1.05)]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => formatCurrency(v, lang)}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle-strong)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-elevated)',
                  fontSize: '18px',
                  fontFamily: 'Outfit',
                }}
                labelStyle={{ color: '#8b92a5' }}
                itemStyle={{ color: '#00e5c8' }}
                formatter={(value) => [formatCurrency(value as number, lang), t.overview.revenue]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#00e5c8"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={{ fill: '#00e5c8', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--text-on-accent)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Habit Compliance Widget */}
      {habitAssignments && habitLogs && habitAssignments.length > 0 && (
        <GlassCard delay={0.25}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>{t.habits.habitCompliance}</h3>
              <p style={styles.cardSubtitle}>{t.habits.clientsTracking(
                new Set(habitAssignments.filter(a => a.isActive).map(a => a.clientId)).size
              )}</p>
            </div>
            <TrendingUp size={16} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(() => {
              // Group by client, calculate adherence for last 7 days
              const clientIds = [...new Set(habitAssignments.filter(a => a.isActive).map(a => a.clientId))];
              const clientData = clientIds.map(cId => {
                const client = clients.find(c => c.id === cId);
                const ca = habitAssignments.filter(a => a.clientId === cId && a.isActive);
                const today = new Date();
                let total = 0;
                let completed = 0;
                for (let i = 0; i < 7; i++) {
                  const d = new Date(today);
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  for (const a of ca) {
                    total++;
                    const log = habitLogs.find(l => l.habitAssignmentId === a.id && l.logDate === dateStr);
                    if (log?.completed) completed++;
                  }
                }
                return { clientId: cId, name: client?.name ?? 'Unknown', adherence: total > 0 ? Math.round((completed / total) * 100) : 0 };
              }).sort((a, b) => a.adherence - b.adherence); // worst first

              return clientData.slice(0, 5).map(cd => (
                <div
                  key={cd.clientId}
                  onClick={() => onViewClient(cd.clientId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{cd.name}</span>
                  <div style={{ width: 60, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${cd.adherence}%`,
                      background: cd.adherence >= 80 ? 'var(--accent-success)' : cd.adherence >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 32, textAlign: 'right',
                    color: cd.adherence >= 80 ? 'var(--accent-success)' : cd.adherence >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                  }}>
                    {cd.adherence}%
                  </span>
                </div>
              ));
            })()}
          </div>
        </GlassCard>
      )}

      {/* Bottom Row */}
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
        {/* At-Risk Clients */}
        <GlassCard delay={0.3}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>{t.overview.atRiskClientsTitle}</h3>
              <p style={styles.cardSubtitle}>
                {atRiskClients.length > 0
                  ? t.overview.clientsNeedAttention(atRiskClients.length)
                  : t.overview.allOnTrack}
              </p>
            </div>
            <AlertTriangle size={16} color={atRiskClients.length > 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)'} />
          </div>
          <div style={styles.riskList}>
            {atRiskClients.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>{t.overview.noAtRisk}</span>
              </div>
            ) : (
              atRiskClients.map((client, i) => {
                const reasons: string[] = [];
                if (client.status === 'paused') reasons.push(t.overview.paused);
                const clientRecentWorkouts = workoutLogs.filter(w => w.clientId === client.id && w.date >= sevenDaysAgoStr);
                if (clientRecentWorkouts.length === 0 && client.status !== 'paused') reasons.push(t.overview.noStreak);
                if (client.nextCheckIn && client.nextCheckIn !== '-') {
                  const ciDate = new Date(client.nextCheckIn);
                  ciDate.setHours(0, 0, 0, 0);
                  if (ciDate < today) reasons.push(t.overview.overdueCheckIn ?? 'Overdue check-in');
                }
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
              <h3 style={styles.cardTitle}>{t.overview.topPerformers}</h3>
              <p style={styles.cardSubtitle}>{t.overview.highestProgress}</p>
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
              <h3 style={styles.cardTitle}>{t.overview.recentMessages}</h3>
              <p style={styles.cardSubtitle}>{t.overview.unread(unreadMessages.length)}</p>
            </div>
            <button onClick={() => onNavigate('messages')} style={styles.viewAllBtn}>
              {t.overview.viewAll}
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

      {/* Weekly Report Modal */}
      <WeeklyReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        data={reportData}
        onViewClient={onViewClient}
      />
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
    color: 'var(--text-on-accent)',
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
    background: 'var(--bg-subtle-hover)',
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
  chartBlock: { ...shimmerBg, width: '100%', height: '220px', borderRadius: '8px' },
};
