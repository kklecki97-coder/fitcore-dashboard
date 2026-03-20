import type { Client, CheckIn, Message, WorkoutLog } from '../types';

export interface EngagementScore {
  total: number; // 0-100
  breakdown: {
    workoutCompletion: number; // 0-100 (weight: 35%)
    checkInRate: number;       // 0-100 (weight: 20%)
    messageResponsiveness: number; // 0-100 (weight: 15%)
    streakLength: number;      // 0-100 (weight: 15%)
    goalProgress: number;      // 0-100 (weight: 15%)
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

  // ── 1. Workout completion rate (last 14 days) ── 35%
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const recentLogs = clientLogs.filter(w => new Date(w.date).getTime() >= fourteenDaysAgo);
  const completedLogs = recentLogs.filter(w => w.completed);
  let workoutCompletion: number;
  if (recentLogs.length > 0) {
    workoutCompletion = Math.min(100, Math.round((completedLogs.length / Math.max(recentLogs.length, 1)) * 100));
  } else {
    // Derive from client data: streak + progress as proxy
    workoutCompletion = Math.min(100, Math.round(client.progress * 0.7 + Math.min(client.streak, 14) * 2));
  }

  // ── 2. Check-in submission rate ── 20%
  const completedCheckIns = clientCheckIns.filter(ci => ci.status === 'completed');
  const totalScheduled = clientCheckIns.filter(ci => ci.status !== 'missed').length || 1;
  let checkInRate: number;
  if (clientCheckIns.length > 0) {
    checkInRate = Math.min(100, Math.round((completedCheckIns.length / totalScheduled) * 100));
  } else {
    // Derive from streak / nextCheckIn
    const hasUpcoming = client.nextCheckIn !== '-';
    checkInRate = hasUpcoming ? Math.min(100, 50 + client.streak * 3) : 20;
  }

  // ── 3. Message responsiveness (replies within 24h) ── 15%
  let messageResponsiveness: number;
  if (clientMessages.length >= 2) {
    // Check for client replies (not from coach) within 24h of coach messages
    const coachMessages = clientMessages.filter(m => m.isFromCoach).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const clientReplies = clientMessages.filter(m => !m.isFromCoach);
    let responded = 0;
    let total = 0;
    for (const cm of coachMessages) {
      total++;
      const cmTime = new Date(cm.timestamp).getTime();
      const reply = clientReplies.find(r => {
        const rTime = new Date(r.timestamp).getTime();
        return rTime > cmTime && rTime - cmTime < 24 * 60 * 60 * 1000;
      });
      if (reply) responded++;
    }
    messageResponsiveness = total > 0 ? Math.round((responded / total) * 100) : 70;
  } else {
    // Derive from lastActive
    const lastActiveStr = client.lastActive.toLowerCase();
    if (lastActiveStr.includes('min') || lastActiveStr.includes('hour')) {
      messageResponsiveness = 90;
    } else if (lastActiveStr.includes('1 day') || lastActiveStr.includes('yesterday')) {
      messageResponsiveness = 70;
    } else if (lastActiveStr.includes('day')) {
      messageResponsiveness = 50;
    } else {
      messageResponsiveness = 25;
    }
  }

  // ── 4. Streak length ── 15%
  // Map streak days to a 0-100 score (21+ days = 100)
  const streakLength = Math.min(100, Math.round((client.streak / 21) * 100));

  // ── 5. Progress toward goals ── 15%
  const goalProgress = Math.min(100, client.progress);

  // ── Weighted total ──
  const total = Math.round(
    workoutCompletion * 0.35 +
    checkInRate * 0.20 +
    messageResponsiveness * 0.15 +
    streakLength * 0.15 +
    goalProgress * 0.15
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
      messageResponsiveness,
      streakLength,
      goalProgress,
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
    { key: 'messages', score: breakdown.messageResponsiveness },
    { key: 'streak', score: breakdown.streakLength },
    { key: 'goals', score: breakdown.goalProgress },
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
    { key: 'messages', score: breakdown.messageResponsiveness },
    { key: 'streak', score: breakdown.streakLength },
    { key: 'goals', score: breakdown.goalProgress },
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
