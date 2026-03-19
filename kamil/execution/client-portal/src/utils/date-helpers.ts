/**
 * Convert a Date to YYYY-MM-DD string in local timezone (avoids UTC shift from toISOString).
 */
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format seconds as MM:SS.
 */
export function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get the Monday of the current week.
 */
export function getMondayOfWeek(today = new Date()): Date {
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Calculate days until a target date from now.
 */
export function daysUntil(targetDate: string, now = new Date()): number {
  return Math.ceil((new Date(targetDate).getTime() - now.getTime()) / 86400000);
}
