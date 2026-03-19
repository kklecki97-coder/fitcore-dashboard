import { describe, it, expect } from 'vitest';
import {
  isTrainingHeader,
  isSkippableRow,
  isColumnHeader,
  parseExerciseRow,
  parseWorkbookRows,
} from '../import-parser';

describe('isTrainingHeader', () => {
  it('detects "Trening I" as header', () => {
    expect(isTrainingHeader('Trening I', '')).toBe(true);
  });

  it('detects "Trening II" as header', () => {
    expect(isTrainingHeader('Trening II', '')).toBe(true);
  });

  it('detects "Góra A" as header (no second cell)', () => {
    expect(isTrainingHeader('Góra A', '')).toBe(true);
  });

  it('detects "Upper" as header (no second cell)', () => {
    expect(isTrainingHeader('Upper', '')).toBe(true);
  });

  it('does NOT flag "Upper" when second cell has content', () => {
    expect(isTrainingHeader('Upper', 'something')).toBe(false);
  });

  it('detects "Push" as header', () => {
    expect(isTrainingHeader('Push', '')).toBe(true);
  });

  it('does NOT flag regular exercise names', () => {
    expect(isTrainingHeader('Bench Press', '4')).toBe(false);
  });
});

describe('isSkippableRow', () => {
  it('skips instruction rows', () => {
    expect(isSkippableRow('instrukcja do programu')).toBe(true);
  });

  it('skips progression explanation rows', () => {
    expect(isSkippableRow('w każdej serii daj z siebie maksimum')).toBe(true);
  });

  it('does not skip normal exercise rows', () => {
    expect(isSkippableRow('bench press48-1090s2/0/1/0')).toBe(false);
  });
});

describe('isColumnHeader', () => {
  it('detects "Numer" as column header', () => {
    expect(isColumnHeader('Numer', '')).toBe(true);
  });

  it('detects "#" as column header', () => {
    expect(isColumnHeader('#', '')).toBe(true);
  });

  it('detects "Nazwa" in second cell as column header', () => {
    expect(isColumnHeader('', 'Nazwa ćwiczenia')).toBe(true);
  });

  it('does not flag regular rows', () => {
    expect(isColumnHeader('1', 'Bench Press')).toBe(false);
  });
});

describe('parseExerciseRow', () => {
  it('parses a standard exercise row with number prefix', () => {
    const cells = ['1.', 'Bench Press', '4', '8-10', '90s', '2/0/1/0', 'Focus on form'];
    const result = parseExerciseRow(cells);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bench Press');
    expect(result!.sets).toBe(4);
    expect(result!.reps).toBe('8-10');
    expect(result!.restSeconds).toBe(90);
    expect(result!.tempo).toBe('2/0/1/0');
    expect(result!.notes).toBe('Focus on form');
  });

  it('parses a row without number prefix', () => {
    const cells = ['Squat', '5', '5', '180', '3/1/1/0', ''];
    const result = parseExerciseRow(cells);
    expect(result!.name).toBe('Squat');
    expect(result!.sets).toBe(5);
    expect(result!.reps).toBe('5');
    expect(result!.restSeconds).toBe(180);
  });

  it('defaults to 3 sets when sets is invalid', () => {
    const cells = ['Push-ups', '', '15', '', '', ''];
    const result = parseExerciseRow(cells);
    expect(result!.sets).toBe(3);
  });

  it('normalizes double dashes in reps', () => {
    const cells = ['Curls', '3', '6--8', '', '', ''];
    const result = parseExerciseRow(cells);
    expect(result!.reps).toBe('6-8');
  });

  it('returns null for empty name', () => {
    const cells = ['1.', '', '3', '10', '', '', ''];
    const result = parseExerciseRow(cells);
    expect(result).toBeNull();
  });

  it('handles sets > 20 as invalid', () => {
    const cells = ['Deadlift', '25', '5', '', '', ''];
    const result = parseExerciseRow(cells);
    expect(result!.sets).toBe(3); // falls back to default
  });
});

describe('parseWorkbookRows', () => {
  it('parses a simple 2-day program', () => {
    const rows = [
      ['Trening I', '', '', '', '', ''],
      ['1.', 'Bench Press', '4', '8-10', '90s', '2/0/1/0'],
      ['2.', 'Rows', '3', '10', '60s', ''],
      ['Trening II', '', '', '', '', ''],
      ['1.', 'Squat', '5', '5', '180s', '3/1/1/0'],
    ];
    const result = parseWorkbookRows(rows, 'My Program');
    expect(result.name).toBe('My Program');
    expect(result.days).toHaveLength(2);
    expect(result.days[0].name).toBe('Trening I');
    expect(result.days[0].exercises).toHaveLength(2);
    expect(result.days[1].name).toBe('Trening II');
    expect(result.days[1].exercises).toHaveLength(1);
  });

  it('skips instruction rows', () => {
    const rows = [
      ['Instrukcja do programu', '', '', '', '', ''],
      ['W każdej serii daj z siebie maksimum', '', '', '', '', ''],
      ['Trening I', '', '', '', '', ''],
      ['1.', 'Bench Press', '4', '8-10', '', ''],
    ];
    const result = parseWorkbookRows(rows, 'Test');
    expect(result.days).toHaveLength(1);
    expect(result.days[0].exercises).toHaveLength(1);
  });

  it('skips column header rows', () => {
    const rows = [
      ['Trening I', '', '', '', '', ''],
      ['Numer', 'Nazwa', 'Serie', 'Powtórzenia', 'Przerwa', 'Tempo'],
      ['1.', 'Bench Press', '4', '8-10', '90s', '2/0/1/0'],
    ];
    const result = parseWorkbookRows(rows, 'Test');
    expect(result.days[0].exercises).toHaveLength(1);
    expect(result.days[0].exercises[0].name).toBe('Bench Press');
  });

  it('returns empty program for no valid data', () => {
    const result = parseWorkbookRows([], 'ab');
    expect(result.days).toHaveLength(0);
    expect(result.name).toBe('Empty Program');
  });

  it('uses sheet name for program name when long enough', () => {
    const rows = [
      ['Trening I', '', '', '', '', ''],
      ['Push-ups', '3', '15', '', '', ''],
    ];
    const result = parseWorkbookRows(rows, 'Strength_Phase-1');
    expect(result.name).toBe('Strength Phase 1');
  });

  it('falls back to "Imported Program" for short sheet name', () => {
    const rows = [
      ['Trening I', '', '', '', '', ''],
      ['Push-ups', '3', '15', '', '', ''],
    ];
    const result = parseWorkbookRows(rows, 'S1');
    expect(result.name).toBe('Imported Program');
  });
});
