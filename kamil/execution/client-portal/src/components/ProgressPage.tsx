import { TrendingUp, TrendingDown, Target, Award, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutLog, CheckIn } from '../types';

interface ProgressPageProps {
  client: Client;
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
}

export default function ProgressPage({ client, workoutLogs, checkIns }: ProgressPageProps) {
  const isMobile = useIsMobile();
  const { metrics } = client;
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const weights = metrics.weight;

  const weightData = metrics.weight.map((w, i) => ({ month: months[i] || `M${i}`, value: w }));
  const bodyFatData = metrics.bodyFat.map((bf, i) => ({ month: months[i] || `M${i}`, value: bf }));

  // PRs
  const lifts = [
    { name: 'Bench Press', values: metrics.benchPress, unit: 'kg', icon: '🏋️' },
    { name: 'Squat', values: metrics.squat, unit: 'kg', icon: '🦵' },
    { name: 'Deadlift', values: metrics.deadlift, unit: 'kg', icon: '💪' },
  ];

  // Training heatmap (last 8 weeks)
  const today = new Date();
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const logDates = new Set(workoutLogs.filter(w => w.completed).map(w => w.date));
  const missedDates = new Set(workoutLogs.filter(w => !w.completed).map(w => w.date));

  const heatmapWeeks: { date: Date; dateStr: string }[][] = [];
  const startDate = new Date(eightWeeksAgo);
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start on Monday

  for (let w = 0; w < 8; w++) {
    const week: { date: Date; dateStr: string }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      week.push({ date, dateStr: date.toISOString().split('T')[0] });
    }
    heatmapWeeks.push(week);
  }

  const totalSessions = workoutLogs.filter(w => w.completed).length;
  const totalScheduled = workoutLogs.length;
  const completionRate = totalScheduled > 0 ? Math.round((totalSessions / totalScheduled) * 100) : 0;

  // ── Goal progress (parse from goal strings) ──
  const goalProgress = client.goals.map(goal => {
    if (goal.toLowerCase().includes('80kg') || goal.toLowerCase().includes('weight')) {
      const start = weights[0];
      const current = weights[weights.length - 1];
      const target = 80;
      const pct = Math.min(100, Math.round(((start - current) / (start - target)) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg → ${target}kg` };
    }
    if (goal.toLowerCase().includes('bench') && goal.toLowerCase().includes('100')) {
      const presses = metrics.benchPress;
      const current = presses[presses.length - 1];
      const target = 100;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg / ${target}kg` };
    }
    if (goal.toLowerCase().includes('sleep')) {
      const latestCI = checkIns.filter(ci => ci.sleepHours !== null).sort((a, b) => b.date.localeCompare(a.date))[0];
      const current = latestCI?.sleepHours ?? 0;
      const target = 7;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}h / ${target}h` };
    }
    if (goal.toLowerCase().includes('5k') || goal.toLowerCase().includes('run')) {
      const pct = 65;
      return { goal, progress: pct, label: '~27 min / 25 min' };
    }
    return { goal, progress: Math.round(client.progress * 0.7), label: 'In progress' };
  });

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 12px 80px' : '24px 24px 80px' }}>
      <h2 style={styles.title}>Your Progress</h2>

      {/* Goals — top priority */}
      <GlassCard delay={0.05}>
        <div style={styles.sectionHeader}>
          <Target size={18} color="var(--accent-primary)" />
          <span style={styles.sectionTitle}>Goals</span>
          <span style={styles.goalCount}>{goalProgress.filter(g => g.progress >= 100).length}/{goalProgress.length}</span>
        </div>
        <div style={styles.goalProgressList}>
          {goalProgress.map((g, i) => (
            <div key={i} style={styles.goalProgressItem}>
              <div style={styles.goalProgressTop}>
                <div style={styles.goalProgressName}>{g.goal}</div>
                <div style={{
                  ...styles.goalProgressPct,
                  color: g.progress >= 90 ? 'var(--accent-success)' : g.progress >= 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
                }}>{g.progress}%</div>
              </div>
              <div style={styles.goalProgressBarBg}>
                <div style={{
                  ...styles.goalProgressBarFill,
                  width: `${g.progress}%`,
                  background: g.progress >= 90 ? 'var(--accent-success)' : g.progress >= 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
                }} />
              </div>
              <div style={styles.goalProgressLabel}>{g.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Lift PRs */}
      <div style={{ ...styles.prRow, gap: isMobile ? '8px' : '10px' }}>
        {lifts.map((lift, i) => {
          const current = lift.values[lift.values.length - 1];
          const prev = lift.values[lift.values.length - 2];
          const diff = current - prev;
          return (
            <GlassCard key={lift.name} delay={0.05 + i * 0.05} style={{ ...styles.prCard, padding: isMobile ? '12px 8px' : '16px' }}>
              <div style={styles.prEmoji}>{lift.icon}</div>
              <div style={styles.prName}>{lift.name}</div>
              <div style={styles.prValue}>{current}<span style={styles.prUnit}>{lift.unit}</span></div>
              <div style={{
                ...styles.prDiff,
                color: diff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
              }}>
                {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Weight Chart */}
      <GlassCard delay={0.2}>
        <div style={styles.chartHeader}>
          <div style={styles.chartTitle}>Weight</div>
          <div style={{
            ...styles.trendBadge,
            background: 'var(--accent-success-dim)',
            color: 'var(--accent-success)',
          }}>
            <TrendingDown size={12} />
            {(metrics.weight[0] - metrics.weight[metrics.weight.length - 1]).toFixed(1)}kg
          </div>
        </div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={weightData}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={isMobile ? 30 : 35} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
                formatter={(val: number) => [`${val} kg`, 'Weight']}
              />
              <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Body Fat Chart */}
      <GlassCard delay={0.25}>
        <div style={styles.chartHeader}>
          <div style={styles.chartTitle}>Body Fat %</div>
          <div style={{
            ...styles.trendBadge,
            background: 'var(--accent-success-dim)',
            color: 'var(--accent-success)',
          }}>
            <TrendingDown size={12} />
            {(metrics.bodyFat[0] - metrics.bodyFat[metrics.bodyFat.length - 1]).toFixed(1)}%
          </div>
        </div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={bodyFatData}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={isMobile ? 30 : 35} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
                formatter={(val: number) => [`${val}%`, 'Body Fat']}
              />
              <Line type="monotone" dataKey="value" stroke="var(--accent-secondary)" strokeWidth={2} dot={{ fill: 'var(--accent-secondary)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Training Consistency */}
      <GlassCard delay={0.35}>
        <div style={styles.sectionHeader}>
          <Flame size={18} color="var(--accent-warm)" />
          <span style={styles.sectionTitle}>Training Consistency</span>
        </div>
        <div style={styles.consistencyStats}>
          <div style={styles.consistencyStat}>
            <span style={styles.consistencyValue}>{totalSessions}</span>
            <span style={styles.consistencyLabel}>sessions</span>
          </div>
          <div style={styles.consistencyStat}>
            <span style={styles.consistencyValue}>{completionRate}%</span>
            <span style={styles.consistencyLabel}>completion</span>
          </div>
          <div style={styles.consistencyStat}>
            <span style={styles.consistencyValue}>{client.streak}</span>
            <span style={styles.consistencyLabel}>day streak</span>
          </div>
        </div>

        {/* Heatmap */}
        <div style={styles.heatmap}>
          <div style={styles.heatmapDayLabels}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} style={styles.heatmapDayLabel}>{d}</span>
            ))}
          </div>
          <div style={styles.heatmapGrid}>
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} style={styles.heatmapWeek}>
                {week.map((day) => {
                  const isFuture = day.date > today;
                  const isCompleted = logDates.has(day.dateStr);
                  const isMissed = missedDates.has(day.dateStr);
                  return (
                    <div
                      key={day.dateStr}
                      title={day.dateStr}
                      style={{
                        ...styles.heatmapCell,
                        background: isFuture
                          ? 'transparent'
                          : isCompleted
                          ? 'var(--accent-primary-glow)'
                          : isMissed
                          ? 'var(--accent-danger-dim)'
                          : 'rgba(255,255,255,0.04)',
                        border: isFuture ? '1px solid rgba(255,255,255,0.02)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={styles.heatmapLegend}>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: 'var(--accent-primary-glow)' }} /> Trained</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: 'var(--accent-danger-dim)' }} /> Missed</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: 'rgba(255,255,255,0.04)' }} /> Rest</span>
        </div>
      </GlassCard>

      {/* Award */}
      <GlassCard delay={0.4} style={styles.awardCard}>
        <Award size={24} color="var(--accent-warm)" />
        <div>
          <div style={styles.awardTitle}>Keep it up!</div>
          <div style={styles.awardSub}>You've been training for {Math.round((today.getTime() - new Date(client.startDate).getTime()) / 86400000)} days</div>
        </div>
      </GlassCard>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: '100%',
    paddingBottom: '80px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  chartTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  trendBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '8px',
  },
  prRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  prCard: {
    padding: '16px',
    textAlign: 'center',
  },
  prEmoji: { fontSize: '20px', marginBottom: '6px' },
  prName: { fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  prValue: { fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '4px' },
  prUnit: { fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' },
  prDiff: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, marginTop: '4px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  goalCount: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: 'auto',
  },
  goalProgressList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  goalProgressItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  goalProgressTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  goalProgressName: { fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 },
  goalProgressPct: { fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0 },
  goalProgressBarBg: { height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  goalProgressBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.8s ease' },
  goalProgressLabel: { fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' },
  consistencyStats: { display: 'flex', justifyContent: 'space-around', marginBottom: '16px' },
  consistencyStat: { textAlign: 'center' },
  consistencyValue: { display: 'block', fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  consistencyLabel: { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 },
  heatmap: { marginBottom: '8px' },
  heatmapDayLabels: { display: 'flex', gap: '4px', marginBottom: '4px', paddingLeft: '0' },
  heatmapDayLabel: { width: '14px', height: '14px', fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'center', fontWeight: 600 },
  heatmapGrid: { display: 'flex', flexDirection: 'column', gap: '3px' },
  heatmapWeek: { display: 'flex', gap: '4px' },
  heatmapCell: { width: '14px', height: '14px', borderRadius: '3px' },
  heatmapLegend: { display: 'flex', gap: '14px', marginTop: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-tertiary)' },
  legendDot: { width: '8px', height: '8px', borderRadius: '2px', display: 'inline-block' },
  awardCard: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' },
  awardTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  awardSub: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' },
};
