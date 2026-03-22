import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Loader2, Check, Dumbbell, User, ChevronRight,
  Plus, Trash2, ChevronDown, ChevronUp, Send, RotateCcw,
  Minus, Edit3, Copy,
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client, WorkoutProgram, WorkoutDay, Exercise } from '../types';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface AIProgramCreatorProps {
  clients: Client[];
  onGenerated: (program: WorkoutProgram) => void;
  onBack: () => void;
}

type Phase = 'pick-client' | 'brief' | 'generating' | 'review';
type Goal = 'hypertrophy' | 'strength' | 'fat-loss' | 'performance' | 'general';
type Level = 'beginner' | 'intermediate' | 'advanced';

interface BriefData {
  goal: Goal;
  daysPerWeek: number;
  level: Level;
  durationWeeks: number;
  notes: string;
}

// ═══════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════

const SYSTEM_PROMPT = `You are FitCore AI — a senior strength & conditioning coach with 15+ years of experience designing periodized training programs. You work inside the FitCore coaching platform.

A coach has submitted a brief for their client. Your job: design a complete, professional workout program based on that brief. The coach will review and edit your output, so aim for a strong 80% draft — not a generic filler program.

SESSION STRUCTURE:
- Start every session with 1-2 compound movements, then accessories/isolation work.
- Never program two heavy compound lifts for the same primary muscle group back-to-back.
- End sessions with abs/core or isolation finishers when volume allows.
- Keep total working sets per session between 16-25 (excluding warmup).

SPLIT SELECTION (based on days/week):
- 2 days: Full Body A / Full Body B
- 3 days: Push / Pull / Legs OR Full Body A / B / C
- 4 days: Upper / Lower x2 OR Push / Pull / Upper / Lower
- 5 days: Push / Pull / Legs / Upper / Lower
- 6 days: Push / Pull / Legs x2 (with variation between sessions)
- 7 days: PPL x2 + active recovery / specialization day
The coach may override this in notes — respect their split preference if stated.

EXERCISE SELECTION:
- Prioritize free weights (barbell, dumbbell) over machines unless the brief says otherwise.
- Every major muscle group should be trained 2x per week minimum.
- Do NOT repeat the exact same exercise on different days. Use variations (e.g. Flat Bench on Day 1, Incline DB Press on Day 4).
- For beginners: simpler movement patterns (Goblet Squat > Back Squat, Machine Rows > Barbell Rows).
- For advanced: more exercise variation, unilateral work, intensity techniques in notes (drop sets, pauses, myoreps).
- Always include at least one vertical pull and one horizontal pull per week.
- Balance push:pull volume roughly 1:1 across the week.

REP RANGES & LOADING (match to goal):
- Hypertrophy: 8-12 reps main lifts, 10-15 reps accessories. RPE 7-9.
- Strength: 3-6 reps main lifts, 6-10 reps accessories. RPE 8-9.5.
- Fat Loss: 8-15 reps, shorter rest, higher density. Superset where appropriate. RPE 7-8.
- Performance: power (3-5 reps explosive), strength-endurance (12-20), sport-specific in notes.
- General Fitness: mixed rep ranges (6-15), balanced approach.

RPE GUIDELINES:
- Compound lifts: RPE 7-8 (weeks 1-3), RPE 8-9 (weeks 4-6), deload RPE 6.
- Isolation / accessories: RPE 8-9, last set RPE 9-10.
- Beginners: cap at RPE 7-8 across the board.

TEMPO:
- Default: leave as "" (empty string).
- Only prescribe tempo when it adds value: hypertrophy eccentrics ("3-0-1-0"), pause squats ("2-2-1-0").

REST PERIODS:
- Heavy compounds: 150-180 seconds
- Medium compounds: 90-120 seconds
- Isolation / accessories: 60-90 seconds
- Fat loss / density: 45-60 seconds
- Supersets: 0 between exercises, 60-90 between sets

NOTES FIELD:
- Short coaching cues: "Full ROM", "Squeeze at top 1s", "Controlled negative".
- Progression: "Add 2.5kg when all sets hit top of rep range".
- Supersets: "Superset with [next exercise]".
- Keep notes to 1 sentence max.

WEEKLY VOLUME TARGETS (working sets per muscle group per week):
- Large muscles (chest, back, quads, hamstrings): 12-20 sets
- Small muscles (biceps, triceps, delts, calves): 8-14 sets
- Beginners: lower end. Advanced: upper end.

PERIODIZATION:
- If duration >= 6 weeks: build in a deload week (reduce volume by 40%, keep intensity).
- For hypertrophy: progressive overload through reps then weight increases.
- For strength: wave loading or linear progression based on level.

COACH'S NOTES HANDLING:
- If they specify exercises: use those exercises exactly. Fill in sets/reps/RPE based on the goal.
- If they mention injuries/limitations: avoid contraindicated movements and note alternatives.
- If they request specific methods (5x5, GVT, etc.): follow that method.
- If they request a specific split: use it even if it doesn't match the days rule above.
- If notes are empty: you have full creative control. Design the best program for the goal and level.

OUTPUT FORMAT:
Respond with ONLY valid JSON. No markdown, no code blocks, no explanation. Raw JSON only.

{
  "programName": "string — professional name reflecting the goal",
  "durationWeeks": number,
  "days": [
    {
      "name": "string — e.g. 'Day 1 — Push (Chest & Shoulders)'",
      "exercises": [
        {
          "name": "string — standard exercise name in English",
          "sets": number,
          "reps": "string — e.g. '8-12', '5', 'AMRAP'",
          "weight": "string — e.g. 'RPE 8', '70% 1RM', 'moderate', 'BW'",
          "rpe": number_or_null,
          "tempo": "string — e.g. '3-0-1-0' or ''",
          "restSeconds": number_or_null,
          "notes": "string — short coaching cue or ''"
        }
      ]
    }
  ]
}

RULES:
- Exercise names always in English.
- "reps" is always a string.
- "weight" is a string — use RPE-based or percentage-based, not absolute kg.
- "rpe" is a number 1-10 or null.
- "restSeconds" is a number in seconds or null.
- "tempo" is "" unless specifically needed.
- Every day must have at least 1 exercise. No empty days.`;

const AI_TWEAK_PROMPT = `You are FitCore AI. A coach wants to modify an existing workout program. They will describe what they want changed in natural language.

You will receive:
1. The current program as JSON
2. The coach's modification request

Apply the requested changes and return the FULL updated program JSON in the exact same format. Do not remove or change anything the coach didn't ask about.

RULES:
- "swap X for Y" → replace that exercise, keep same sets/reps/RPE scheme.
- "add X to day Y" → add in logical position (compounds first, isolation last).
- "remove X" → remove it.
- "more volume for X" → add 1-2 sets or an extra exercise for that muscle group.
- "less rest" / "make it harder" → adjust restSeconds and/or RPE.
- Return ONLY the full updated JSON. No explanation text.`;

// ═══════════════════════════════════════
// LABELS
// ═══════════════════════════════════════

const GOAL_LABELS: Record<Goal, { en: string; pl: string }> = {
  hypertrophy: { en: 'Hypertrophy', pl: 'Hipertrofia' },
  strength: { en: 'Strength', pl: 'Siła' },
  'fat-loss': { en: 'Fat Loss', pl: 'Redukcja' },
  performance: { en: 'Performance', pl: 'Performance' },
  general: { en: 'General', pl: 'Ogólny' },
};

const LEVEL_LABELS: Record<Level, { en: string; pl: string }> = {
  beginner: { en: 'Beginner', pl: 'Początkujący' },
  intermediate: { en: 'Intermediate', pl: 'Średniozaawansowany' },
  advanced: { en: 'Advanced', pl: 'Zaawansowany' },
};

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════

export default function AIProgramCreator({ clients, onGenerated, onBack }: AIProgramCreatorProps) {
  const isMobile = useIsMobile();
  const { lang } = useLang();

  // Phase
  const [phase, setPhase] = useState<Phase>('pick-client');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Brief form
  const [brief, setBrief] = useState<BriefData>({
    goal: 'hypertrophy',
    daysPerWeek: 4,
    level: 'intermediate',
    durationWeeks: 8,
    notes: '',
  });

  // Generated program
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [error, setError] = useState('');

  // Review state
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [tweakInput, setTweakInput] = useState('');
  const [tweaking, setTweaking] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const t = (en: string, pl: string) => lang === 'pl' ? pl : en;

  // ─── API CALLS ───

  const generateProgram = async () => {
    setPhase('generating');
    setError('');

    const clientInfo = selectedClient
      ? `\nCLIENT CONTEXT: Building a program for ${selectedClient.name} (${selectedClient.plan} plan, goals: ${selectedClient.goals.join(', ')})`
      : '';

    const userMessage = `CLIENT: ${selectedClient?.name || 'General template'}
GOAL: ${GOAL_LABELS[brief.goal].en}
TRAINING DAYS: ${brief.daysPerWeek}
LEVEL: ${LEVEL_LABELS[brief.level].en}
DURATION: ${brief.durationWeeks} weeks
ADDITIONAL NOTES: ${brief.notes.trim() || 'None — full creative control'}

Generate the complete program now.`;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          system: SYSTEM_PROMPT + clientInfo,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.7,
          max_tokens: 8000,
        },
      });
      if (fnError) throw new Error(fnError.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);

      const content = (data.content?.[0]?.text || '').trim();
      const jsonStr = content.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      const generated = JSON.parse(jsonStr);

      const wp: WorkoutProgram = {
        id: crypto.randomUUID(),
        name: generated.programName || 'AI Generated Program',
        status: 'draft',
        durationWeeks: generated.durationWeeks || brief.durationWeeks,
        clientIds: selectedClientId ? [selectedClientId] : [],
        days: (generated.days || []).map((day: { name: string; exercises: Array<{ name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; restSeconds: number | null; notes: string }> }): WorkoutDay => ({
          id: crypto.randomUUID(),
          name: day.name,
          exercises: (day.exercises || []).map((ex: { name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; restSeconds: number | null; notes: string }): Exercise => ({
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

      setProgram(wp);
      // Expand all days by default
      setExpandedDays(new Set(wp.days.map(d => d.id)));
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('brief');
    }
  };

  const handleTweak = async () => {
    if (!tweakInput.trim() || !program || tweaking) return;
    setTweaking(true);
    setError('');

    const programJson = {
      programName: program.name,
      durationWeeks: program.durationWeeks,
      days: program.days.map(d => ({
        name: d.name,
        exercises: d.exercises.map(ex => ({
          name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight,
          rpe: ex.rpe, tempo: ex.tempo, restSeconds: ex.restSeconds, notes: ex.notes,
        })),
      })),
    };

    try {
      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          system: AI_TWEAK_PROMPT,
          messages: [{ role: 'user', content: `CURRENT PROGRAM:\n${JSON.stringify(programJson, null, 2)}\n\nREQUEST: ${tweakInput.trim()}` }],
          temperature: 0.7,
          max_tokens: 8000,
        },
      });
      if (fnError) throw new Error(fnError.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);

      const content = (data.content?.[0]?.text || '').trim();
      const jsonStr = content.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      const generated = JSON.parse(jsonStr);

      const wp: WorkoutProgram = {
        ...program,
        name: generated.programName || program.name,
        durationWeeks: generated.durationWeeks || program.durationWeeks,
        days: (generated.days || []).map((day: { name: string; exercises: Array<{ name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; restSeconds: number | null; notes: string }> }): WorkoutDay => ({
          id: crypto.randomUUID(),
          name: day.name,
          exercises: (day.exercises || []).map((ex: { name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; restSeconds: number | null; notes: string }): Exercise => ({
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
        updatedAt: new Date().toISOString().split('T')[0],
      };

      setProgram(wp);
      setExpandedDays(new Set(wp.days.map(d => d.id)));
      setTweakInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tweak failed');
    } finally {
      setTweaking(false);
    }
  };

  // ─── INLINE EDIT HELPERS ───

  const updateExercise = (dayId: string, exId: string, field: keyof Exercise, value: string | number | null) => {
    if (!program) return;
    setProgram({
      ...program,
      days: program.days.map(d => d.id !== dayId ? d : {
        ...d,
        exercises: d.exercises.map(ex => ex.id !== exId ? ex : { ...ex, [field]: value }),
      }),
    });
  };

  const removeExercise = (dayId: string, exId: string) => {
    if (!program) return;
    setProgram({
      ...program,
      days: program.days.map(d => d.id !== dayId ? d : {
        ...d,
        exercises: d.exercises.filter(ex => ex.id !== exId),
      }),
    });
  };

  const duplicateExercise = (dayId: string, exId: string) => {
    if (!program) return;
    setProgram({
      ...program,
      days: program.days.map(d => {
        if (d.id !== dayId) return d;
        const idx = d.exercises.findIndex(ex => ex.id === exId);
        if (idx === -1) return d;
        const clone = { ...d.exercises[idx], id: crypto.randomUUID() };
        const newExercises = [...d.exercises];
        newExercises.splice(idx + 1, 0, clone);
        return { ...d, exercises: newExercises };
      }),
    });
  };

  const moveExercise = (dayId: string, exId: string, direction: 'up' | 'down') => {
    if (!program) return;
    setProgram({
      ...program,
      days: program.days.map(d => {
        if (d.id !== dayId) return d;
        const idx = d.exercises.findIndex(ex => ex.id === exId);
        if (idx === -1) return d;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= d.exercises.length) return d;
        const newExercises = [...d.exercises];
        [newExercises[idx], newExercises[swapIdx]] = [newExercises[swapIdx], newExercises[idx]];
        return { ...d, exercises: newExercises };
      }),
    });
  };

  const addExercise = (dayId: string) => {
    if (!program) return;
    const newEx: Exercise = {
      id: crypto.randomUUID(),
      name: 'New Exercise',
      sets: 3,
      reps: '10',
      weight: '',
      rpe: null,
      tempo: '',
      restSeconds: 90,
      notes: '',
    };
    setProgram({
      ...program,
      days: program.days.map(d => d.id !== dayId ? d : { ...d, exercises: [...d.exercises, newEx] }),
    });
    setEditingExercise(newEx.id);
  };

  const removeDay = (dayId: string) => {
    if (!program) return;
    setProgram({ ...program, days: program.days.filter(d => d.id !== dayId) });
  };

  const renameDayInline = (dayId: string, newName: string) => {
    if (!program) return;
    setProgram({
      ...program,
      days: program.days.map(d => d.id !== dayId ? d : { ...d, name: newName }),
    });
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dayId) ? next.delete(dayId) : next.add(dayId);
      return next;
    });
  };

  // ═══════════════════════════════════════
  // PHASE 1: PICK CLIENT
  // ═══════════════════════════════════════

  if (phase === 'pick-client') {
    return (
      <div style={{ ...s.outerPage, padding: isMobile ? '14px 16px' : '24px' }}>
        <div style={{ ...s.centered, padding: isMobile ? '12px 0' : '24px 20px' }}>
          <motion.button onClick={onBack} style={{ ...s.backBtn, ...(isMobile ? { fontSize: '13px', padding: '6px 10px' } : {}) }} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
            <ArrowLeft size={isMobile ? 13 : 15} /> {t('Back', 'Powrót')}
          </motion.button>
          <motion.div style={s.card} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
            <div style={s.cardGlow} />
            <div style={s.iconWrap}>
              <div style={{ ...s.iconBox, ...(isMobile ? { width: '44px', height: '44px', borderRadius: '12px' } : {}) }}><Sparkles size={isMobile ? 18 : 22} /></div>
            </div>
            <h2 style={{ ...s.title, ...(isMobile ? { fontSize: '18px' } : {}) }}>{t('AI Program Builder', 'Kreator AI')}</h2>
            <p style={{ ...s.subtitle, ...(isMobile ? { fontSize: '12px' } : {}) }}>{t('Select a client to get started', 'Wybierz klienta')}</p>
            <div style={s.clientList}>
              {clients.filter(c => c.status === 'active').map(client => (
                <motion.button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  style={{
                    ...s.clientCard,
                    ...(isMobile ? { padding: '10px 12px', gap: '10px' } : {}),
                    borderColor: selectedClientId === client.id ? 'var(--accent-primary)' : 'var(--glass-border)',
                    background: selectedClientId === client.id ? 'rgba(0,229,200,0.08)' : 'transparent',
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div style={{ ...s.avatar, ...(isMobile ? { width: '28px', height: '28px', borderRadius: '7px', fontSize: '11px' } : {}), background: selectedClientId === client.id ? 'var(--accent-primary)' : 'var(--bg-subtle-hover)' }}>
                    {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={s.clientInfo}>
                    <span style={{ ...s.clientName, ...(isMobile ? { fontSize: '14px' } : {}) }}>{client.name}</span>
                    <span style={{ ...s.clientMeta, ...(isMobile ? { fontSize: '11px' } : {}) }}>{client.plan}</span>
                  </div>
                  {selectedClientId === client.id ? (
                    <div style={s.checkMark}><Check size={13} /></div>
                  ) : (
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  )}
                </motion.button>
              ))}
            </div>
            <motion.button
              onClick={() => setPhase('brief')}
              style={{ ...s.primaryBtn, ...(isMobile ? { fontSize: '13px' } : {}), opacity: selectedClientId ? 1 : 0.35, pointerEvents: selectedClientId ? 'auto' : 'none' }}
              whileHover={selectedClientId ? { scale: 1.01 } : {}}
              whileTap={selectedClientId ? { scale: 0.99 } : {}}
            >
              <Sparkles size={15} /> {t('Continue', 'Dalej')}
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 2: BRIEF FORM
  // ═══════════════════════════════════════

  if (phase === 'brief') {
    return (
      <div style={{ ...s.outerPage, padding: isMobile ? '14px 16px' : '24px' }}>
        <div style={{ ...s.centered, padding: isMobile ? '12px 0' : '24px 20px' }}>
          <motion.button onClick={() => setPhase('pick-client')} style={{ ...s.backBtn, ...(isMobile ? { fontSize: '13px', padding: '6px 10px' } : {}) }} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
            <ArrowLeft size={isMobile ? 13 : 15} /> {t('Back', 'Powrót')}
          </motion.button>

          <motion.div style={{ ...s.card, maxWidth: '560px' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={s.cardGlow} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              {selectedClient && (
                <div style={{ ...s.avatar, background: 'var(--accent-primary)', width: '32px', height: '32px', fontSize: '12px' }}>
                  {selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <h2 style={{ ...s.title, fontSize: isMobile ? '18px' : '22px', textAlign: 'left', marginBottom: '2px' }}>
                  {t('Program Brief', 'Brief programu')}
                </h2>
                {selectedClient && <p style={{ ...s.subtitle, textAlign: 'left', margin: 0 }}>{selectedClient.name}</p>}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={s.errorBox}>
                {error}
              </div>
            )}

            {/* Goal */}
            <div style={s.formGroup}>
              <label style={s.label}>{t('Training Goal', 'Cel treningowy')} *</label>
              <div style={s.chipsRow}>
                {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setBrief(b => ({ ...b, goal: g }))}
                    style={{ ...s.chip, ...(brief.goal === g ? s.chipActive : {}) }}
                  >
                    {GOAL_LABELS[g][lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Days per week */}
            <div style={s.formGroup}>
              <label style={s.label}>{t('Days per week', 'Dni w tygodniu')} *</label>
              <div style={s.stepperRow}>
                <button style={s.stepperBtn} onClick={() => setBrief(b => ({ ...b, daysPerWeek: Math.max(2, b.daysPerWeek - 1) }))}><Minus size={16} /></button>
                <span style={s.stepperValue}>{brief.daysPerWeek}</span>
                <button style={s.stepperBtn} onClick={() => setBrief(b => ({ ...b, daysPerWeek: Math.min(7, b.daysPerWeek + 1) }))}><Plus size={16} /></button>
              </div>
            </div>

            {/* Level */}
            <div style={s.formGroup}>
              <label style={s.label}>{t('Experience Level', 'Poziom zaawansowania')} *</label>
              <div style={s.chipsRow}>
                {(Object.keys(LEVEL_LABELS) as Level[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setBrief(b => ({ ...b, level: l }))}
                    style={{ ...s.chip, ...(brief.level === l ? s.chipActive : {}) }}
                  >
                    {LEVEL_LABELS[l][lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={s.formGroup}>
              <label style={s.label}>{t('Duration (weeks)', 'Czas trwania (tygodnie)')}</label>
              <div style={s.stepperRow}>
                <button style={s.stepperBtn} onClick={() => setBrief(b => ({ ...b, durationWeeks: Math.max(4, b.durationWeeks - 1) }))}><Minus size={16} /></button>
                <span style={s.stepperValue}>{brief.durationWeeks}</span>
                <button style={s.stepperBtn} onClick={() => setBrief(b => ({ ...b, durationWeeks: Math.min(16, b.durationWeeks + 1) }))}><Plus size={16} /></button>
              </div>
            </div>

            {/* Notes */}
            <div style={s.formGroup}>
              <label style={s.label}>{t('Additional notes', 'Dodatkowe uwagi')}</label>
              <textarea
                value={brief.notes}
                onChange={e => setBrief(b => ({ ...b, notes: e.target.value }))}
                placeholder={t(
                  'e.g. "Bench press 5x5 on Monday, no OHP due to shoulder injury, focus on back development"',
                  'np. "Bench press 5x5 w poniedziałek, brak OHP bo kontuzja barku, nacisk na rozwój pleców"'
                )}
                style={s.textarea}
                rows={3}
              />
            </div>

            {/* Generate button */}
            <motion.button
              onClick={generateProgram}
              style={{ ...s.primaryBtn, marginTop: '8px' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Sparkles size={15} /> {t('Generate Program', 'Wygeneruj program')}
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 3: GENERATING (loading)
  // ═══════════════════════════════════════

  if (phase === 'generating') {
    return (
      <div style={{ ...s.outerPage, padding: isMobile ? '14px 16px' : '24px' }}>
        <div style={{ ...s.centered, padding: '60px 20px' }}>
          <motion.div
            style={{ ...s.card, maxWidth: '420px', alignItems: 'center', padding: '48px 36px' }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={s.cardGlow} />
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ display: 'flex' }}>
              <Loader2 size={36} color="var(--accent-primary)" />
            </motion.div>
            <h2 style={{ ...s.title, fontSize: '20px', marginTop: '16px' }}>
              {t('Building your program...', 'Tworzenie programu...')}
            </h2>
            <p style={{ ...s.subtitle, maxWidth: '280px' }}>
              {t(
                'FitCore AI is designing a personalized training program. This takes about 10-15 seconds.',
                'FitCore AI projektuje spersonalizowany program treningowy. To zajmie ok. 10-15 sekund.'
              )}
            </p>
            {/* Brief summary */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
              <span style={s.tag}>{GOAL_LABELS[brief.goal][lang]}</span>
              <span style={s.tag}>{brief.daysPerWeek} {t('days', 'dni')}</span>
              <span style={s.tag}>{LEVEL_LABELS[brief.level][lang]}</span>
              <span style={s.tag}>{brief.durationWeeks} {t('weeks', 'tyg.')}</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 4: REVIEW & EDIT
  // ═══════════════════════════════════════

  if (!program) return null;

  const totalExercises = program.days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div style={{ ...s.outerPage, padding: isMobile ? '14px 16px' : '24px', overflow: 'auto' }}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <motion.button onClick={onBack} style={{ ...s.backBtn, ...(isMobile ? { fontSize: '13px', padding: '6px 10px' } : {}) }} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
            <ArrowLeft size={isMobile ? 13 : 15} /> {t('Back', 'Powrót')}
          </motion.button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button
              onClick={() => { setPhase('brief'); setError(''); }}
              style={{ ...s.secondaryBtn }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw size={14} /> {t('Regenerate', 'Regeneruj')}
            </motion.button>
            <motion.button
              onClick={() => onGenerated(program)}
              style={{ ...s.primaryBtn, width: 'auto', padding: '10px 20px' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Check size={14} /> {t('Save Program', 'Zapisz Program')}
            </motion.button>
          </div>
        </div>

        {/* Program header card */}
        <motion.div style={s.reviewHeaderCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ ...s.iconBox, width: '40px', height: '40px' }}><Dumbbell size={18} /></div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{program.name}</h2>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={s.tag}>{program.durationWeeks} {t('weeks', 'tyg.')}</span>
                <span style={s.tag}>{program.days.length} {t('days', 'dni')}</span>
                <span style={s.tag}>{totalExercises} {t('exercises', 'ćwiczeń')}</span>
                {selectedClient && <span style={s.tag}><User size={11} /> {selectedClient.name}</span>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Days */}
        <AnimatePresence initial={false}>
          {program.days.map((day, dayIdx) => {
            const isExpanded = expandedDays.has(day.id);
            return (
              <motion.div
                key={day.id}
                style={s.dayCard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: dayIdx * 0.04 }}
              >
                {/* Day header */}
                <div
                  style={s.dayHeader}
                  onClick={() => toggleDay(day.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}>
                    <div style={{ ...s.dayDot, background: dayIdx % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)' }} />
                    <input
                      value={day.name}
                      onChange={e => { e.stopPropagation(); renameDayInline(day.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      style={s.dayNameInput}
                    />
                    <span style={s.dayExCount}>{day.exercises.length} {t('exercises', 'ćw.')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button style={s.iconBtn} onClick={e => { e.stopPropagation(); removeDay(day.id); }} title={t('Remove day', 'Usuń dzień')}>
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
                  </div>
                </div>

                {/* Exercises */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={s.exerciseList}>
                        {day.exercises.map((ex, exIdx) => {
                          const isEditing = editingExercise === ex.id;
                          return (
                            <div key={ex.id} style={s.exerciseRow}>
                              <div style={s.exNum}>{exIdx + 1}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {isEditing ? (
                                  /* ── EDIT MODE ── */
                                  <div style={s.editGrid}>
                                    <div style={s.editField}>
                                      <label style={s.editLabel}>{t('Exercise', 'Ćwiczenie')}</label>
                                      <input value={ex.name} onChange={e => updateExercise(day.id, ex.id, 'name', e.target.value)} style={s.editInput} />
                                    </div>
                                    <div style={s.editFieldSmall}>
                                      <label style={s.editLabel}>{t('Sets', 'Serie')}</label>
                                      <input type="number" value={ex.sets} onChange={e => updateExercise(day.id, ex.id, 'sets', parseInt(e.target.value) || 0)} style={s.editInput} />
                                    </div>
                                    <div style={s.editFieldSmall}>
                                      <label style={s.editLabel}>{t('Reps', 'Powtórzenia')}</label>
                                      <input value={ex.reps} onChange={e => updateExercise(day.id, ex.id, 'reps', e.target.value)} style={s.editInput} />
                                    </div>
                                    <div style={s.editFieldSmall}>
                                      <label style={s.editLabel}>{t('Weight', 'Ciężar')}</label>
                                      <input value={ex.weight} onChange={e => updateExercise(day.id, ex.id, 'weight', e.target.value)} style={s.editInput} />
                                    </div>
                                    <div style={s.editFieldSmall}>
                                      <label style={s.editLabel}>RPE</label>
                                      <input type="number" value={ex.rpe ?? ''} onChange={e => updateExercise(day.id, ex.id, 'rpe', e.target.value ? parseFloat(e.target.value) : null)} style={s.editInput} />
                                    </div>
                                    <div style={s.editFieldSmall}>
                                      <label style={s.editLabel}>{t('Rest (s)', 'Przerwa (s)')}</label>
                                      <input type="number" value={ex.restSeconds ?? ''} onChange={e => updateExercise(day.id, ex.id, 'restSeconds', e.target.value ? parseInt(e.target.value) : null)} style={s.editInput} />
                                    </div>
                                    <div style={s.editFieldSmall}>
                                      <label style={s.editLabel}>Tempo</label>
                                      <input value={ex.tempo} onChange={e => updateExercise(day.id, ex.id, 'tempo', e.target.value)} style={s.editInput} />
                                    </div>
                                    <div style={{ ...s.editField, gridColumn: '1 / -1' }}>
                                      <label style={s.editLabel}>{t('Notes', 'Notatki')}</label>
                                      <input value={ex.notes} onChange={e => updateExercise(day.id, ex.id, 'notes', e.target.value)} style={s.editInput} />
                                    </div>
                                  </div>
                                ) : (
                                  /* ── VIEW MODE ── */
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style={s.exNameText}>{ex.name}</span>
                                    <span style={s.exBadge}>{ex.sets}×{ex.reps}</span>
                                    {ex.weight && <span style={s.exBadgeDim}>{ex.weight}</span>}
                                    {ex.rpe && <span style={s.exBadgeDim}>RPE {ex.rpe}</span>}
                                    {ex.restSeconds && <span style={s.exBadgeDim}>{ex.restSeconds}s</span>}
                                    {ex.tempo && <span style={s.exBadgeDim}>{ex.tempo}</span>}
                                    {ex.notes && <span style={s.exNote}>{ex.notes}</span>}
                                  </div>
                                )}
                              </div>
                              {/* Action buttons */}
                              <div style={s.exActions}>
                                <button style={s.iconBtn} onClick={() => setEditingExercise(isEditing ? null : ex.id)} title={t('Edit', 'Edytuj')}>
                                  <Edit3 size={13} color={isEditing ? 'var(--accent-primary)' : undefined} />
                                </button>
                                <button style={s.iconBtn} onClick={() => moveExercise(day.id, ex.id, 'up')} title={t('Move up', 'W górę')} disabled={exIdx === 0}>
                                  <ChevronUp size={13} />
                                </button>
                                <button style={s.iconBtn} onClick={() => moveExercise(day.id, ex.id, 'down')} title={t('Move down', 'W dół')} disabled={exIdx === day.exercises.length - 1}>
                                  <ChevronDown size={13} />
                                </button>
                                <button style={s.iconBtn} onClick={() => duplicateExercise(day.id, ex.id)} title={t('Duplicate', 'Duplikuj')}>
                                  <Copy size={13} />
                                </button>
                                <button style={s.iconBtn} onClick={() => removeExercise(day.id, ex.id)} title={t('Remove', 'Usuń')}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add exercise button */}
                        <button onClick={() => addExercise(day.id)} style={s.addExBtn}>
                          <Plus size={14} /> {t('Add exercise', 'Dodaj ćwiczenie')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* AI Tweak bar */}
        <motion.div style={s.tweakBar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Tweak</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={tweakInput}
              onChange={e => setTweakInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTweak(); } }}
              placeholder={t(
                'e.g. "swap leg press for hack squat on day 3" or "add more back volume"',
                'np. "zamień leg press na hack squat w dniu 3" lub "dodaj więcej objętości na plecy"'
              )}
              style={s.tweakInput}
              disabled={tweaking}
            />
            <motion.button
              onClick={handleTweak}
              style={{ ...s.primaryBtn, width: 'auto', padding: '10px 16px', opacity: tweakInput.trim() && !tweaking ? 1 : 0.35 }}
              disabled={!tweakInput.trim() || tweaking}
              whileHover={tweakInput.trim() && !tweaking ? { scale: 1.02 } : {}}
              whileTap={tweakInput.trim() && !tweaking ? { scale: 0.98 } : {}}
            >
              {tweaking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </motion.button>
          </div>
        </motion.div>

        {/* Bottom spacer */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════

const s: Record<string, React.CSSProperties> = {
  outerPage: {
    height: 'calc(100vh - var(--header-height))',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
  },
  centered: {
    width: '100%', maxWidth: '480px', padding: '24px 20px',
    display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto',
    margin: '0 auto',
  },
  card: {
    position: 'relative',
    borderRadius: '16px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)', padding: '36px 28px 28px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 30px rgba(0,0,0,0.15), 0 0 40px rgba(0,229,200,0.04)',
  },
  cardGlow: {
    position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
    width: '200px', height: '100px', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(0,229,200,0.12), transparent 70%)',
    pointerEvents: 'none',
  },
  iconWrap: { position: 'relative', display: 'flex', justifyContent: 'center' },
  iconBox: {
    width: '52px', height: '52px', borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-on-accent)', boxShadow: '0 0 24px rgba(0,229,200,0.2)',
  },
  title: { fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textAlign: 'center' as const },
  subtitle: { fontSize: '15px', color: 'var(--text-tertiary)', margin: '0 0 4px', textAlign: 'center' as const },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
    borderRadius: '8px', border: '1px solid var(--glass-border)',
    background: 'transparent', color: 'var(--text-tertiary)',
    fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-display)', cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px 0', width: '100%', borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    border: 'none', color: 'var(--text-on-accent)', fontSize: '15px', fontWeight: 700,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    boxShadow: '0 0 20px rgba(0,229,200,0.15)',
  },
  secondaryBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
    borderRadius: '10px', border: '1px solid var(--glass-border)',
    background: 'transparent', color: 'var(--text-secondary)',
    fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer',
  },

  // Client list
  clientList: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' },
  clientCard: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
    borderRadius: '10px', border: '1px solid var(--glass-border)',
    cursor: 'pointer', textAlign: 'left' as const, width: '100%', background: 'transparent',
    fontFamily: 'var(--font-display)', transition: 'all 0.12s',
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-on-accent)', flexShrink: 0,
  },
  clientInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  clientName: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' },
  clientMeta: { fontSize: '13px', color: 'var(--text-tertiary)' },
  checkMark: {
    width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-accent)', flexShrink: 0,
  },

  // Brief form
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' },
  chipsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  chip: {
    padding: '8px 16px', borderRadius: '20px',
    border: '1px solid var(--glass-border)', background: 'transparent',
    color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  chipActive: {
    borderColor: 'var(--accent-primary)', background: 'rgba(0,229,200,0.1)',
    color: 'var(--accent-primary)',
  },
  stepperRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
  },
  stepperBtn: {
    width: '36px', height: '36px', borderRadius: '10px',
    border: '1px solid var(--glass-border)', background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: 600,
  },
  stepperValue: {
    fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', minWidth: '32px', textAlign: 'center' as const,
  },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid var(--glass-border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-display)',
    outline: 'none', resize: 'vertical' as const, lineHeight: 1.5, boxSizing: 'border-box' as const,
  },
  errorBox: {
    padding: '10px 14px', borderRadius: '8px',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444', fontSize: '13px',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '4px 10px', borderRadius: '6px',
    background: 'rgba(0,229,200,0.08)', border: '1px solid rgba(0,229,200,0.15)',
    color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },

  // Review phase
  reviewHeaderCard: {
    borderRadius: '14px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)', padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  dayCard: {
    borderRadius: '14px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)', overflow: 'hidden',
  },
  dayHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', cursor: 'pointer',
    borderBottom: '1px solid transparent',
  },
  dayDot: {
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
  },
  dayNameInput: {
    flex: 1, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: 'var(--font-display)', padding: '2px 4px', borderRadius: '4px',
    cursor: 'text',
  },
  dayExCount: {
    fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0,
  },
  exerciseList: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    padding: '4px 12px 12px',
  },
  exerciseRow: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    padding: '10px 12px', borderRadius: '8px',
    transition: 'background 0.12s',
  },
  exNum: {
    width: '24px', height: '24px', borderRadius: '6px',
    background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: '2px',
  },
  exNameText: {
    fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
  },
  exBadge: {
    padding: '2px 8px', borderRadius: '4px',
    background: 'rgba(0,229,200,0.1)', color: 'var(--accent-primary)',
    fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)',
  },
  exBadgeDim: {
    padding: '2px 8px', borderRadius: '4px',
    background: 'var(--bg-elevated)', color: 'var(--text-tertiary)',
    fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)',
  },
  exNote: {
    fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' as const,
  },
  exActions: {
    display: 'flex', gap: '2px', flexShrink: 0, marginTop: '2px',
  },
  iconBtn: {
    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
    background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.12s',
  },
  addExBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '8px', borderRadius: '8px',
    border: '1px dashed var(--glass-border)', background: 'transparent',
    color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    marginTop: '4px',
  },

  // Edit mode grid
  editGrid: {
    display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '8px',
  },
  editField: { display: 'flex', flexDirection: 'column', gap: '3px' },
  editFieldSmall: { display: 'flex', flexDirection: 'column', gap: '3px' },
  editLabel: { fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  editInput: {
    padding: '6px 8px', borderRadius: '6px',
    border: '1px solid var(--glass-border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-display)',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  },

  // AI Tweak bar
  tweakBar: {
    borderRadius: '14px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)', padding: '16px 20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  tweakInput: {
    flex: 1, padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--glass-border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-display)',
    outline: 'none', boxSizing: 'border-box' as const,
  },
};
