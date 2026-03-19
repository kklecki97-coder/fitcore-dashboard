import type { WorkoutProgram, WorkoutDay, Exercise } from '../types';

interface AIGeneratedDay {
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    weight: string;
    rpe: number | null;
    tempo: string;
    restSeconds: number | null;
    notes: string;
  }>;
}

interface AIGeneratedProgram {
  programName?: string;
  durationWeeks?: number;
  days: AIGeneratedDay[];
  trackedLifts?: Array<{ name: string; currentValue: number | null }>;
  clientGoals?: string[];
}

/**
 * Parse a raw JSON string from Claude AI into a WorkoutProgram.
 * Strips markdown code fences and handles default values.
 */
export function parseAIProgramResponse(jsonContent: string, clientId?: string): {
  program: WorkoutProgram;
  trackedLifts: Record<string, number | null>;
  clientGoals: string[];
} {
  const jsonStr = jsonContent.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  const generated: AIGeneratedProgram = JSON.parse(jsonStr);

  const program: WorkoutProgram = {
    id: crypto.randomUUID(),
    name: generated.programName || 'AI Generated Program',
    status: 'draft',
    durationWeeks: generated.durationWeeks || 8,
    clientIds: clientId ? [clientId] : [],
    days: generated.days.map((day): WorkoutDay => ({
      id: crypto.randomUUID(),
      name: day.name,
      exercises: day.exercises.map((ex): Exercise => ({
        id: crypto.randomUUID(),
        name: ex.name,
        sets: ex.sets || 3,
        reps: String(ex.reps || '10'),
        weight: ex.weight || '',
        rpe: ex.rpe ?? null,
        tempo: ex.tempo || '',
        restSeconds: ex.restSeconds ?? null,
        notes: ex.notes || '',
      })),
    })),
    isTemplate: false,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };

  // Extract tracked lifts
  const trackedLifts: Record<string, number | null> = {};
  if (generated.trackedLifts) {
    for (const lift of generated.trackedLifts) {
      const key = lift.name.toLowerCase().replace(/\s+/g, '_');
      if (key.includes('bench')) trackedLifts.bench_press = lift.currentValue ?? null;
      else if (key.includes('squat')) trackedLifts.squat = lift.currentValue ?? null;
      else if (key.includes('deadlift') || key.includes('dead_lift')) trackedLifts.deadlift = lift.currentValue ?? null;
    }
  }

  return {
    program,
    trackedLifts,
    clientGoals: generated.clientGoals ?? [],
  };
}
