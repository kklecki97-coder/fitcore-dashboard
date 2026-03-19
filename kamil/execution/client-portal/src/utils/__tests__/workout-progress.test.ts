import { describe, it, expect } from 'vitest';
import { computeProgramProgress, computeSetCompletion, computeOutstandingAmount } from '../workout-progress';
import type { WorkoutProgram } from '../../types';

describe('computeProgramProgress', () => {
  it('returns zeros for null program', () => {
    expect(computeProgramProgress(null)).toEqual({ currentWeek: 0, progressPct: 0 });
  });

  it('calculates progress for active program', () => {
    // Use exactly 10 days ago - Math.ceil(10/7) = 2 weeks
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const program = {
      durationWeeks: 8,
      createdAt: tenDaysAgo.toISOString().split('T')[0],
    } as WorkoutProgram;
    const result = computeProgramProgress(program);
    expect(result.currentWeek).toBe(2);
    expect(result.progressPct).toBe(25);
  });

  it('caps at max weeks', () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 365);
    const program = {
      durationWeeks: 4,
      createdAt: longAgo.toISOString().split('T')[0],
    } as WorkoutProgram;
    const result = computeProgramProgress(program);
    expect(result.currentWeek).toBe(4);
    expect(result.progressPct).toBe(100);
  });
});

describe('computeSetCompletion', () => {
  it('returns zeros for empty exercises', () => {
    const result = computeSetCompletion([], () => false);
    expect(result).toEqual({ totalSets: 0, completedSets: 0, progressPct: 0, allDone: false });
  });

  it('calculates partial completion', () => {
    const exercises = [
      { id: 'e1', sets: 3 },
      { id: 'e2', sets: 4 },
    ];
    const isCompleted = (id: string, setNum: number) => id === 'e1' && setNum <= 2;
    const result = computeSetCompletion(exercises, isCompleted);
    expect(result.totalSets).toBe(7);
    expect(result.completedSets).toBe(2);
    expect(result.progressPct).toBe(29); // 2/7 rounded
    expect(result.allDone).toBe(false);
  });

  it('detects all done', () => {
    const exercises = [{ id: 'e1', sets: 3 }];
    const result = computeSetCompletion(exercises, () => true);
    expect(result.allDone).toBe(true);
    expect(result.progressPct).toBe(100);
  });
});

describe('computeOutstandingAmount', () => {
  it('sums pending and overdue invoices', () => {
    const invoices = [
      { status: 'pending', amount: 200 },
      { status: 'overdue', amount: 150 },
      { status: 'paid', amount: 500 },
    ];
    expect(computeOutstandingAmount(invoices)).toBe(350);
  });

  it('returns 0 for all paid', () => {
    const invoices = [
      { status: 'paid', amount: 200 },
      { status: 'paid', amount: 300 },
    ];
    expect(computeOutstandingAmount(invoices)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(computeOutstandingAmount([])).toBe(0);
  });
});
