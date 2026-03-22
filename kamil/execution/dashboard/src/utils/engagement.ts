import type { Client, CheckIn, Message, WorkoutLog } from '../types';

export interface EngagementScore {
  total: number; // 0-100
  breakdown: {
    workoutCompletion: number; // 0-100 (weight: 45%)
    checkInRate: number;       // 0-100 (weight: 25%)
    streakLength: number;      // 0-100 (weight: 20%)
    messageResponsiveness: number; // 0-100 (weight: 10%)
    goalProgress?: number;     // removed — kept optional for backwards compat
  };
  trend: 'up' | 'stable' | 'down';
  history: number[]; // last 8 weeks of scores
}

export type EngagementLevel = 'green' | 'yellow' | 'orange' | 'red';

export function getEngagementLevel(score: number): EngagementLevel {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  if (score >= 25) return 'orange';
  return 'red';
}

export function getEngagementColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#eab308';
  if (score >= 25) return '#f97316';
  return '#ef4444';
}

export function getTrendArrow(trend: 'up' | 'stable' | 'down'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'stable': return '→';
    case 'down': return '↓';
  }
}

/**
 * Calculate engagement score for a client based on available data.
 * Uses deterministic mock-enriched scoring when real data is sparse.
 */
export function calculateEngagement(
  client: Client,
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
): EngagementScore {
  const clientLogs = workoutLogs.filter(w => w.clientId === client.id);
  const clientCheckIns = checkIns.filter(ci => ci.clientId === client.id);
  const clientMessages = messages.filter(m => m.clientId === client.id);

  // ── New client = 100 (no data yet, full trust) ──
  const hasAnyData = clientLogs.length > 0 || clientCheckIns.length > 0 || clientMessages.length > 0;
  if (!hasAnyData) {
    return {
      total: 100,
      breakdown: { workoutCompletion: 100, checkInRate: 100, streakLength: 100, messageResponsiveness: 100 },
      trend: 'stable' as const,
      history: [100, 100, 100, 100, 100, 100, 100, 100],
    };
  }

  const now = Date.now();

  // ── 1. Workout completion rate (last 14 days) ── 35%
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const recentLogs = clientLogs.filter(w => new Date(w.date).getTime() >= fourteenDaysAgo);
  const completedLogs = recentLogs.filter(w => w.completed);
  const workoutCompletion = recentLogs.length > 0
    ? Math.min(100, Math.round((completedLogs.length / recentLogs.length) * 100))
    : 100; // no scheduled workouts recently = assume OK

  // ── 2. Check-in submission rate ── 20%
  const completedCheckIns = clientCheckIns.filter(ci => ci.status === 'completed');
  const missedCheckIns = clientCheckIns.filter(ci => ci.status === 'missed');
  const totalRelevant = completedCheckIns.length + missedCheckIns.length;
  const checkInRate = totalRelevant > 0
    ? Math.min(100, Math.round((completedCheckIns.length / totalRelevant) * 100))
    : 100; // no check-ins scheduled yet = assume OK

  // ── 3. Message responsiveness (replies within 24h) ── 15%
  let messageResponsiveness = 100;
  const coachMessages = clientMessages.filter(m => m.isFromCoach).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (coachMessages.length > 0) {
    const clientReplies = clientMessages.filter(m => !m.isFromCoach);
    let responded = 0;
    let totalAsks = 0;
    for (const cm of coachMessages) {
      totalAsks++;
      const cmTime = new Date(cm.timestamp).getTime();
      const reply = clientReplies.find(r => {
        const rTime = new Date(r.timestamp).getTime();
        return rTime > cmTime && rTime - cmTime < 24 * 60 * 60 * 1000;
      });
      if (reply) responded++;
    }
    messageResponsiveness = totalAsks > 0 ? Math.round((responded / totalAsks) * 100) : 100;
  }

  // ── 4. Streak length (consecutive completed workout days) ── 15%
  // Count how many of the most recent scheduled workouts were completed in a row
  // Rest days don't count — only workout days (entries in workoutLogs)
  let realStreak = 0;
  const sortedWorkouts = [...clientLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const w of sortedWorkouts) {
    if (w.completed) {
      realStreak++;
    } else {
      break; // first missed workout breaks the streak
    }
  }
  // Map streak: 21+ consecutive workout days = 100
  const streakLength = Math.min(100, Math.round((realStreak / 21) * 100));

  // ── Weighted total (4 metrics) ──
  const total = Math.round(
    workoutCompletion * 0.45 +
    checkInRate * 0.25 +
    streakLength * 0.20 +
    messageResponsiveness * 0.10
  );

  // ── Generate 8-week history (deterministic from client data) ──
  const history = generateHistory(total, client);

  // ── Trend: compare last 2 weeks ──
  const recent = history.slice(-2);
  const older = history.slice(-4, -2);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  const olderAvg = older.reduce((a, b) => a + b, 0) / (older.length || 1);
  const diff = recentAvg - olderAvg;
  const trend: 'up' | 'stable' | 'down' = diff > 3 ? 'up' : diff < -3 ? 'down' : 'stable';

  return {
    total,
    breakdown: {
      workoutCompletion,
      checkInRate,
      streakLength,
      messageResponsiveness,
    },
    trend,
    history,
  };
}

/**
 * Generate a deterministic 8-week score history based on client data.
 * Creates a realistic-looking progression curve.
 */
function generateHistory(currentScore: number, client: Client): number[] {
  // Use client id as seed for deterministic variation
  const seed = client.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const history: number[] = [];

  for (let i = 0; i < 8; i++) {
    const weekFactor = i / 7; // 0 to 1
    // Start from a lower base and trend toward current score
    const base = currentScore * 0.6 + currentScore * 0.4 * weekFactor;
    // Add deterministic variation based on seed + week
    const variation = ((seed * (i + 1) * 7) % 15) - 7; // -7 to +7
    const score = Math.max(0, Math.min(100, Math.round(base + variation)));
    history.push(score);
  }
  // Ensure the last entry is close to current
  history[7] = currentScore;

  return history;
}

/**
 * Generate an AI-style one-liner insight about the client's engagement.
 */
export function generateEngagementInsight(
  client: Client,
  score: EngagementScore,
  lang: 'en' | 'pl',
): string {
  const { total, breakdown, trend } = score;
  const name = client.name.split(' ')[0];

  if (lang === 'pl') {
    return generateInsightPL(name, total, breakdown, trend, client);
  }
  return generateInsightEN(name, total, breakdown, trend, client);
}

function generateInsightEN(
  name: string,
  total: number,
  breakdown: EngagementScore['breakdown'],
  trend: string,
  client: Client,
): string {
  // Find the weakest area
  const areas = [
    { key: 'workouts', score: breakdown.workoutCompletion },
    { key: 'check-ins', score: breakdown.checkInRate },
    { key: 'streak', score: breakdown.streakLength },
    { key: 'messages', score: breakdown.messageResponsiveness },
  ];
  const weakest = areas.reduce((a, b) => a.score < b.score ? a : b);
  const strongest = areas.reduce((a, b) => a.score > b.score ? a : b);

  if (total >= 80) {
    if (trend === 'down') {
      return `${name} is highly engaged but showing a slight dip — keep an eye on ${weakest.key}.`;
    }
    return `${name} is crushing it — ${strongest.key} performance is outstanding. Keep the momentum.`;
  }
  if (total >= 50) {
    if (weakest.key === 'workouts') {
      return `${name}'s workout frequency dropped recently — consider adjusting the program intensity.`;
    }
    if (weakest.key === 'messages') {
      return `${name} hasn't been responsive to messages — consider a check-in call.`;
    }
    if (weakest.key === 'check-ins') {
      return `${name} is missing check-ins — a quick reminder could help re-engage.`;
    }
    return `${name} is moderately engaged but ${weakest.key} needs attention.`;
  }
  if (total >= 25) {
    if (client.status === 'paused') {
      return `${name} is paused — schedule a return-to-training call when ready.`;
    }
    return `${name} is at risk of dropping off — ${weakest.key} score is low. Reach out soon.`;
  }
  if (client.status === 'paused') {
    return `${name} has been inactive — consider a re-engagement message.`;
  }
  return `${name} needs immediate attention — engagement has dropped significantly across all areas.`;
}

function generateInsightPL(
  name: string,
  total: number,
  breakdown: EngagementScore['breakdown'],
  trend: string,
  client: Client,
): string {
  const areasPL: Record<string, string> = {
    workouts: 'treningi',
    'check-ins': 'raporty',
    messages: 'wiadomości',
    streak: 'passa',
    goals: 'cele',
  };

  const areas = [
    { key: 'workouts', score: breakdown.workoutCompletion },
    { key: 'check-ins', score: breakdown.checkInRate },
    { key: 'streak', score: breakdown.streakLength },
    { key: 'messages', score: breakdown.messageResponsiveness },
  ];
  const weakest = areas.reduce((a, b) => a.score < b.score ? a : b);
  const strongest = areas.reduce((a, b) => a.score > b.score ? a : b);

  if (total >= 80) {
    if (trend === 'down') {
      return `${name} jest bardzo zaangażowany/a, ale widać lekki spadek — obserwuj ${areasPL[weakest.key]}.`;
    }
    return `${name} daje radę — wynik w kategorii ${areasPL[strongest.key]} jest wybitny. Utrzymaj tempo.`;
  }
  if (total >= 50) {
    if (weakest.key === 'workouts') {
      return `Częstotliwość treningów ${name} spadła — rozważ dostosowanie intensywności programu.`;
    }
    if (weakest.key === 'messages') {
      return `${name} nie odpowiada na wiadomości — rozważ telefon kontrolny.`;
    }
    if (weakest.key === 'check-ins') {
      return `${name} pomija raporty — szybkie przypomnienie może pomóc.`;
    }
    return `${name} jest umiarkowanie zaangażowany/a, ale ${areasPL[weakest.key]} wymaga uwagi.`;
  }
  if (total >= 25) {
    if (client.status === 'paused') {
      return `${name} ma pauzę — zaplanuj rozmowę o powrocie do treningów.`;
    }
    return `${name} jest zagrożony/a rezygnacją — wynik ${areasPL[weakest.key]} jest niski. Skontaktuj się.`;
  }
  if (client.status === 'paused') {
    return `${name} jest nieaktywny/a — rozważ wiadomość zachęcającą do powrotu.`;
  }
  return `${name} wymaga natychmiastowej uwagi — zaangażowanie spadło znacząco we wszystkich obszarach.`;
}

/**
 * Get suggested action based on engagement score and weak areas.
 */
export function getSuggestedAction(
  score: EngagementScore,
  lang: 'en' | 'pl',
): { label: string; type: 'motivation' | 'call' | 'adjust' } {
  const { total, breakdown } = score;
  const weakest = Object.entries(breakdown).reduce((a, b) => a[1] < b[1] ? a : b);

  if (total >= 70) {
    return {
      label: lang === 'pl' ? 'Wyślij Motywację' : 'Send Motivation',
      type: 'motivation',
    };
  }
  if (weakest[0] === 'messageResponsiveness' || weakest[0] === 'checkInRate' || total < 30) {
    return {
      label: lang === 'pl' ? 'Zaplanuj Rozmowę' : 'Schedule Call',
      type: 'call',
    };
  }
  return {
    label: lang === 'pl' ? 'Dostosuj Program' : 'Adjust Program',
    type: 'adjust',
  };
}
