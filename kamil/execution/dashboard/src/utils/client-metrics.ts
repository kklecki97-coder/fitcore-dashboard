import type { Client } from '../types';

/**
 * Extract latest and previous value from a metric history array, and compute delta.
 */
export function calculateMetricChange(history: number[]): {
  latestValue: number | null;
  prevValue: number | null;
  change: number;
} {
  if (history.length === 0) return { latestValue: null, prevValue: null, change: 0 };
  const latestValue = history[history.length - 1];
  const prevValue = history.length >= 2 ? history[history.length - 2] : latestValue;
  return {
    latestValue,
    prevValue,
    change: latestValue - prevValue,
  };
}

/**
 * Build lift progression chart data from client metrics.
 */
export function buildLiftData(client: Client, monthLabels: string[]): {
  month: string;
  bench: number;
  squat: number;
  deadlift: number;
}[] {
  return client.metrics.benchPress.map((_, i) => ({
    month: monthLabels[i] || `M${i}`,
    bench: client.metrics.benchPress[i],
    squat: client.metrics.squat[i],
    deadlift: client.metrics.deadlift[i],
  }));
}

/**
 * Compute radar chart data from client stats.
 */
export function buildClientRadarData(
  client: Client,
  labels: { strength: string; endurance: string; consistency: string; nutrition: string; recovery: string; progress: string },
): { metric: string; value: number }[] {
  const enduranceScore = Math.min(100, 60 + (client.progress * 0.3) + (client.streak * 0.5));
  const nutritionScore = Math.min(100, 45 + (client.progress * 0.4) + (client.streak * 0.3));
  const recoveryScore = Math.min(100, 55 + (client.streak * 1.2) + (client.progress * 0.15));

  const lastBench = client.metrics.benchPress[client.metrics.benchPress.length - 1] || 0;

  return [
    { metric: labels.strength, value: Math.min(100, (lastBench / 120) * 100) },
    { metric: labels.endurance, value: enduranceScore },
    { metric: labels.consistency, value: Math.min(100, client.streak * 3.5) },
    { metric: labels.nutrition, value: nutritionScore },
    { metric: labels.recovery, value: recoveryScore },
    { metric: labels.progress, value: client.progress },
  ];
}
