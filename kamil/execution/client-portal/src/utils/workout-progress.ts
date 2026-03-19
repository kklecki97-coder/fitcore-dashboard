import type { WorkoutProgram } from '../types';

/**
 * Calculate the current week and progress percentage for a workout program.
 */
export function computeProgramProgress(program: WorkoutProgram | null): {
  currentWeek: number;
  progressPct: number;
} {
  if (!program) return { currentWeek: 0, progressPct: 0 };

  const programWeeks = program.durationWeeks ?? 0;
  const programStartTime = new Date(program.createdAt).getTime();
  const msElapsed = Date.now() - programStartTime;
  const weeksElapsed = msElapsed > 0 ? Math.ceil(msElapsed / (7 * 86400000)) : 0;
  const currentWeek = Math.min(Math.max(weeksElapsed, 0), programWeeks);
  const progressPct = programWeeks > 0 && currentWeek > 0 ? Math.round((currentWeek / programWeeks) * 100) : 0;

  return { currentWeek, progressPct };
}

/**
 * Calculate workout set completion stats for a given day.
 */
export function computeSetCompletion(
  exercises: Array<{ id: string; sets: number }>,
  isSetCompleted: (exerciseId: string, setNum: number) => boolean,
): { totalSets: number; completedSets: number; progressPct: number; allDone: boolean } {
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = exercises.reduce((sum, ex) => {
    return sum + Array.from({ length: ex.sets }, (_, i) => isSetCompleted(ex.id, i + 1)).filter(Boolean).length;
  }, 0);
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const allDone = completedSets === totalSets && totalSets > 0;
  return { totalSets, completedSets, progressPct, allDone };
}

/**
 * Calculate outstanding invoice amount (pending + overdue).
 */
export function computeOutstandingAmount(invoices: Array<{ status: string; amount: number }>): number {
  return invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0);
}
