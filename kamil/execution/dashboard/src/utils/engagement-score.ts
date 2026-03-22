/**
 * DEPRECATED: This module is a compatibility wrapper.
 * Use engagement.ts directly for all engagement scoring.
 */
import { calculateEngagement, getScoreColor, getScoreLabel } from './engagement';
import type { EngagementScore as FullEngagementScore } from './engagement';
import type { Client, WorkoutLog, CheckIn, Message } from '../types';

export interface EngagementScore {
  total: number;
  trend: 'up' | 'stable' | 'down';
  breakdown: {
    workoutCompletion: number;
    checkInRate: number;
    messageResponsiveness: number;
    streak: number;
    goalProgress: number;
  };
  label: string;
}

export function calculateEngagementScore(
  client: Client,
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
): EngagementScore {
  const full: FullEngagementScore = calculateEngagement(client, workoutLogs, checkIns, messages);
  return {
    total: full.total,
    trend: full.trend,
    breakdown: {
      workoutCompletion: full.breakdown.workoutCompletion,
      checkInRate: full.breakdown.checkInRate,
      messageResponsiveness: full.breakdown.messageResponsiveness,
      streak: full.breakdown.streakLength,
      goalProgress: 0, // removed from canonical scorer
    },
    label: getScoreLabel(full.total),
  };
}

export { getScoreColor };
