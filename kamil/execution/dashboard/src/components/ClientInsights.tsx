/**
 * Smart Client Insights — auto-generated analysis of client data.
 *
 * Analyzes: workout adherence, lift trends, body composition, wellness signals,
 * check-in patterns, and streak health. Surfaces actionable insights the coach
 * would otherwise have to dig through raw data to find.
 */
import { motion } from 'framer-motion';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, Flame,
  Moon, Activity, Target, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import GlassCard from './GlassCard';
import type { Client, WorkoutLog, WorkoutSetLog, CheckIn, WorkoutProgram } from '../types';

type InsightSeverity = 'positive' | 'warning' | 'alert' | 'info';

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  severity: InsightSeverity;
  /** 0-100, higher = more important / urgent */
  priority: number;
}

interface ClientInsightsProps {
  client: Client;
  workoutLogs: WorkoutLog[];
  setLogs: WorkoutSetLog[];
  checkIns: CheckIn[];
  program: WorkoutProgram | null;
  t: {
    insightsTitle: string;
    insightsSub: string;
    showMore: string;
    showLess: string;
    noInsights: string;
  };
}

// ── Helpers ──

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function trend(arr: number[]): 'up' | 'down' | 'flat' {
  if (arr.length < 3) return 'flat';
  const recent = arr.slice(-3);
  const older = arr.slice(-6, -3);
  if (older.length === 0) return 'flat';
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const diff = recentAvg - olderAvg;
  if (Math.abs(diff) < 0.5) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

// ── Insight generators ──

function generateInsights(
  client: Client,
  workoutLogs: WorkoutLog[],
  setLogs: WorkoutSetLog[],
  checkIns: CheckIn[],
  program: WorkoutProgram | null,
): Insight[] {
  const insights: Insight[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Filter to this client's data
  const clientLogs = workoutLogs.filter(l => l.clientId === client.id);
  const clientSetLogs = setLogs.filter(l => l.clientId === client.id);
  const clientCheckIns = checkIns
    .filter(c => c.clientId === client.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  // ═══════════════════════════════════════════
  // 1. WORKOUT ADHERENCE
  // ═══════════════════════════════════════════

  // Last 14 days workout frequency
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksStr = twoWeeksAgo.toISOString().split('T')[0];
  // @ts-ignore — scaffolded for upcoming 14-day adherence % insight
  const _recentLogs = clientLogs.filter(l => l.date >= twoWeeksStr && l.completed);

  // Last workout date
  const sortedLogs = [...clientLogs].filter(l => l.completed).sort((a, b) => b.date.localeCompare(a.date));
  const lastWorkoutDate = sortedLogs[0]?.date;

  if (lastWorkoutDate) {
    const daysSinceLast = daysBetween(lastWorkoutDate, today);
    if (daysSinceLast >= 7) {
      insights.push({
        id: 'missed-week',
        icon: <AlertTriangle size={16} />,
        title: `No workouts in ${daysSinceLast} days`,
        detail: `Last session was ${new Date(lastWorkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Consider a check-in message.`,
        severity: 'alert',
        priority: 95,
      });
    } else if (daysSinceLast >= 4) {
      insights.push({
        id: 'gap-warning',
        icon: <Activity size={16} />,
        title: `${daysSinceLast} days since last workout`,
        detail: 'Training gap is widening. A nudge might help maintain momentum.',
        severity: 'warning',
        priority: 70,
      });
    }
  } else if (client.status === 'active') {
    insights.push({
      id: 'no-workouts',
      icon: <AlertTriangle size={16} />,
      title: 'No workouts logged yet',
      detail: 'Client is active but hasn\'t logged any sessions. Make sure they have a program assigned.',
      severity: 'alert',
      priority: 90,
    });
  }

  // Weekly frequency trend (last 4 weeks vs prior 4 weeks)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const recent4w = clientLogs.filter(l => l.completed && l.date >= fourWeeksAgo.toISOString().split('T')[0]).length;
  const prior4w = clientLogs.filter(l => l.completed && l.date >= eightWeeksAgo.toISOString().split('T')[0] && l.date < fourWeeksAgo.toISOString().split('T')[0]).length;

  if (prior4w > 0 && recent4w < prior4w * 0.5) {
    insights.push({
      id: 'freq-drop',
      icon: <TrendingDown size={16} />,
      title: `Training frequency dropped ${Math.round((1 - recent4w / prior4w) * 100)}%`,
      detail: `${recent4w} sessions in last 4 weeks vs ${prior4w} prior. Possible disengagement.`,
      severity: 'warning',
      priority: 80,
    });
  } else if (prior4w > 0 && recent4w > prior4w * 1.3) {
    insights.push({
      id: 'freq-up',
      icon: <TrendingUp size={16} />,
      title: 'Training frequency is up!',
      detail: `${recent4w} sessions in last 4 weeks vs ${prior4w} prior. Great momentum.`,
      severity: 'positive',
      priority: 40,
    });
  }

  // ═══════════════════════════════════════════
  // 2. STREAK HEALTH
  // ═══════════════════════════════════════════

  if (client.streak >= 14) {
    insights.push({
      id: 'streak-fire',
      icon: <Flame size={16} />,
      title: `${client.streak}-day streak — on fire!`,
      detail: 'Exceptional consistency. Consider recognizing this milestone with a message.',
      severity: 'positive',
      priority: 35,
    });
  }

  // ═══════════════════════════════════════════
  // 3. STRENGTH PLATEAUS & PRs
  // ═══════════════════════════════════════════

  // Group set logs by exercise, find stalls and PRs
  const exerciseMap = new Map<string, { name: string; weights: { date: string; weight: number }[] }>();
  for (const log of clientSetLogs.filter(l => l.completed)) {
    const w = parseFloat(log.weight);
    if (isNaN(w) || w <= 0) continue;
    if (!exerciseMap.has(log.exerciseId)) {
      exerciseMap.set(log.exerciseId, { name: log.exerciseName, weights: [] });
    }
    exerciseMap.get(log.exerciseId)!.weights.push({ date: log.date, weight: w });
  }

  for (const [, ex] of exerciseMap) {
    if (ex.weights.length < 6) continue;
    const sorted = [...ex.weights].sort((a, b) => a.date.localeCompare(b.date));
    const last6 = sorted.slice(-6);
    const maxWeight = Math.max(...sorted.map(w => w.weight));
    const recentMax = Math.max(...last6.map(w => w.weight));

    // PR detection — did they hit an all-time max in the last 2 sessions?
    const last2Sessions = sorted.slice(-2);
    if (last2Sessions.some(w => w.weight >= maxWeight) && maxWeight > sorted[0].weight) {
      insights.push({
        id: `pr-${ex.name}`,
        icon: <Zap size={16} />,
        title: `New PR on ${ex.name}: ${maxWeight}kg`,
        detail: `All-time best! Up from ${sorted[0].weight}kg at the start.`,
        severity: 'positive',
        priority: 50,
      });
    }

    // Stall detection — same weight ±1kg for last 6+ sets across 3+ weeks
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const threeWeeksStr = threeWeeksAgo.toISOString().split('T')[0];
    const recentSets = sorted.filter(w => w.date >= threeWeeksStr);
    if (recentSets.length >= 4) {
      const range = Math.max(...recentSets.map(w => w.weight)) - Math.min(...recentSets.map(w => w.weight));
      if (range <= 1 && recentMax < maxWeight * 0.98) {
        // Stalled but not at PR
        insights.push({
          id: `stall-${ex.name}`,
          icon: <Target size={16} />,
          title: `${ex.name} has plateaued at ${recentMax}kg`,
          detail: `Same weight for 3+ weeks. Consider a deload or progression scheme change.`,
          severity: 'warning',
          priority: 65,
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // 4. BODY COMPOSITION TRENDS
  // ═══════════════════════════════════════════

  const weights = client.metrics.weight;
  if (weights.length >= 3) {
    const weightTrend = trend(weights);
    const recentChange = weights[weights.length - 1] - weights[weights.length - 3];

    // Check if weight trend aligns with goals
    const goalsLower = client.goals.map(g => g.toLowerCase()).join(' ');
    const wantsWeightLoss = goalsLower.includes('lose') || goalsLower.includes('cut') || goalsLower.includes('drop') || goalsLower.includes('lean');
    const wantsMuscle = goalsLower.includes('muscle') || goalsLower.includes('bulk') || goalsLower.includes('gain');

    if (wantsWeightLoss && weightTrend === 'up' && recentChange > 1) {
      insights.push({
        id: 'weight-against-goal',
        icon: <AlertTriangle size={16} />,
        title: `Weight trending up (+${recentChange.toFixed(1)}kg) against fat loss goal`,
        detail: 'Review nutrition compliance and training volume. May need calorie adjustment.',
        severity: 'warning',
        priority: 75,
      });
    } else if (wantsWeightLoss && weightTrend === 'down') {
      insights.push({
        id: 'weight-on-track',
        icon: <TrendingDown size={16} />,
        title: `Weight dropping — on track for fat loss goal`,
        detail: `Down ${Math.abs(recentChange).toFixed(1)}kg recently. Good trajectory.`,
        severity: 'positive',
        priority: 30,
      });
    } else if (wantsMuscle && weightTrend === 'down' && recentChange < -1) {
      insights.push({
        id: 'weight-losing-bulk',
        icon: <AlertTriangle size={16} />,
        title: `Weight dropping during muscle-building phase`,
        detail: `Down ${Math.abs(recentChange).toFixed(1)}kg. May need to increase caloric intake.`,
        severity: 'warning',
        priority: 70,
      });
    }
  }

  // ═══════════════════════════════════════════
  // 5. WELLNESS SIGNALS (from check-ins)
  // ═══════════════════════════════════════════

  const recentCheckIns = clientCheckIns.slice(-4);
  if (recentCheckIns.length >= 2) {
    // Sleep deterioration
    const sleepValues = recentCheckIns.map(c => c.sleepHours).filter((s): s is number => s != null && s > 0);
    if (sleepValues.length >= 2) {
      const recentSleep = avg(sleepValues.slice(-2));
      if (recentSleep < 6) {
        insights.push({
          id: 'sleep-low',
          icon: <Moon size={16} />,
          title: `Sleep averaging ${recentSleep.toFixed(1)} hours`,
          detail: 'Sub-6hr sleep tanks recovery and training performance. Worth addressing.',
          severity: 'alert',
          priority: 85,
        });
      }
    }

    // Stress/energy pattern
    const stressValues = recentCheckIns.map(c => c.stress).filter((s): s is number => s != null && s > 0);
    const energyValues = recentCheckIns.map(c => c.energy).filter((s): s is number => s != null && s > 0);

    if (stressValues.length >= 2 && avg(stressValues.slice(-2)) >= 8) {
      insights.push({
        id: 'stress-high',
        icon: <AlertTriangle size={16} />,
        title: `Stress levels consistently high (${avg(stressValues.slice(-2)).toFixed(0)}/10)`,
        detail: 'High stress impacts recovery and adherence. Consider adjusting training intensity.',
        severity: 'warning',
        priority: 72,
      });
    }

    if (energyValues.length >= 2 && avg(energyValues.slice(-2)) <= 3) {
      insights.push({
        id: 'energy-low',
        icon: <Zap size={16} />,
        title: `Energy levels critically low (${avg(energyValues.slice(-2)).toFixed(0)}/10)`,
        detail: 'Low energy + training = injury risk. Check sleep, nutrition, and training load.',
        severity: 'alert',
        priority: 82,
      });
    }

    // Mood trend
    const moodValues = recentCheckIns.map(c => c.mood).filter(m => m != null && m > 0) as number[];
    if (moodValues.length >= 3 && moodValues.slice(-2).every(m => m <= 2)) {
      insights.push({
        id: 'mood-drop',
        icon: <Activity size={16} />,
        title: 'Mood has been low in recent check-ins',
        detail: 'Consecutive low mood scores. A supportive message could make a big difference.',
        severity: 'warning',
        priority: 68,
      });
    }
  }

  // ═══════════════════════════════════════════
  // 6. CHECK-IN COMPLIANCE
  // ═══════════════════════════════════════════

  if (clientCheckIns.length > 0) {
    const lastCheckIn = clientCheckIns[clientCheckIns.length - 1];
    const daysSinceCheckIn = daysBetween(lastCheckIn.date, today);
    if (daysSinceCheckIn > 10) {
      insights.push({
        id: 'checkin-overdue',
        icon: <AlertTriangle size={16} />,
        title: `No check-in in ${daysSinceCheckIn} days`,
        detail: 'Check-in overdue. Send a reminder to maintain accountability.',
        severity: 'warning',
        priority: 73,
      });
    }
  } else if (client.status === 'active') {
    insights.push({
      id: 'no-checkins',
      icon: <AlertTriangle size={16} />,
      title: 'No check-ins submitted yet',
      detail: 'Client hasn\'t submitted any check-ins. Remind them about the weekly check-in flow.',
      severity: 'info',
      priority: 55,
    });
  }

  // ═══════════════════════════════════════════
  // 7. PROGRAM ASSIGNMENT
  // ═══════════════════════════════════════════

  if (!program && client.status === 'active') {
    insights.push({
      id: 'no-program',
      icon: <Target size={16} />,
      title: 'No active program assigned',
      detail: 'Client is active but has no workout program. Assign one to start tracking progress.',
      severity: 'alert',
      priority: 88,
    });
  }

  // Sort by priority (highest first)
  return insights.sort((a, b) => b.priority - a.priority);
}

// ── Severity colors ──

const severityColors: Record<InsightSeverity, { color: string; bg: string; border: string }> = {
  positive: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  alert: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
};

// ── Component ──

export default function ClientInsights({ client, workoutLogs, setLogs, checkIns, program, t }: ClientInsightsProps) {
  const [expanded, setExpanded] = useState(false);
  const insights = generateInsights(client, workoutLogs, setLogs, checkIns, program);

  if (insights.length === 0) {
    return null; // Don't render empty card
  }

  const alertCount = insights.filter(i => i.severity === 'alert').length;
  const warnCount = insights.filter(i => i.severity === 'warning').length;
  const visibleInsights = expanded ? insights : insights.slice(0, 4);
  const hasMore = insights.length > 4;

  return (
    <GlassCard delay={0.27}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <div style={styles.iconWrap}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={styles.title}>{t.insightsTitle}</h3>
            <p style={styles.sub}>{t.insightsSub}</p>
          </div>
        </div>
        {/* Summary badges */}
        <div style={styles.badges}>
          {alertCount > 0 && (
            <span style={{ ...styles.badge, color: severityColors.alert.color, background: severityColors.alert.bg, borderColor: severityColors.alert.border }}>
              {alertCount} alert{alertCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ ...styles.badge, color: severityColors.warning.color, background: severityColors.warning.bg, borderColor: severityColors.warning.border }}>
              {warnCount} warning{warnCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Insight items */}
      <div style={styles.list}>
        {visibleInsights.map((insight, idx) => {
          const colors = severityColors[insight.severity];
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              style={{
                ...styles.item,
                borderLeftColor: colors.border,
              }}
            >
              <div style={{ ...styles.itemIcon, color: colors.color, background: colors.bg }}>
                {insight.icon}
              </div>
              <div style={styles.itemContent}>
                <div style={styles.itemTitle}>{insight.title}</div>
                <div style={styles.itemDetail}>{insight.detail}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Show more/less toggle */}
      {hasMore && (
        <button style={styles.toggleBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? t.showLess : t.showMore}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </GlassCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  sub: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
  badges: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  badge: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    padding: '3px 10px',
    borderRadius: '20px',
    border: '1px solid',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderLeft: '3px solid',
    transition: 'background 0.15s',
  },
  itemIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  itemDetail: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginTop: '3px',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    width: '100%',
    padding: '10px 0 2px',
    marginTop: '10px',
    border: 'none',
    borderTop: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
};
