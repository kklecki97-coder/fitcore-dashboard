import { supabase } from '../lib/supabase';
import type { WorkoutProgram } from '../types';

/**
 * Use AI to review imported program exercises and separate real exercises from notes/instructions.
 * Notes get merged into the nearest exercise's notes field.
 */
export async function aiReviewImport(program: WorkoutProgram): Promise<WorkoutProgram> {
  // Build a compact representation for AI
  const daysData = program.days.map(day => ({
    dayName: day.name,
    items: day.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      tempo: ex.tempo,
      restSeconds: ex.restSeconds,
      notes: ex.notes,
    })),
  }));

  const systemPrompt = `You are a fitness program parser. You will receive workout days with a list of items that were imported from a spreadsheet. Some items are real exercises, but some are actually coach notes, instructions, progression rules, or general comments that got incorrectly parsed as exercises.

Your job: For each item, classify it as either "exercise" or "note".

Rules:
- Real exercises have recognizable exercise names (e.g. "Bench Press", "Squat", "Wyciskanie", "Przysiady", "Lat Pulldown", "Cable Fly", etc.)
- Notes/instructions are things like: progression rules, tempo instructions, general coaching advice, warmup instructions, rest day notes, superset labels, circuit descriptions, etc.
- If something looks like a section header or grouping label (e.g. "Superset A", "Circuit 1"), classify as "note"
- When in doubt, keep it as an exercise

Return JSON in this exact format:
{
  "days": [
    {
      "dayName": "...",
      "items": [
        { "index": 0, "type": "exercise" },
        { "index": 1, "type": "note", "attachTo": "previous" }
      ]
    }
  ]
}

For notes, "attachTo" should be "previous" (attach to exercise above) or "next" (attach to exercise below). If it's a general day-level note with no clear exercise to attach to, use "previous" (it will go to the last exercise, or be dropped if there's no exercise yet).`;

  const userMessage = JSON.stringify(daysData, null, 2);

  try {
    const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
      body: {
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0,
        max_tokens: 4000,
      },
    });

    if (error || data?.error) {
      console.error('AI review failed, returning original program:', error || data?.error);
      return program;
    }

    const text = (data?.content?.[0]?.text || '').trim();
    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const result = JSON.parse(jsonStr);

    // Apply AI classifications
    const reviewedProgram = { ...program, days: [...program.days] };

    for (const aiDay of result.days) {
      const dayIndex = reviewedProgram.days.findIndex(d => d.name === aiDay.dayName);
      if (dayIndex === -1) continue;

      const day = { ...reviewedProgram.days[dayIndex] };
      const originalExercises = [...day.exercises];
      const keepExercises: typeof originalExercises = [];
      const pendingNotes: Array<{ text: string; attachTo: 'previous' | 'next' }> = [];

      for (const item of aiDay.items) {
        const idx = item.index;
        if (idx < 0 || idx >= originalExercises.length) continue;

        if (item.type === 'exercise') {
          // Before adding this exercise, attach any pending "next" notes
          const ex = { ...originalExercises[idx] };
          if (pendingNotes.length > 0) {
            const notesToAttach = pendingNotes.filter(n => n.attachTo === 'next');
            if (notesToAttach.length > 0) {
              const noteText = notesToAttach.map(n => n.text).join('; ');
              ex.notes = ex.notes ? `${noteText}; ${ex.notes}` : noteText;
              // Remove attached notes from pending
              for (const n of notesToAttach) {
                const pi = pendingNotes.indexOf(n);
                if (pi >= 0) pendingNotes.splice(pi, 1);
              }
            }
            // Remaining "previous" notes with no previous exercise — attach to this one
            if (keepExercises.length === 0 && pendingNotes.length > 0) {
              const noteText = pendingNotes.map(n => n.text).join('; ');
              ex.notes = ex.notes ? `${noteText}; ${ex.notes}` : noteText;
              pendingNotes.length = 0;
            }
          }
          keepExercises.push(ex);
        } else {
          // It's a note — build the note text from the exercise name
          const noteText = originalExercises[idx].name;
          const attachTo = item.attachTo || 'previous';

          if (attachTo === 'previous' && keepExercises.length > 0) {
            const lastEx = keepExercises[keepExercises.length - 1];
            lastEx.notes = lastEx.notes ? `${lastEx.notes}; ${noteText}` : noteText;
          } else {
            pendingNotes.push({ text: noteText, attachTo });
          }
        }
      }

      // Flush any remaining pending notes to last exercise
      if (pendingNotes.length > 0 && keepExercises.length > 0) {
        const lastEx = keepExercises[keepExercises.length - 1];
        const noteText = pendingNotes.map(n => n.text).join('; ');
        lastEx.notes = lastEx.notes ? `${lastEx.notes}; ${noteText}` : noteText;
      }

      day.exercises = keepExercises;
      reviewedProgram.days[dayIndex] = day;
    }

    return reviewedProgram;
  } catch (err) {
    console.error('AI review parse error, returning original:', err);
    return program;
  }
}
