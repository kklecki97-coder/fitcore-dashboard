import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,

  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CalendarCheck,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  FileBarChart,
} from 'lucide-react';

import GlassCard from './GlassCard';
import ActivityFeed from './ActivityFeed';
import AnimatedNumber from './AnimatedNumber';
import SmartCoachWidget from './SmartCoachWidget';

import useIsMobile from '../hooks/useIsMobile';
import { useAIBriefing } from '../hooks/useAIBriefing';
import { useLang } from '../i18n';
import { formatCurrency, getLocale } from '../lib/locale';
import { computeRevenueChartData, calculateRevenueChange } from '../utils/analytics';
import { filterAtRiskClients } from '../utils/client-analysis';
import { getDailyQuote } from '../utils/formatting';
import { computeWeeklyReport } from '../utils/weekly-report';
import WeeklyReport from './WeeklyReport';
import type { Client, Message, WorkoutProgram, Invoice, WorkoutLog, WorkoutSetLog, CheckIn } from '../types';

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
  workoutSetLogs: WorkoutSetLog[];
  onViewClient: (id: string) => void;
  onNavigate: (page: 'messages' | 'clients' | 'check-ins') => void;
  onSendMessage: (msg: Message) => void;
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  profileName?: string;
}

function getTimeGreeting(t: { overview: { greetingMorning: (n: string) => string; greetingAfternoon: (n: string) => string; greetingEvening: (n: string) => string; greetingNight: (n: string) => string } }, name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t.overview.greetingMorning(name);
  if (hour >= 12 && hour < 18) return t.overview.greetingAfternoon(name);
  if (hour >= 18 && hour < 22) return t.overview.greetingEvening(name);
  return t.overview.greetingNight(name);
}

export default function OverviewPage({ clients, messages, programs, invoices, workoutLogs, checkIns, workoutSetLogs, onViewClient, onNavigate, onSendMessage, onUpdateCheckIn, profileName }: OverviewPageProps) {
  const isMobile = useIsMobile();
  const { t, lang } = useLang();
  const { briefing, loading: briefingLoading, refresh: refreshBriefing } = useAIBriefing(clients, invoices, workoutLogs, checkIns, messages, programs, lang);
  const [ready, setReady] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // messagesExpanded removed — Recent Messages replaced by ActivityFeed
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
  // Revenue from actual paid invoices this month (consistent with Analytics page)
  const locale = getLocale(lang);
  const currentPeriod = new Date().toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.period.toLowerCase() === currentPeriod.toLowerCase())
    .reduce((sum, inv) => sum + inv.amount, 0);
  // unreadMessages removed — Recent Messages replaced by ActivityFeed

  // Compute revenue chart from real invoices
  const revenueData = useMemo(() => computeRevenueChartData(invoices), [invoices]);

  const lastMonth = revenueData[revenueData.length - 1];
  const prevMonth = revenueData[revenueData.length - 2];
  const revenueChange = calculateRevenueChange(lastMonth.revenue, prevMonth?.revenue ?? 0);

  // At-risk count (used in stat card)
  const atRiskClients = filterAtRiskClients(clients, workoutLogs);
  // Pending check-ins: check-ins that coach hasn't reviewed yet
  const pendingCheckInsList = checkIns.filter(ci => ci.reviewStatus === 'pending');


  // Daily quote - rotate by day of year
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyQuote = useMemo(() => getDailyQuote(t.overview.quotes, QUOTE_AUTHORS), [new Date().toDateString(), t]);

  // AI briefing fallback stats (when no API key or error)
  const fallbackStats = useMemo(() => [
    `${clients.filter(c => c.status === 'active').length} ${lang === 'pl' ? 'aktywnych klientow' : 'active clients'}, ${clients.filter(c => c.status === 'paused').length} ${lang === 'pl' ? 'wstrzymanych' : 'paused'}`,
    `${lang === 'pl' ? 'Przychod w tym miesiacu' : 'Revenue this month'}: ${totalRevenue} ${lang === 'pl' ? 'zl' : '$'}`,
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
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
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
        style={{ ...styles.quoteBar, ...(isMobile ? { padding: '8px 14px' } : {}) }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: greeting ? 0.15 : 0 }}
      >
        <span style={{ ...styles.quoteText, ...(isMobile ? { fontSize: '12px' } : {}) }}>"{dailyQuote.text}"</span>
        <span style={{ ...styles.quoteAuthor, ...(isMobile ? { fontSize: '11px' } : {}) }}> - {dailyQuote.author}</span>
      </motion.div>

      {/* Stat Cards Row */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '16px' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} delay={i * 0.05} hover style={isMobile ? { padding: '14px 16px' } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '0', ...(isMobile ? {} : { flexDirection: 'column' as const }) }}>
                {isMobile ? (
                  <>
                    {/* Mobile: compact horizontal layout */}
                    <div style={{
                      ...styles.statIcon,
                      background: stat.dimColor,
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      flexShrink: 0,
                    }}>
                      <Icon size={16} color={stat.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                          <AnimatedNumber value={stat.numericValue} format={stat.format} />
                        </span>
                        {stat.trend !== 'neutral' && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: stat.trend === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1px',
                          }}>
                            {stat.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {stat.change}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.2 }}>
                        {stat.label}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Desktop: original vertical layout */}
                    <div style={{ width: '100%' }}>
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
                      <div style={{ ...styles.statValue, fontSize: '28px' }}>
                        <AnimatedNumber value={stat.numericValue} format={stat.format} />
                      </div>
                      <div style={styles.statLabel}>{stat.label}</div>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Smart Coach Widget */}
      <SmartCoachWidget
        clients={clients}
        messages={messages}
        checkIns={checkIns}
        invoices={invoices}
        workoutLogs={workoutLogs}
        programs={programs}
        onSendMessage={onSendMessage}
        onUpdateCheckIn={onUpdateCheckIn}
        lang={lang as 'en' | 'pl'}
        isMobile={isMobile}
      />

      {/* AI Dashboard Summary */}
      <GlassCard delay={0.15} style={isMobile ? { padding: '16px' } : undefined}>
        <div style={styles.cardHeader}>
          <div style={styles.insightTitleRow}>
            <Sparkles size={isMobile ? 13 : 15} color="var(--accent-primary)" />
            <h3 style={{ ...styles.cardTitle, fontSize: isMobile ? '15px' : '21px' }}>{t.overview.dashboardSummary}</h3>
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
                fontSize: isMobile ? '14px' : '18px', color: 'var(--text-primary)', lineHeight: 1.7,
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

      {/* Activity Feed — mobile only: right after Dashboard Summary */}
      {isMobile && (
        <ActivityFeed
          clients={clients}
          messages={messages}
          checkIns={checkIns}
          workoutLogs={workoutLogs}
          workoutSetLogs={workoutSetLogs}
          invoices={invoices}
          onViewClient={onViewClient}
          onNavigate={onNavigate}
          isMobile={isMobile}
        />
      )}

      {/* Activity Feed — desktop only */}
      {!isMobile && (
        <ActivityFeed
          clients={clients}
          messages={messages}
          checkIns={checkIns}
          workoutLogs={workoutLogs}
          workoutSetLogs={workoutSetLogs}
          invoices={invoices}
          onViewClient={onViewClient}
          onNavigate={onNavigate}
          isMobile={isMobile}
        />
      )}

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
