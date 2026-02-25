import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Award, Flame, Dumbbell, BarChart3 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const { metrics } = client;
  // Dynamic month labels based on client start date
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = new Date(client.startDate).getMonth();
  const months = metrics.weight.map((_, i) => monthNames[(startMonth + i) % 12]);
  const weights = metrics.weight;

  const weightData = metrics.weight.map((w, i) => ({ month: months[i] || `M${i}`, value: w }));
  const bodyFatData = metrics.bodyFat.map((bf, i) => ({ month: months[i] || `M${i}`, value: bf }));

  // PRs
  const lifts = [
    { name: 'Bench Press', values: metrics.benchPress, unit: 'kg', icon: '🏋️' },
    { name: 'Squat', values: metrics.squat, unit: 'kg', icon: '🦵' },
    { name: 'Deadlift', values: metrics.deadlift, unit: 'kg', icon: '💪' },
  ];

  // Calendar palette — cyan-green & soft coral (on-brand, not generic traffic lights)
  const calDone = '#20dba4';
  const calMiss = '#e8637a';

  // Training calendar (last 4 weeks / this month)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const logByDate = new Map(workoutLogs.map(w => [w.date, w]));

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 28);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7)); // Start on Monday

  interface CalDay {
    date: Date;
    dateStr: string;
    log: WorkoutLog | undefined;
    isCompleted: boolean;
    isMissed: boolean;
    isFuture: boolean;
    isToday: boolean;
  }

  const calWeeks: CalDay[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: CalDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = date.toISOString().split('T')[0];
      const log = logByDate.get(dateStr);
      week.push({
        date,
        dateStr,
        log,
        isCompleted: log?.completed === true,
        isMissed: log?.completed === false,
        isFuture: dateStr > todayStr,
        isToday: dateStr === todayStr,
      });
    }
    calWeeks.push(week);
  }

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedLog = selectedDay ? logByDate.get(selectedDay) : undefined;

  const totalSessions = workoutLogs.filter(w => w.completed).length;
  const totalScheduled = workoutLogs.length;
  const completionRate = totalScheduled > 0 ? Math.round((totalSessions / totalScheduled) * 100) : 0;
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (completionRate / 100) * ringCircumference;

  // ── Goal progress (data-driven from metrics + check-ins) ──
  const parseTarget = (text: string): number | null => {
    const match = text.match(/(\d+(?:\.\d+)?)\s*kg/i) || text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  const goalProgress = client.goals.map(goal => {
    const g = goal.toLowerCase();

    // Weight / body composition goals (contains "kg" or "weight" and references a target)
    if ((g.includes('weight') || g.includes('drop') || g.includes('cut') || g.includes('lean')) && !g.includes('bench') && !g.includes('squat') && !g.includes('dead')) {
      const target = parseTarget(goal) ?? 80;
      const start = weights[0];
      const current = weights[weights.length - 1];
      if (start === target) return { goal, progress: 100, label: `${current}kg → ${target}kg` };
      const pct = Math.min(100, Math.round(((start - current) / (start - target)) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg → ${target}kg` };
    }

    // Bench press goal
    if (g.includes('bench')) {
      const target = parseTarget(goal) ?? 100;
      const current = metrics.benchPress[metrics.benchPress.length - 1];
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg / ${target}kg` };
    }

    // Squat goal
    if (g.includes('squat')) {
      const target = parseTarget(goal) ?? 140;
      const current = metrics.squat[metrics.squat.length - 1];
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg / ${target}kg` };
    }

    // Deadlift goal
    if (g.includes('deadlift') || g.includes('dead lift')) {
      const target = parseTarget(goal) ?? 180;
      const current = metrics.deadlift[metrics.deadlift.length - 1];
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg / ${target}kg` };
    }

    // Sleep goal
    if (g.includes('sleep')) {
      const targetMatch = goal.match(/(\d+(?:\.\d+)?)\s*(?:\+|\s*hour|h)/i);
      const target = targetMatch ? parseFloat(targetMatch[1]) : 7;
      const latestCI = checkIns.filter(ci => ci.sleepHours !== null).sort((a, b) => b.date.localeCompare(a.date))[0];
      const current = latestCI?.sleepHours ?? 0;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}h / ${target}h` };
    }

    // Steps goal
    if (g.includes('step')) {
      const target = parseTarget(goal) ?? 10000;
      const latestCI = checkIns.filter(ci => ci.steps !== null).sort((a, b) => b.date.localeCompare(a.date))[0];
      const current = latestCI?.steps ?? 0;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current.toLocaleString()} / ${target.toLocaleString()} steps` };
    }

    // Cardio / running goal — derive from overall training consistency as proxy
    if (g.includes('5k') || g.includes('run') || g.includes('cardio')) {
      const pct = Math.min(100, Math.round(completionRate * 0.72));
      return { goal, progress: Math.max(0, pct), label: 'Based on training consistency' };
    }

    // Fallback — use overall client progress
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
          {weightData.length >= 2 && (
            <div style={{
              ...styles.trendBadge,
              background: 'var(--accent-success-dim)',
              color: 'var(--accent-success)',
            }}>
              <TrendingDown size={12} />
              {(metrics.weight[0] - metrics.weight[metrics.weight.length - 1]).toFixed(1)}kg
            </div>
          )}
        </div>
        {!chartsReady ? (
          <div style={styles.skeleton} />
        ) : weightData.length >= 2 ? (
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={weightData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={isMobile ? 30 : 35} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
                  formatter={(val) => [`${val} kg`, 'Weight']}
                />
                <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <BarChart3 size={28} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
            <span style={styles.emptyStateText}>Weigh in at your next check-in to start tracking</span>
          </div>
        )}
      </GlassCard>

      {/* Body Fat Chart */}
      <GlassCard delay={0.25}>
        <div style={styles.chartHeader}>
          <div style={styles.chartTitle}>Body Fat %</div>
          {bodyFatData.length >= 2 && (
            <div style={{
              ...styles.trendBadge,
              background: 'var(--accent-success-dim)',
              color: 'var(--accent-success)',
            }}>
              <TrendingDown size={12} />
              {(metrics.bodyFat[0] - metrics.bodyFat[metrics.bodyFat.length - 1]).toFixed(1)}%
            </div>
          )}
        </div>
        {!chartsReady ? (
          <div style={styles.skeleton} />
        ) : bodyFatData.length >= 2 ? (
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={bodyFatData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={isMobile ? 30 : 35} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' }}
                  formatter={(val) => [`${val}%`, 'Body Fat']}
                />
                <Line type="monotone" dataKey="value" stroke="var(--accent-secondary)" strokeWidth={2} dot={{ fill: 'var(--accent-secondary)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <BarChart3 size={28} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
            <span style={styles.emptyStateText}>Body fat data will appear after your first check-ins</span>
          </div>
        )}
      </GlassCard>

      {/* Training Consistency */}
      <GlassCard delay={0.35}>
        <div style={styles.sectionHeader}>
          <Flame size={18} color="var(--accent-warm)" />
          <span style={styles.sectionTitle}>Training Consistency</span>
        </div>

        {workoutLogs.length === 0 ? (
          <div style={styles.emptyState}>
            <Dumbbell size={28} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
            <span style={styles.emptyStateText}>Complete your first workout to start tracking consistency</span>
          </div>
        ) : <>
        {/* Stats row — 3 mini cards */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <Dumbbell size={16} color="var(--accent-primary)" />
            <span style={styles.statValue}>{totalSessions}</span>
            <span style={styles.statLabel}>sessions</span>
          </div>
          <div style={styles.statCard}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ marginTop: '-2px', marginBottom: '-2px' }}>
              <circle cx="22" cy="22" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle
                cx="22" cy="22" r={ringRadius}
                fill="none"
                stroke={completionRate >= 80 ? calDone : completionRate >= 50 ? 'var(--accent-warm)' : calMiss}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 22 22)"
              />
              <text x="22" y="23" textAnchor="middle" dominantBaseline="middle"
                fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                {completionRate}
              </text>
            </svg>
            <span style={styles.statLabel}>completion %</span>
          </div>
          <div style={styles.statCard}>
            <Flame size={16} color="var(--accent-warm)" />
            <span style={styles.statValue}>{client.streak}</span>
            <span style={styles.statLabel}>day streak</span>
          </div>
        </div>

        {/* Calendar — day header */}
        <div style={styles.calGrid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} style={styles.calDayHeader}>{d}</div>
          ))}
        </div>

        {/* Calendar — 4 week rows */}
        {calWeeks.map((week, wi) => (
          <div key={wi} style={styles.calGrid}>
            {week.map(day => {
                const shortType = day.log?.type
                  .replace('Upper Body ', 'Upper ')
                  .replace('Lower Body ', 'Lower ') ?? '';
                return (
                  <div
                    key={day.dateStr}
                    onClick={() => day.log && setSelectedDay(prev => prev === day.dateStr ? null : day.dateStr)}
                    style={{
                      ...styles.calCell,
                      cursor: day.log ? 'pointer' : 'default',
                      ...(day.isToday ? {
                        background: 'rgba(0,229,200,0.08)',
                        border: '1px solid rgba(0,229,200,0.25)',
                        boxShadow: '0 0 8px rgba(0,229,200,0.1)',
                      } : day.isCompleted ? {
                        background: `${calDone}0F`,
                        border: `1px solid ${calDone}1F`,
                      } : day.isMissed ? {
                        background: `${calMiss}0D`,
                        border: `1px solid ${calMiss}1A`,
                      } : day.isFuture ? {
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.02)',
                        opacity: 0.4,
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid transparent',
                      }),
                      ...(selectedDay === day.dateStr ? {
                        boxShadow: '0 0 0 1.5px var(--accent-primary)',
                      } : {}),
                    }}
                  >
                    {/* Status bar */}
                    <div style={{
                      ...styles.calStatusBar,
                      background: day.isCompleted ? calDone
                        : day.isMissed ? calMiss
                        : day.isToday ? 'var(--accent-primary)'
                        : 'transparent',
                    }} />
                    <div style={{
                      ...styles.calDateNum,
                      color: day.isToday ? 'var(--accent-primary)'
                        : day.isCompleted ? calDone
                        : day.isMissed ? calMiss
                        : 'var(--text-secondary)',
                    }}>
                      {day.date.getDate()}
                    </div>
                    {day.log && (
                      <div style={{
                        ...styles.calWorkoutTag,
                        color: day.isCompleted ? calDone : calMiss,
                      }}>
                        {shortType}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}

        {/* Detail panel */}
        <AnimatePresence>
          {selectedDay && selectedLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={styles.dayDetail}>
                <div style={{
                  ...styles.dayDetailBar,
                  background: selectedLog.completed ? calDone : calMiss,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.dayDetailDate}>
                    {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={styles.dayDetailType}>{selectedLog.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.dayDetailDuration}>{selectedLog.duration} min</div>
                  <div style={{
                    ...styles.dayDetailStatus,
                    color: selectedLog.completed ? calDone : calMiss,
                  }}>
                    {selectedLog.completed ? 'Completed' : 'Missed'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div style={styles.calLegend}>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: calDone }} /> Completed</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: calMiss }} /> Missed</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: 'var(--accent-primary)' }} /> Today</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: 'rgba(255,255,255,0.03)' }} /> Rest</span>
        </div>
        </>}
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
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 6px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '4px',
  },
  calDayHeader: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    textAlign: 'center',
    padding: '4px 0',
  },
  calCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: '50px',
    borderRadius: '8px',
    padding: '0 2px 5px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.15s ease',
  },
  calStatusBar: {
    width: '100%',
    height: '2.5px',
    borderRadius: '0 0 1px 1px',
    marginBottom: '4px',
    flexShrink: 0,
  },
  calDateNum: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  calWorkoutTag: {
    fontSize: '8px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '3px',
    lineHeight: 1.2,
  },
  dayDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '10px 14px',
    marginTop: '10px',
  },
  dayDetailBar: {
    width: '3px',
    height: '32px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  dayDetailDate: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  dayDetailType: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: '2px',
  },
  dayDetailDuration: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  dayDetailStatus: {
    fontSize: '11px',
    fontWeight: 600,
    marginTop: '2px',
  },
  calLegend: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '12px',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-tertiary)' },
  legendDot: { width: '8px', height: '8px', borderRadius: '2px', display: 'inline-block' },
  skeleton: {
    width: '100%',
    height: '180px',
    borderRadius: '8px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite ease-in-out',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '32px 16px',
  },
  emptyStateText: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  awardCard: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' },
  awardTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  awardSub: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' },
};
