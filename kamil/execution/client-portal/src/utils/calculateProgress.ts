import type { Client, GoalTargets } from '../types';

interface WorkoutLogEntry {
  clientId: string;
  date: string;
  completed: boolean;
}

// ── Goal progress: how far toward each measurable target ──

function calcGoalProgress(
  metrics: Client['metrics'],
  goalTargets: GoalTargets,
): number | null {
  const scores: number[] = [];

  // Weight goal (losing or gaining)
  if (goalTargets.targetWeight != null && metrics.weight.length >= 2) {
    const start = metrics.weight[0];
    const current = metrics.weight[metrics.weight.length - 1];
    const target = goalTargets.targetWeight;
    const totalDistance = Math.abs(start - target);
    if (totalDistance > 0) {
      const traveled = Math.abs(start - current);
      // Check direction: are we moving the right way?
      const rightDirection =
        (target < start && current <= start) || // losing weight
        (target > start && current >= start);   // gaining weight
      const pct = rightDirection ? (traveled / totalDistance) * 100 : 0;
      scores.push(Math.min(pct, 100));
    }
  }

  // Body fat goal (usually losing)
  if (goalTargets.targetBodyFat != null && metrics.bodyFat.length >= 2) {
    const start = metrics.bodyFat[0];
    const current = metrics.bodyFat[metrics.bodyFat.length - 1];
    const target = goalTargets.targetBodyFat;
    const totalDistance = Math.abs(start - target);
    if (totalDistance > 0) {
      const traveled = Math.abs(start - current);
      const rightDirection =
        (target < start && current <= start) ||
        (target > start && current >= start);
      const pct = rightDirection ? (traveled / totalDistance) * 100 : 0;
      scores.push(Math.min(pct, 100));
    }
  }

  // Lift goals (bench, squat, deadlift) — always going up
  const liftGoals: { target?: number; data: number[] }[] = [
    { target: goalTargets.targetBenchPress, data: metrics.benchPress },
    { target: goalTargets.targetSquat, data: metrics.squat },
    { target: goalTargets.targetDeadlift, data: metrics.deadlift },
  ];

  for (const lift of liftGoals) {
    if (lift.target != null && lift.data.length >= 1) {
      const current = lift.data[lift.data.length - 1];
      const pct = (current / lift.target) * 100;
      scores.push(Math.min(pct, 100));
    }
  }

  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ── Workout frequency: completed sessions in the last 30 days ──

function calcFrequencyScore(
  clientId: string,
  workoutLogs: WorkoutLogEntry[],
): number | null {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const recentLogs = workoutLogs.filter(
    (w) => w.clientId === clientId && w.date >= cutoff,
  );

  if (recentLogs.length === 0) return null;

  const completed = recentLogs.filter((w) => w.completed).length;
  const total = recentLogs.length;

  // Completion rate as percentage
  return (completed / total) * 100;
}

// ── Main: combine goal progress (75%) + frequency (25%) ──

export function calculateOverallProgress(
  client: Client,
  workoutLogs: WorkoutLogEntry[],
): number {
  const goalScore = client.goalTargets
    ? calcGoalProgress(client.metrics, client.goalTargets)
    : null;
  const freqScore = calcFrequencyScore(client.id, workoutLogs);

  let progress: number;

  if (goalScore != null && freqScore != null) {
    // Both available: 75/25 weighted average
    progress = goalScore * 0.75 + freqScore * 0.25;
  } else if (goalScore != null) {
    // Only goals — use 100%
    progress = goalScore;
  } else if (freqScore != null) {
    // Only frequency — use 100%
    progress = freqScore;
  } else {
    // No data at all — keep existing progress
    return client.progress;
  }

  return Math.round(Math.min(Math.max(progress, 0), 100));
}
