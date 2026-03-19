/**
 * Extract a short label from a workout day name.
 * Strips day-of-week prefix and classifies workout type.
 * e.g. "Monday - Boxing + Jiu-Jitsu" → "BJJ + Box"
 */
export function extractLabel(name: string): string {
  const stripped = name.replace(/^(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?)\s*[\-–\-:]\s*/i, '');
  const s = stripped.toLowerCase();
  if (s.includes('push')) return 'Push';
  if (s.includes('pull')) return 'Pull';
  if (s.includes('upper')) return 'Upper';
  if (s.includes('lower')) return 'Lower';
  if (s.includes('legs') || s.includes('leg day')) return 'Legs';
  const hasBjj = s.includes('jiu') || s.includes('bjj') || s.includes('grappling');
  const hasBoxing = s.includes('box');
  const hasMma = s.includes('mma');
  if (hasBjj && hasBoxing) return 'BJJ + Box';
  if (hasBjj && hasMma) return 'BJJ + MMA';
  if (hasBjj) return 'BJJ';
  if (hasBoxing) return 'Boxing';
  if (hasMma) return 'MMA';
  if (s.includes('strength') || s.includes('full body') || s.includes('gym')) return 'Gym';
  if (s.includes('cardio')) return 'Cardio';
  if (s.includes('hiit')) return 'HIIT';
  if (s.includes('yoga') || s.includes('stretch')) return 'Yoga';
  return stripped.length > 8 ? stripped.slice(0, 8) : stripped;
}
