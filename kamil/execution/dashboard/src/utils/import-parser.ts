import type { WorkoutProgram, WorkoutDay, Exercise } from '../types';

/**
 * Detect if a row is a training day header (e.g. "Trening I", "Góra A", "Push").
 */
export function isTrainingHeader(firstCell: string, secondCell: string): boolean {
  return /^trening\s/i.test(firstCell) ||
    (/^(g[oó]ra|d[oó][lł]|upper|lower|push|pull|legs|full)/i.test(firstCell) && !secondCell);
}

/**
 * Detect if a row is an instruction/header row that should be skipped.
 */
export function isSkippableRow(joinedLower: string): boolean {
  const skipPatterns = [
    'instrukcja', 'progresja',
    'w każdej serii', 'serie rozgrzewkowe',
    'ćwiczenia powinny', 'nie zmieniaj',
    'serie każdego', 'treningi wykonujesz',
    'do każdego ćwiczenia', '1 sekunda',
    'raz w tygodniu', 'na razie będzie',
    'z tygodnia na', 'ilość powtórzeń',
    'następnie dodajesz', 'jeżeli dojdziesz',
    'zwiększać od',
  ];
  return skipPatterns.some(p => joinedLower.includes(p)) || joinedLower.startsWith('instrukcja') || joinedLower.startsWith('progresja');
}

/**
 * Detect if a row is a column header (e.g. "Numer", "#", "Nazwa").
 */
export function isColumnHeader(firstCell: string, secondCell: string): boolean {
  return /^numer/i.test(firstCell) || /^#/i.test(firstCell) || /^nazwa/i.test(secondCell);
}

/**
 * Parse a single exercise row from spreadsheet cells.
 */
export function parseExerciseRow(cells: string[]): Exercise | null {
  const firstCell = cells[0] || '';
  const firstIsNum = /^\d+\.?$/.test(firstCell);
  const offset = firstIsNum ? 1 : 0;

  const name = cells[offset] || '';
  if (!name) return null;

  // Parse sets
  const setsStr = cells[offset + 1] || '';
  const parsedSets = parseInt(setsStr);
  const sets = (!isNaN(parsedSets) && parsedSets > 0 && parsedSets <= 20) ? parsedSets : 3;

  // Parse reps (could be "8-12", "6--8", "AMRAP", etc.)
  const reps = (cells[offset + 2] || '10').replace(/--/g, '-');

  // Parse rest (could be "90s", "120s", "150", etc.)
  const restStr = cells[offset + 3] || '';
  const restMatch = restStr.match(/(\d+)/);
  const restSeconds = restMatch ? parseInt(restMatch[1]) : null;

  // Parse tempo (e.g. "2/0/1/0", "3-1-2-0")
  const tempo = cells[offset + 4] || '';

  // Parse notes
  const notes = cells[offset + 5] || '';

  return {
    id: crypto.randomUUID(),
    name,
    sets,
    reps,
    weight: '',
    rpe: null,
    tempo,
    restSeconds,
    notes,
  };
}

/**
 * Parse spreadsheet rows into a WorkoutProgram.
 * Expects rows as string[][] (from XLSX.utils.sheet_to_json with header:1).
 */
export function parseWorkbookRows(rows: string[][], sheetName: string): WorkoutProgram {
  const days: WorkoutDay[] = [];
  let currentDay: WorkoutDay | null = null;

  for (const row of rows) {
    const cells = row.map(c => String(c ?? '').trim());
    const joined = cells.join('').toLowerCase();

    if (!joined) continue;
    if (isSkippableRow(joined)) continue;

    const firstCell = cells[0];

    if (isTrainingHeader(firstCell, cells[1] || '')) {
      const dayName = cells.filter(c => c).join(' ').replace(/\s+/g, ' ');
      currentDay = {
        id: crypto.randomUUID(),
        name: dayName,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    if (isColumnHeader(firstCell, cells[1] || '')) continue;

    if (!currentDay) continue;

    const exercise = parseExerciseRow(cells);
    if (exercise) currentDay.exercises.push(exercise);
  }

  const programName = sheetName && sheetName.length > 3
    ? sheetName.replace(/[_-]/g, ' ')
    : days.length > 0
      ? 'Imported Program'
      : 'Empty Program';

  return {
    id: crypto.randomUUID(),
    name: programName,
    status: 'draft',
    durationWeeks: 4,
    clientIds: [],
    days,
    isTemplate: false,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
}
