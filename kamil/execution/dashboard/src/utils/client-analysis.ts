import type { Client, WorkoutLog } from '../types';

/**
 * Filter clients that are "at risk":
 * - paused status
 * - no workouts logged in last 7 days
 * - overdue check-in date
 */
export function filterAtRiskClients(
  clients: Client[],
  workoutLogs: WorkoutLog[],
  now = new Date(),
): Client[] {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return clients.filter(c => {
    if (c.status === 'paused') return true;
    // No workouts logged in last 7 days
    const recentWorkouts = workoutLogs.filter(w => w.clientId === c.id && w.date >= sevenDaysAgoStr);
    if (recentWorkouts.length === 0) return true;
    // Overdue check-in
    if (c.nextCheckIn && c.nextCheckIn !== '-') {
      const checkInDate = new Date(c.nextCheckIn);
      checkInDate.setHours(0, 0, 0, 0);
      if (checkInDate < today) return true;
    }
    return false;
  });
}
