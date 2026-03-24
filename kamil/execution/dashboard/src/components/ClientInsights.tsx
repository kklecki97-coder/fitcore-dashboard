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
  lang: string;
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
  pl: boolean,
): Insight[] {
  const insights: Insight[] = [];
  const today = new Date().toISOString().split('T')[0];
  const dateLocale = pl ? 'pl-PL' : 'en-US';

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
      const formattedDate = new Date(lastWorkoutDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      insights.push({
        id: 'missed-week',
        icon: <AlertTriangle size={16} />,
        title: pl
          ? `Brak treningów od ${daysSinceLast} dni`
          : `No workouts in ${daysSinceLast} days`,
        detail: pl
          ? `Ostatnia sesja: ${formattedDate}. Rozważ wysłanie wiadomości.`
          : `Last session was ${formattedDate}. Consider a check-in message.`,
        severity: 'alert',
        priority: 95,
      });
    } else if (daysSinceLast >= 4) {
      insights.push({
        id: 'gap-warning',
        icon: <Activity size={16} />,
        title: pl
          ? `${daysSinceLast} dni od ostatniego treningu`
          : `${daysSinceLast} days since last workout`,
        detail: pl
          ? 'Przerwa w treningach się wydłuża. Przypomnienie może pomóc utrzymać tempo.'
          : 'Training gap is widening. A nudge might help maintain momentum.',
        severity: 'warning',
        priority: 70,
      });
    }
  } else if (client.status === 'active') {
    insights.push({
      id: 'no-workouts',
      icon: <AlertTriangle size={16} />,
      title: pl ? 'Brak zarejestrowanych treningów' : 'No workouts logged yet',
      detail: pl
        ? 'Klient jest aktywny, ale nie zalogował żadnych sesji. Upewnij się, że ma przypisany program.'
        : 'Client is active but hasn\'t logged any sessions. Make sure they have a program assigned.',
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
    const dropPct = Math.round((1 - recent4w / prior4w) * 100);
    insights.push({
      id: 'freq-drop',
      icon: <TrendingDown size={16} />,
      title: pl
        ? `Częstotliwość treningów spadła o ${dropPct}%`
        : `Training frequency dropped ${dropPct}%`,
      detail: pl
        ? `${recent4w} sesji w ostatnich 4 tyg. vs ${prior4w} wcześniej. Możliwe zniechęcenie.`
        : `${recent4w} sessions in last 4 weeks vs ${prior4w} prior. Possible disengagement.`,
      severity: 'warning',
      priority: 80,
    });
  } else if (prior4w > 0 && recent4w > prior4w * 1.3) {
    insights.push({
      id: 'freq-up',
      icon: <TrendingUp size={16} />,
      title: pl ? 'Częstotliwość treningów wzrosła!' : 'Training frequency is up!',
      detail: pl
        ? `${recent4w} sesji w ostatnich 4 tyg. vs ${prior4w} wcześniej. Świetne tempo.`
        : `${recent4w} sessions in last 4 weeks vs ${prior4w} prior. Great momentum.`,
      severity: 'positive',
      priority: 40,
    });
  }

  // ═══════════════════════════════════════════
  // 2. STREAK HEALTH
  // ═══════════════════════════════════════════

  if (client.streak >= 7) {
    insights.push({
      id: 'streak-fire',
      icon: <Flame size={16} />,
      title: pl
        ? `Seria ${client.streak} dni${client.streak >= 14 ? ' — petarda!' : ''}`
        : `${client.streak}-day streak${client.streak >= 14 ? ' — on fire!' : ''}`,
      detail: pl
        ? (client.streak >= 14
          ? 'Wyjątkowa regularność. Rozważ docenienie tego kamienia milowego wiadomością.'
          : 'Dobre tempo się buduje. Kontynuuj motywowanie.')
        : (client.streak >= 14
          ? 'Exceptional consistency. Consider recognizing this milestone with a message.'
          : 'Good momentum building. Keep encouraging them.'),
      severity: 'positive',
      priority: client.streak >= 14 ? 35 : 25,
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
        title: pl
          ? `Nowy rekord w ${ex.name}: ${maxWeight}kg`
          : `New PR on ${ex.name}: ${maxWeight}kg`,
        detail: pl
          ? `Rekord wszech czasów! Wzrost z ${sorted[0].weight}kg na początku.`
          : `All-time best! Up from ${sorted[0].weight}kg at the start.`,
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
          title: pl
            ? `${ex.name} — plateau na ${recentMax}kg`
            : `${ex.name} has plateaued at ${recentMax}kg`,
          detail: pl
            ? 'Ten sam ciężar od 3+ tygodni. Rozważ deload lub zmianę schematu progresji.'
            : 'Same weight for 3+ weeks. Consider a deload or progression scheme change.',
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
        title: pl
          ? `Waga rośnie (+${recentChange.toFixed(1)}kg) wbrew celowi redukcji`
          : `Weight trending up (+${recentChange.toFixed(1)}kg) against fat loss goal`,
        detail: pl
          ? 'Sprawdź zgodność z dietą i objętość treningową. Może być potrzebna korekta kalorii.'
          : 'Review nutrition compliance and training volume. May need calorie adjustment.',
        severity: 'warning',
        priority: 75,
      });
    } else if (wantsWeightLoss && weightTrend === 'down') {
      insights.push({
        id: 'weight-on-track',
        icon: <TrendingDown size={16} />,
        title: pl
          ? 'Waga spada — cel redukcji na dobrej drodze'
          : 'Weight dropping — on track for fat loss goal',
        detail: pl
          ? `Spadek o ${Math.abs(recentChange).toFixed(1)}kg ostatnio. Dobra trajektoria.`
          : `Down ${Math.abs(recentChange).toFixed(1)}kg recently. Good trajectory.`,
        severity: 'positive',
        priority: 30,
      });
    } else if (wantsMuscle && weightTrend === 'down' && recentChange < -1) {
      insights.push({
        id: 'weight-losing-bulk',
        icon: <AlertTriangle size={16} />,
        title: pl
          ? 'Waga spada w fazie budowy masy'
          : 'Weight dropping during muscle-building phase',
        detail: pl
          ? `Spadek o ${Math.abs(recentChange).toFixed(1)}kg. Może być potrzebne zwiększenie kalorii.`
          : `Down ${Math.abs(recentChange).toFixed(1)}kg. May need to increase caloric intake.`,
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
          title: pl
            ? `Sen średnio ${recentSleep.toFixed(1)} godzin`
            : `Sleep averaging ${recentSleep.toFixed(1)} hours`,
          detail: pl
            ? 'Poniżej 6h snu niszczy regenerację i wydajność treningową. Warto się tym zająć.'
            : 'Sub-6hr sleep tanks recovery and training performance. Worth addressing.',
          severity: 'alert',
          priority: 85,
        });
      }
    }

    // Stress/energy pattern
    const stressValues = recentCheckIns.map(c => c.stress).filter((s): s is number => s != null && s > 0);
    const energyValues = recentCheckIns.map(c => c.energy).filter((s): s is number => s != null && s > 0);

    if (stressValues.length >= 2 && avg(stressValues.slice(-2)) >= 8) {
      const stressAvg = avg(stressValues.slice(-2)).toFixed(0);
      insights.push({
        id: 'stress-high',
        icon: <AlertTriangle size={16} />,
        title: pl
          ? `Poziom stresu stale wysoki (${stressAvg}/10)`
          : `Stress levels consistently high (${stressAvg}/10)`,
        detail: pl
          ? 'Wysoki stres wpływa na regenerację i motywację. Rozważ zmniejszenie intensywności treningów.'
          : 'High stress impacts recovery and adherence. Consider adjusting training intensity.',
        severity: 'warning',
        priority: 72,
      });
    }

    if (energyValues.length >= 2 && avg(energyValues.slice(-2)) <= 3) {
      const energyAvg = avg(energyValues.slice(-2)).toFixed(0);
      insights.push({
        id: 'energy-low',
        icon: <Zap size={16} />,
        title: pl
          ? `Poziom energii krytycznie niski (${energyAvg}/10)`
          : `Energy levels critically low (${energyAvg}/10)`,
        detail: pl
          ? 'Niska energia + trening = ryzyko kontuzji. Sprawdź sen, dietę i obciążenie treningowe.'
          : 'Low energy + training = injury risk. Check sleep, nutrition, and training load.',
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
        title: pl
          ? 'Nastrój obniżony w ostatnich check-inach'
          : 'Mood has been low in recent check-ins',
        detail: pl
          ? 'Kolejne niskie oceny nastroju. Wspierająca wiadomość może wiele zmienić.'
          : 'Consecutive low mood scores. A supportive message could make a big difference.',
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
    if (daysSinceCheckIn > 7) {
      insights.push({
        id: 'checkin-overdue',
        icon: <AlertTriangle size={16} />,
        title: pl
          ? `Brak check-inu od ${daysSinceCheckIn} dni`
          : `No check-in in ${daysSinceCheckIn} days`,
        detail: pl
          ? 'Check-in zaległy. Wyślij przypomnienie, żeby utrzymać odpowiedzialność.'
          : 'Check-in overdue. Send a reminder to maintain accountability.',
        severity: daysSinceCheckIn > 14 ? 'alert' : 'warning',
        priority: daysSinceCheckIn > 14 ? 85 : 73,
      });
    }
  } else if (client.status === 'active') {
    insights.push({
      id: 'no-checkins',
      icon: <AlertTriangle size={16} />,
      title: pl ? 'Brak przesłanych check-inów' : 'No check-ins submitted yet',
      detail: pl
        ? 'Klient nie przesłał jeszcze żadnych check-inów. Przypomnij o cotygodniowym check-inie.'
        : 'Client hasn\'t submitted any check-ins. Remind them about the weekly check-in flow.',
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
      title: pl ? 'Brak przypisanego programu' : 'No active program assigned',
      detail: pl
        ? 'Klient jest aktywny, ale nie ma programu treningowego. Przypisz program, aby śledzić postępy.'
        : 'Client is active but has no workout program. Assign one to start tracking progress.',
      severity: 'alert',
      priority: 88,
    });
  }

  // ═══════════════════════════════════════════
  // 8. ALWAYS-ON SUMMARY INSIGHTS
  // These ensure the card always shows useful info
  // ═══════════════════════════════════════════

  // Training volume summary (always show if any workouts exist)
  if (clientLogs.length > 0) {
    const totalSessions = clientLogs.filter(l => l.completed).length;
    const daysSinceStart = client.startDate ? Math.max(1, daysBetween(client.startDate, today)) : 30;
    const sessionsPerWeek = (totalSessions / daysSinceStart * 7).toFixed(1);
    const formattedStart = new Date(client.startDate || Date.now()).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' });
    insights.push({
      id: 'training-summary',
      icon: <Activity size={16} />,
      title: pl
        ? `${totalSessions} sesji — ${sessionsPerWeek}/tydz. średnio`
        : `${totalSessions} sessions logged — ${sessionsPerWeek}/week avg`,
      detail: pl
        ? `Trenuje od ${formattedStart}.`
        : `Training since ${formattedStart}.`,
      severity: 'info',
      priority: 15,
    });
  }

  // Body comp snapshot (show if we have any weight data)
  const allWeights = client.metrics.weight;
  if (allWeights.length >= 2) {
    const totalChange = allWeights[allWeights.length - 1] - allWeights[0];
    const direction = totalChange < 0 ? 'down' : totalChange > 0 ? 'up' : 'stable';
    const dirLabel = pl
      ? (direction === 'stable' ? 'stabilna' : direction === 'up' ? 'w górę' : 'w dół')
      : (direction === 'stable' ? 'stable' : direction);
    insights.push({
      id: 'body-snapshot',
      icon: direction === 'down' ? <TrendingDown size={16} /> : direction === 'up' ? <TrendingUp size={16} /> : <Activity size={16} />,
      title: pl
        ? `Waga ${dirLabel} ${Math.abs(totalChange).toFixed(1)}kg od początku`
        : `Weight ${direction === 'stable' ? 'stable' : direction} ${Math.abs(totalChange).toFixed(1)}kg since start`,
      detail: pl
        ? `${allWeights[0]}kg → ${allWeights[allWeights.length - 1]}kg w ${allWeights.length} pomiarach.`
        : `${allWeights[0]}kg → ${allWeights[allWeights.length - 1]}kg across ${allWeights.length} measurements.`,
      severity: direction === 'stable' ? 'info' : 'positive',
      priority: 20,
    });
  }

  // Check-in engagement rate
  if (clientCheckIns.length >= 2) {
    const firstCI = clientCheckIns[0].date;
    const weeksSinceFirst = Math.max(1, daysBetween(firstCI, today) / 7);
    const ciPerWeek = (clientCheckIns.length / weeksSinceFirst).toFixed(1);
    const good = clientCheckIns.length >= weeksSinceFirst * 0.8;
    insights.push({
      id: 'checkin-rate',
      icon: <Target size={16} />,
      title: pl
        ? `${clientCheckIns.length} check-inów — ${ciPerWeek}/tydz.`
        : `${clientCheckIns.length} check-ins — ${ciPerWeek}/week`,
      detail: pl
        ? (good ? 'Doskonała regularność check-inów.' : 'Jest pole do poprawy regularności check-inów.')
        : (good ? 'Excellent check-in compliance.' : 'Room to improve check-in consistency.'),
      severity: good ? 'positive' : 'info',
      priority: 18,
    });
  }

  // Last active summary (always useful context)
  if (client.lastActive) {
    const daysInactive = daysBetween(client.lastActive, today);
    if (daysInactive >= 3 && daysInactive < 7) {
      insights.push({
        id: 'last-active',
        icon: <Activity size={16} />,
        title: pl
          ? `Ostatnia aktywność ${daysInactive} dni temu`
          : `Last active ${daysInactive} days ago`,
        detail: pl
          ? 'Może warto wysłać krótką wiadomość.'
          : 'Might be worth a quick check-in message.',
        severity: 'info',
        priority: 45,
      });
    }
  }

  // Sort by priority (highest first)
  return insights.sort((a, b) => b.priority - a.priority);
}

// ── Severity colors ──

const severityColors: Record<InsightSeverity, { color: string; bg: string; border: string }> = {
  positive: { color: 'var(--accent-success)', bg: 'var(--accent-success-dim)', border: 'rgba(34,197,94,0.2)' },
  warning: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)', border: 'rgba(245,158,11,0.2)' },
  alert: { color: 'var(--accent-danger)', bg: 'var(--accent-danger-dim)', border: 'rgba(239,68,68,0.2)' },
  info: { color: 'var(--accent-info)', bg: 'var(--accent-info-dim)', border: 'rgba(59,130,246,0.2)' },
};

// ── Component ──

export default function ClientInsights({ client, workoutLogs, setLogs, checkIns, program, lang, t }: ClientInsightsProps) {
  const [expanded, setExpanded] = useState(false);
  const pl = lang === 'pl';
  const insights = generateInsights(client, workoutLogs, setLogs, checkIns, program, pl);

  if (insights.length === 0) {
    return null; // Don't render empty card
  }

  const alertCount = insights.filter(i => i.severity === 'alert').length;
  const warnCount = insights.filter(i => i.severity === 'warning').length;
  const visibleInsights = expanded ? insights : insights.slice(0, 4);
  const hasMore = insights.length > 4;

  const alertLabel = pl
    ? (alertCount === 1 ? 'alert' : 'alerty')
    : (alertCount === 1 ? 'alert' : 'alerts');
  const warnLabel = pl
    ? (warnCount === 1 ? 'ostrzeżenie' : 'ostrzeżenia')
    : (warnCount === 1 ? 'warning' : 'warnings');

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
              {alertCount} {alertLabel}
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ ...styles.badge, color: severityColors.warning.color, background: severityColors.warning.bg, borderColor: severityColors.warning.border }}>
              {warnCount} {warnLabel}
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
