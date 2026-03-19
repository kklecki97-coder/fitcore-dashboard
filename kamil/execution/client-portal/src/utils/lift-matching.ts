/**
 * Pattern definitions for 3 main compound lifts (EN + PL).
 */
export const MAIN_LIFT_PATTERNS = [
  { key: 'bench', label: 'Bench Press', patterns: ['bench press', 'wyciskanie sztangi leżąc', 'wyciskanie leżąc', 'wyciskanie sztangi lezac', 'flat bench', 'bench'] },
  { key: 'squat', label: 'Squat', patterns: ['squat', 'przysiad', 'back squat', 'front squat', 'przysiady'] },
  { key: 'deadlift', label: 'Deadlift', patterns: ['deadlift', 'dead lift', 'martwy ciąg', 'martwy ciag', 'martwego ciągu', 'martwego ciagu'] },
] as const;

/**
 * Match an exercise name to one of the 3 main compound lifts.
 * Returns the lift key ('bench', 'squat', 'deadlift') or null.
 */
export function matchMainLift(exerciseName: string): string | null {
  const lower = exerciseName.toLowerCase();
  for (const lift of MAIN_LIFT_PATTERNS) {
    if (lift.patterns.some(p => lower.includes(p))) return lift.key;
  }
  return null;
}

/**
 * Parse a numeric target from goal text (e.g. "Lose 5kg" → 5).
 */
export function parseTarget(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*kg/i) || text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}
