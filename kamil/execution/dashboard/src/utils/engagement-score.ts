import type { Client, WorkoutLog, CheckIn, Message } from '../types';

export interface EngagementScore {
  total: number; // 0-100
  trend: 'up' | 'stable' | 'down';
  breakdown: {
    workoutCompletion: number; // 0-100
    checkInRate: number;
    messageResponsiveness: number;
    streak: number;
    goalProgress: number;
  };
  label: string; // "excellent", "good", "needsAttention", "atRisk"
}

const WEIGHTS = {
  workoutCompletion: 0.35,
  checkInRate: 0.20,
  messageResponsiveness: 0.15,
  streak: 0.15,
  goalProgress: 0.15,
};

export function calculateEngagementScore(
  client: Client,
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
): EngagementScore {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];

  const clientLogs = workoutLogs.filter(w => w.clientId === client.id);
  const clientCheckIns = checkIns.filter(ci => ci.clientId === client.id);
  const clientMessages = messages.filter(m => m.clientId === client.id);

  // 1. Workout completion rate (last 14 days)
  const recentLogs = clientLogs.filter(w => w.date >= twoWeeksAgoStr);
  const completedRecent = recentLogs.filter(w => w.completed).length;
  let workoutCompletion: number;
  if (recentLogs.length > 0) {
    workoutCompletion = Math.min(100, Math.round((completedRecent / Math.max(recentLogs.length, 1)) * 100));
  } else {
    workoutCompletion = Math.min(100, Math.round(client.progress * 0.7 + Math.min(client.streak, 14) * 2));
  }

  // 2. Check-in submission rate (last 28 days)
  const recentCheckIns = clientCheckIns.filter(ci => ci.date >= fourWeeksAgoStr);
  const completedCheckIns = recentCheckIns.filter(ci => ci.status === 'completed').length;
  let checkInRate: number;
  if (clientCheckIns.length > 0) {
    const totalScheduled = recentCheckIns.filter(ci => ci.status !== 'missed').length || 1;
    checkInRate = Math.min(100, Math.round((completedCheckIns / totalScheduled) * 100));
  } else {
    const hasUpcoming = client.nextCheckIn !== '-';
    checkInRate = hasUpcoming ? Math.min(100, 50 + client.streak * 3) : 20;
  }

  // 3. Message responsiveness (replies within 24h)
  let messageResponsiveness: number;
  if (clientMessages.length >= 2) {
    const coachMessages = clientMessages.filter(m => m.isFromCoach);
    const clientReplies = clientMessages.filter(m => !m.isFromCoach);
    let responsiveCount = 0;
    let totalCoachMsgs = 0;
    for (const cm of coachMessages) {
      const cmTime = new Date(cm.timestamp).getTime();
      const reply = clientReplies.find(r => {
        const rTime = new Date(r.timestamp).getTime();
        return rTime > cmTime && rTime - cmTime < 24 * 60 * 60 * 1000;
      });
      if (reply) responsiveCount++;
      totalCoachMsgs++;
    }
    messageResponsiveness = totalCoachMsgs > 0
      ? Math.round((responsiveCount / totalCoachMsgs) * 100)
      : 50;
  } else {
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

  // 4. Streak (consecutive days with activity)
  const streakScore = Math.min(100, Math.round((client.streak / 21) * 100));

  // 5. Goal progress
  const goalProgress = Math.min(100, client.progress);

  // Calculate weighted total
  const total = Math.round(
    workoutCompletion * WEIGHTS.workoutCompletion +
    checkInRate * WEIGHTS.checkInRate +
    messageResponsiveness * WEIGHTS.messageResponsiveness +
    streakScore * WEIGHTS.streak +
    goalProgress * WEIGHTS.goalProgress
  );

  // Calculate trend (compare last 14 days vs previous 14 days)
  const prevLogs = clientLogs.filter(w => w.date >= fourWeeksAgoStr && w.date < twoWeeksAgoStr);
  const prevCompleted = prevLogs.filter(w => w.completed).length;
  const trend: 'up' | 'stable' | 'down' =
    completedRecent > prevCompleted + 1 ? 'up' :
    completedRecent < prevCompleted - 1 ? 'down' : 'stable';

  // Label
  const label = total >= 80 ? 'excellent' : total >= 50 ? 'good' : total >= 25 ? 'needsAttention' : 'atRisk';

  return {
    total,
    trend,
    breakdown: {
      workoutCompletion,
      checkInRate,
      messageResponsiveness,
      streak: streakScore,
      goalProgress,
    },
    label,
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#20dba4';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#f97316';
  return '#e8637a';
}
