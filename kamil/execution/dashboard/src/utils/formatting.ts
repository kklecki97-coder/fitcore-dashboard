const avatarColors = [
  '#00e5c8', '#6366f1', '#f59e0b', '#ef4444', '#22c55e',
  '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#a855f7', '#3b82f6', '#10b981', '#f43f5e', '#84cc16',
  '#0ea5e9', '#d946ef', '#facc15', '#64748b', '#fb923c',
];

/**
 * Get initials from a full name (e.g. "Marcus Chen" -> "MC").
 */
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/**
 * Get a deterministic avatar color from an ID string.
 */
export function getAvatarColor(id: string): string {
  const idx = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarColors[idx % avatarColors.length];
}

/**
 * Get the daily quote based on the day of year (deterministic rotation).
 */
export function getDailyQuote(
  quotes: string[],
  authors: string[],
  now = new Date(),
): { text: string; author: string } {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const idx = dayOfYear % quotes.length;
  return { text: quotes[idx], author: authors[idx] };
}
