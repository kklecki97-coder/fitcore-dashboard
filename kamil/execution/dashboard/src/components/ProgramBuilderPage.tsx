import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Plus, Minus, Trash2, X, ChevronUp, ChevronDown,
  Edit3, Clock, Dumbbell, Check, Copy,
} from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { useToast } from './Toast';
import type { WorkoutProgram, WorkoutDay, Exercise, CatalogExercise } from '../types';

interface ProgramBuilderPageProps {
  program: WorkoutProgram | null;
  exerciseCatalog: CatalogExercise[];
  onSave: (program: WorkoutProgram) => void;
  onBack: () => void;
  backLabel?: string;
}

function NumberStepper({ value, onChange, min, max, step = 1, placeholder, style: wrapStyle }: {
  value: string | number; onChange: (v: string) => void; min?: number; max?: number; step?: number; placeholder?: string; style?: React.CSSProperties;
}) {
  const strVal = String(value ?? '');
  const numVal = strVal === '' ? null : parseFloat(strVal);
  const canDec = numVal !== null && (min === undefined || Math.round((numVal - step) * 100) / 100 >= min);
  const canInc = numVal !== null && (max === undefined || Math.round((numVal + step) * 100) / 100 <= max);

  const adjust = (dir: 1 | -1) => {
    if (numVal === null) {
      const initial = placeholder ? parseFloat(placeholder) : (dir === 1 ? (min ?? 0) : (max ?? 0));
      onChange(String(initial));
    } else {
      const next = Math.round((numVal + dir * step) * 100) / 100;
      if (min !== undefined && next < min) return;
      if (max !== undefined && next > max) return;
      onChange(String(next));
    }
  };

  return (
    <div style={{ ...pbStepperStyles.wrap, ...wrapStyle }}>
      <button style={{ ...pbStepperStyles.btn, opacity: canDec ? 1 : 0.3 }} onClick={() => adjust(-1)} type="button">
        <Minus size={14} />
      </button>
      <input
        style={pbStepperStyles.input}
        type="number"
        value={strVal}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      <button style={{ ...pbStepperStyles.btn, opacity: canInc ? 1 : 0.3 }} onClick={() => adjust(1)} type="button">
        <Plus size={14} />
      </button>
    </div>
  );
}

const pbStepperStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    overflow: 'hidden',
  },
  btn: {
    width: '36px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '9px 4px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    textAlign: 'center',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
};

const emptyExercise = (): Exercise => ({
  id: crypto.randomUUID(),
  name: '',
  sets: 3,
  reps: '10',
  weight: '',
  rpe: null,
  tempo: '',
  restSeconds: null,
  notes: '',
});

export default function ProgramBuilderPage({
  program, exerciseCatalog, onSave, onBack, backLabel,
}: ProgramBuilderPageProps) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<WorkoutProgram>(() => {
    if (program) return JSON.parse(JSON.stringify(program));
    return {
      id: crypto.randomUUID(),
      name: '',
      status: 'active' as const,
      durationWeeks: 4,
      clientIds: [],
      days: [],
      isTemplate: false,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
  });

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [exerciseModal, setExerciseModal] = useState<{ editing: boolean; index: number } | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyExercise());
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [renamingDay, setRenamingDay] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Prepared for save indicator feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savedSnapshot, _setSavedSnapshot] = useState(() => JSON.stringify(program || ''));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showSavedIndicator, _setShowSavedIndicator] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick-add row state
  const [quickName, setQuickName] = useState('');
  const [quickSets, setQuickSets] = useState('3');
  const [quickReps, setQuickReps] = useState('10');
  const [quickShowSuggestions, setQuickShowSuggestions] = useState(false);
  const quickNameRef = useRef<HTMLInputElement>(null);
  const quickSuggestionsRef = useRef<HTMLDivElement>(null);

  // For new programs (status === 'draft' and days already populated), always allow save
  const isNewWithContent = draft.status === 'draft' && draft.days.length > 0 && draft.days.some(d => d.exercises.length > 0);
  const hasUnsavedChanges = isNewWithContent || JSON.stringify(draft) !== savedSnapshot;

  // Close suggestions on outside click
  const closeSuggestions = useCallback((e: MouseEvent) => {
    if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
    if (quickSuggestionsRef.current && !quickSuggestionsRef.current.contains(e.target as Node) &&
        quickNameRef.current && !quickNameRef.current.contains(e.target as Node)) {
      setQuickShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (showSuggestions || quickShowSuggestions) {
      document.addEventListener('mousedown', closeSuggestions);
      return () => document.removeEventListener('mousedown', closeSuggestions);
    }
  }, [showSuggestions, quickShowSuggestions, closeSuggestions]);

  // Quick-add filtered suggestions
  const quickFilteredSuggestions = quickName.trim() && exerciseCatalog
    ? exerciseCatalog.filter(ex => ex.name.toLowerCase().includes(quickName.toLowerCase()) || (ex.namePl && ex.namePl.toLowerCase().includes(quickName.toLowerCase()))).slice(0, 6)
    : [];

  // Quick-add submit
  const submitQuickAdd = () => {
    if (!quickName.trim()) return;
    const catalogMatch = exerciseCatalog.find(c => c.name.toLowerCase() === quickName.trim().toLowerCase());
    const ex: Exercise = {
      id: crypto.randomUUID(),
      name: quickName.trim(),
      sets: parseInt(quickSets) || catalogMatch?.defaultSets || 3,
      reps: quickReps !== '10' ? quickReps : (catalogMatch?.defaultReps || '10'),
      weight: '',
      rpe: null,
      tempo: '',
      restSeconds: catalogMatch?.defaultRestSeconds ?? null,
      notes: '',
    };
    setDraft(prev => {
      const newDraft = JSON.parse(JSON.stringify(prev));
      newDraft.days[activeDayIndex].exercises.push(ex);
      return newDraft;
    });
    setQuickName('');
    setQuickSets('3');
    setQuickReps('10');
    setQuickShowSuggestions(false);
    // Refocus name input for rapid adding
    setTimeout(() => quickNameRef.current?.focus(), 50);
  };

  const activeDay: WorkoutDay | undefined = draft.days[activeDayIndex];

  const totalExercises = draft.days.reduce((sum, d) => sum + d.exercises.length, 0);

  // ── Day management ──
  const addDay = () => {
    const newDay: WorkoutDay = {
      id: crypto.randomUUID(),
      name: `Day ${draft.days.length + 1}`,
      exercises: [],
    };
    setDraft(prev => ({ ...prev, days: [...prev.days, newDay] }));
    setActiveDayIndex(draft.days.length);
  };

  const removeDay = (index: number) => {
    if (!window.confirm(t.programBuilder.removeDayConfirm(draft.days[index].name))) return;
    setDraft(prev => ({ ...prev, days: prev.days.filter((_, i) => i !== index) }));
    if (activeDayIndex >= draft.days.length - 1) {
      setActiveDayIndex(Math.max(0, draft.days.length - 2));
    }
  };

  const duplicateDay = (index: number) => {
    const source = draft.days[index];
    const newDay: WorkoutDay = {
      ...JSON.parse(JSON.stringify(source)),
      id: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      exercises: source.exercises.map(e => ({
        ...e,
        id: crypto.randomUUID(),
      })),
    };
    setDraft(prev => ({
      ...prev,
      days: [...prev.days.slice(0, index + 1), newDay, ...prev.days.slice(index + 1)],
    }));
    setActiveDayIndex(index + 1);
  };

  const startRenameDay = (index: number) => {
    setRenamingDay(index);
    setRenameValue(draft.days[index].name);
  };

  const confirmRenameDay = () => {
    if (renamingDay === null || !renameValue.trim()) return;
    setDraft(prev => ({
      ...prev,
      days: prev.days.map((d, i) => i === renamingDay ? { ...d, name: renameValue.trim() } : d),
    }));
    setRenamingDay(null);
  };

  // ── Exercise management ──
  const openAddExercise = () => {
    setExerciseForm(emptyExercise());
    setExerciseSearch('');
    setExerciseModal({ editing: false, index: -1 });
  };

  const openEditExercise = (index: number) => {
    const ex = activeDay.exercises[index];
    setExerciseForm({ ...ex });
    setExerciseSearch(ex.name);
    setExerciseModal({ editing: true, index });
  };

  const saveExercise = () => {
    if (!exerciseForm.name.trim()) return;
    const ex = { ...exerciseForm, name: exerciseForm.name.trim() };

    setDraft(prev => {
      const newDraft = JSON.parse(JSON.stringify(prev));
      const day = newDraft.days[activeDayIndex];
      if (exerciseModal?.editing && exerciseModal.index >= 0) {
        day.exercises[exerciseModal.index] = ex;
      } else {
        day.exercises.push(ex);
      }
      return newDraft;
    });
    setExerciseModal(null);
  };

  const removeExercise = (index: number) => {
    setDraft(prev => {
      const newDraft = JSON.parse(JSON.stringify(prev));
      newDraft.days[activeDayIndex].exercises.splice(index, 1);
      return newDraft;
    });
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    setDraft(prev => {
      const newDraft = JSON.parse(JSON.stringify(prev));
      const exercises = newDraft.days[activeDayIndex].exercises;
      if (target < 0 || target >= exercises.length) return prev;
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return newDraft;
    });
  };

  // ── Save ──
  const handleSave = () => {
    if (!draft.name.trim()) {
      showToast(t.programBuilder.enterProgramName, 'error');
      return;
    }
    const updated = { ...draft, updatedAt: new Date().toISOString().split('T')[0] };
    onSave(updated);
  };

  // ── Filtered suggestions ──
  const filteredSuggestions = exerciseSearch.trim() && exerciseCatalog
    ? exerciseCatalog.filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) || (ex.namePl && ex.namePl.toLowerCase().includes(exerciseSearch.toLowerCase()))).slice(0, 8)
    : [];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Back Bar */}
      <div style={styles.topBar}>
        <motion.button onClick={onBack} style={styles.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
          <ArrowLeft size={16} /> {backLabel ?? t.programBuilder.backToPrograms}
        </motion.button>
      </div>

      {/* Saved Indicator */}
      <AnimatePresence>
        {showSavedIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
              background: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.3)',
            }}
          >
            <Check size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 500, fontFamily: 'var(--font-display)' }}>
              Program saved successfully!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Program Metadata */}
      <GlassCard delay={0.05}>
        <div style={{ ...styles.metaCard, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ ...styles.fieldGroup, flex: 1 }}>
            <label style={styles.label}>{t.programBuilder.programName}</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Hypertrophy Block A"
              style={styles.input}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>{t.programBuilder.durationWeeks}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <NumberStepper
                  value={draft.durationWeeks}
                  onChange={(v) => setDraft(prev => ({ ...prev, durationWeeks: parseInt(v) || 1 }))}
                  min={1} max={52} placeholder="8"
                  style={{ width: '130px' }}
                />
                <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}></span>
              </div>
            </div>
          </div>
        </div>

      </GlassCard>

      {/* Day Tabs */}
      <GlassCard delay={0.1}>
        <div style={styles.dayTabsWrap}>
          <div style={styles.dayTabs}>
            {draft.days.map((day, i) => (
              <div key={day.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {renamingDay === i ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmRenameDay(); if (e.key === 'Escape') setRenamingDay(null); }}
                      onBlur={confirmRenameDay}
                      style={{ ...styles.input, width: '120px', padding: '6px 10px', fontSize: '17px' }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveDayIndex(i)}
                    style={{
                      ...styles.dayTab,
                      background: activeDayIndex === i ? 'var(--accent-primary-dim)' : 'transparent',
                      color: activeDayIndex === i ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      borderColor: activeDayIndex === i ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                    }}
                  >
                    {day.name}
                  </button>
                )}
                {activeDayIndex === i && renamingDay !== i && (
                  <>
                    <button onClick={() => startRenameDay(i)} style={styles.tinyBtn} title="Rename">
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => duplicateDay(i)} style={{ ...styles.tinyBtn, color: 'var(--accent-secondary)' }} title={t.programBuilder.duplicateDay}>
                      <Copy size={12} />
                    </button>
                  </>
                )}
                {draft.days.length > 1 && activeDayIndex === i && (
                  <button onClick={() => removeDay(i)} style={{ ...styles.tinyBtn, color: 'var(--accent-danger)' }} title={t.programBuilder.removeDay}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addDay} style={styles.addDayBtn}>
              <Plus size={14} /> {t.programBuilder.addDay}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Exercise List */}
      {activeDay ? (
        <GlassCard delay={0.15}>
          <div style={styles.exerciseHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dumbbell size={16} color="var(--accent-primary)" />
              <h3 style={styles.dayTitle}>{activeDay.name}</h3>
              <span style={styles.exerciseCount}>{activeDay.exercises.length}</span>
            </div>
            <motion.button onClick={openAddExercise} style={styles.addExerciseBtn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={14} /> {t.programBuilder.addExercise}
            </motion.button>
          </div>

          {activeDay.exercises.length > 0 ? (
            <div style={styles.exerciseList}>
              {activeDay.exercises.map((ex, i) => (
                <motion.div
                  key={ex.id}
                  style={styles.exerciseRow}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div style={styles.exerciseMain}>
                    <span style={styles.orderNum}>{i + 1}</span>
                    <div style={styles.exerciseInfo}>
                      <span style={styles.exerciseName}>{ex.name}</span>
                      <div style={styles.prescriptionRow}>
                        <span style={styles.prescriptionChip}>
                          {ex.sets} × {ex.reps}
                        </span>
                        {ex.rpe !== null && (
                          <span style={{
                            ...styles.prescriptionChip,
                            color: ex.rpe >= 8 ? 'var(--accent-warm)' : 'var(--accent-secondary)',
                          }}>
                            RPE {ex.rpe}
                          </span>
                        )}
                      </div>
                      {(ex.tempo || ex.restSeconds) && (
                        <div style={styles.detailRow}>
                          {ex.tempo && <span style={styles.detailText}>{t.programBuilder.tempo}: {ex.tempo}</span>}
                          {ex.restSeconds && <span style={styles.detailText}>{t.programBuilder.restSeconds}: {ex.restSeconds}s</span>}
                        </div>
                      )}
                      {ex.notes && (
                        <div style={styles.detailRow}>
                          <span style={{ ...styles.detailText, fontStyle: 'italic', opacity: 0.7 }}>📝 {ex.notes}</span>
                        </div>
                      )}
                    </div>
                    <div style={styles.exerciseActions}>
                      <button
                        onClick={() => moveExercise(i, 'up')}
                        style={{ ...styles.actionBtn, opacity: i === 0 ? 0.25 : 1 }}
                        disabled={i === 0}
                        title={t.programBuilder.moveUp}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveExercise(i, 'down')}
                        style={{ ...styles.actionBtn, opacity: i === activeDay.exercises.length - 1 ? 0.25 : 1 }}
                        disabled={i === activeDay.exercises.length - 1}
                        title={t.programBuilder.moveDown}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={() => openEditExercise(i)} style={styles.actionBtn} title={t.programBuilder.editExercise}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => removeExercise(i)} style={{ ...styles.actionBtn, color: 'var(--accent-danger)' }} title={t.programBuilder.removeExercise}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyDay}>
              <Dumbbell size={32} color="var(--text-tertiary)" />
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0 12px', fontSize: '18px' }}>
                {t.programBuilder.noExercisesYet || 'No exercises yet. Use the quick-add below or click the + button for full details.'}
              </p>
            </div>
          )}

          {/* Quick-Add Row */}
          <div style={styles.quickAddWrap}>
            <div style={styles.quickAddRow}>
              <div style={{ position: 'relative', flex: 2, minWidth: 0 }}>
                <input
                  ref={quickNameRef}
                  type="text"
                  value={quickName}
                  onChange={(e) => {
                    setQuickName(e.target.value);
                    setQuickShowSuggestions(true);
                  }}
                  onFocus={() => { if (quickName.trim()) setQuickShowSuggestions(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitQuickAdd(); }}
                  placeholder={t.programBuilder.searchExercises || 'Exercise name...'}
                  style={{ ...styles.input, fontSize: '15px', padding: '8px 10px' }}
                />
                {quickShowSuggestions && quickFilteredSuggestions.length > 0 && (
                  <div ref={quickSuggestionsRef} style={{ ...styles.suggestions, bottom: '100%', top: 'auto', marginBottom: '4px' }}>
                    {quickFilteredSuggestions.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => {
                          setQuickName(ex.name);
                          setQuickSets(String(ex.defaultSets));
                          setQuickReps(ex.defaultReps);
                          setQuickShowSuggestions(false);
                        }}
                        style={styles.suggestionItem}
                      >
                        <Dumbbell size={13} color="var(--text-tertiary)" />
                        <span style={{ flex: 1 }}>{ex.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>{ex.muscleGroup}</span>
                        <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>{ex.equipment}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                value={quickSets}
                onChange={(e) => setQuickSets(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitQuickAdd(); }}
                placeholder="Sets"
                min={1}
                max={20}
                style={{ ...styles.input, fontSize: '15px', padding: '8px 10px', width: '64px', textAlign: 'center', flex: 'none' }}
              />
              <span style={{ color: 'var(--text-tertiary)', fontSize: '15px', fontWeight: 600, userSelect: 'none' }}>×</span>
              <input
                type="text"
                value={quickReps}
                onChange={(e) => setQuickReps(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitQuickAdd(); }}
                placeholder="Reps"
                style={{ ...styles.input, fontSize: '15px', padding: '8px 10px', width: '80px', textAlign: 'center', flex: 'none' }}
              />
              <motion.button
                onClick={submitQuickAdd}
                style={{
                  ...styles.addExerciseBtn,
                  padding: '7px 10px',
                  fontSize: '15px',
                  opacity: quickName.trim() ? 1 : 0.4,
                }}
                whileHover={quickName.trim() ? { scale: 1.05 } : {}}
                whileTap={quickName.trim() ? { scale: 0.95 } : {}}
              >
                <Plus size={14} />
              </motion.button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {t.programBuilder.quickAddHint}
            </span>
          </div>
        </GlassCard>
      ) : (
        <GlassCard delay={0.15}>
          <div style={styles.emptyDay}>
            <Dumbbell size={40} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0', fontSize: '20px' }}>
              {t.programBuilder.noDaysYet}
            </p>
            <button onClick={addDay} style={styles.addExerciseBtn}>
              <Plus size={14} /> {t.programBuilder.addDay}
            </button>
          </div>
        </GlassCard>
      )}

      {/* Program Notes — expandable */}
      <GlassCard delay={0.2}>
        <button
          onClick={() => setNotesExpanded(prev => !prev)}
          style={{
            width: '100%', padding: '14px 20px', background: 'none', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', fontFamily: 'var(--font-display)',
          }}
        >
          <span style={{ ...styles.label, margin: 0 }}>
            {t.programBuilder.programNotes}
            {draft.notes ? ` (${draft.notes.split('\n').filter(l => l.trim()).length})` : ''}
          </span>
          <ChevronDown size={16} style={{
            color: 'var(--text-tertiary)',
            transform: notesExpanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }} />
        </button>
        {notesExpanded && (
          <div style={{ padding: '0 20px 16px' }}>
            <textarea
              value={draft.notes || ''}
              onChange={(e) => setDraft(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t.programBuilder.programNotesPlaceholder}
              rows={Math.max(3, (draft.notes || '').split('\n').length + 1)}
              style={styles.textarea}
            />
          </div>
        )}
      </GlassCard>

      {/* Bottom Summary Bar */}
      <GlassCard delay={0.25}>
        <div style={styles.bottomBar}>
          <div style={styles.summaryChips}>
            <span style={styles.summaryChip}><Dumbbell size={13} /> {t.programs.days(draft.days.length)}</span>
            <span style={styles.summaryChip}>{t.programs.exercises(totalExercises)}</span>
            <span style={styles.summaryChip}><Clock size={13} /> {t.programs.weeks(draft.durationWeeks)}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onBack} style={styles.cancelBtnBottom}>{t.programBuilder.cancel}</button>
            <motion.button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              style={{
                ...styles.saveBtnBottom,
                opacity: hasUnsavedChanges ? 1 : 0.35,
                cursor: hasUnsavedChanges ? 'pointer' : 'default',
              }}
              whileHover={hasUnsavedChanges ? { scale: 1.02 } : {}}
              whileTap={hasUnsavedChanges ? { scale: 0.98 } : {}}
            >
              {showSavedIndicator ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {t.programBuilder.saveProgram}</>}
            </motion.button>
          </div>
        </div>
      </GlassCard>

      {/* ═══ Add/Edit Exercise Modal ═══ */}
      <AnimatePresence>
        {exerciseModal && (
          <motion.div style={styles.overlayCenter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExerciseModal(null)}>
            <motion.div
              style={{ ...styles.modalCentered, maxWidth: '520px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{exerciseModal.editing ? t.programBuilder.editExercise : t.programBuilder.addExercise}</h3>
                <button onClick={() => setExerciseModal(null)} style={styles.closeBtn}><X size={16} /></button>
              </div>
              <div style={styles.modalBody}>
                {/* Exercise Name with autocomplete */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>{t.programBuilder.exerciseName}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={exerciseSearch}
                      onChange={(e) => {
                        setExerciseSearch(e.target.value);
                        setExerciseForm(prev => ({ ...prev, name: e.target.value }));
                        setShowSuggestions(true);
                      }}
                      onFocus={() => { if (exerciseSearch.trim()) setShowSuggestions(true); }}
                      placeholder={t.programBuilder.searchExercises}
                      style={styles.input}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div ref={suggestionsRef} style={styles.suggestions}>
                        {filteredSuggestions.map(ex => (
                          <button
                            key={ex.id}
                            onClick={() => {
                              setExerciseSearch(ex.name);
                              setExerciseForm(prev => ({
                                ...prev,
                                name: ex.name,
                                sets: ex.defaultSets,
                                reps: ex.defaultReps,
                                restSeconds: ex.defaultRestSeconds,
                              }));
                              setShowSuggestions(false);
                            }}
                            style={styles.suggestionItem}
                          >
                            <Dumbbell size={13} color="var(--text-tertiary)" />
                            <span style={{ flex: 1 }}>{ex.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>{ex.muscleGroup}</span>
                            <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>{ex.equipment}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sets + Reps */}
                <div style={styles.fieldRow}>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>{t.programBuilder.sets}</label>
                    <NumberStepper
                      value={exerciseForm.sets}
                      onChange={(v) => setExerciseForm(prev => ({ ...prev, sets: parseInt(v) || 1 }))}
                      min={1} max={20} placeholder="3"
                    />
                  </div>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>{t.programBuilder.reps}</label>
                    <input
                      type="text"
                      value={exerciseForm.reps}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, reps: e.target.value }))}
                      placeholder='e.g. 8-12, AMRAP, 30s'
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* RPE + Rest */}
                <div style={styles.fieldRow}>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>{t.programBuilder.rpe} (1-10)</label>
                    <NumberStepper
                      value={exerciseForm.rpe ?? ''}
                      onChange={(v) => setExerciseForm(prev => ({ ...prev, rpe: v ? parseInt(v) : null }))}
                      min={1} max={10} placeholder="7"
                    />
                  </div>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>{t.programBuilder.restSeconds}</label>
                    <NumberStepper
                      value={exerciseForm.restSeconds ?? ''}
                      onChange={(v) => setExerciseForm(prev => ({ ...prev, restSeconds: v ? parseInt(v) : null }))}
                      min={0} max={600} step={15} placeholder="90"
                    />
                  </div>
                </div>

                {/* Tempo */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>{t.programBuilder.tempo}</label>
                  <input
                    type="text"
                    value={exerciseForm.tempo}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, tempo: e.target.value }))}
                    placeholder='e.g. 3-1-2-0'
                    style={styles.input}
                  />
                </div>

                {/* Notes */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>{t.programBuilder.exerciseNotes}</label>
                  <input
                    type="text"
                    value={exerciseForm.notes}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t.programBuilder.exerciseNotesPlaceholder}
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setExerciseModal(null)} style={styles.cancelBtnModal}>{t.programBuilder.cancel}</button>
                <motion.button
                  onClick={saveExercise}
                  style={{ ...styles.primaryBtn, opacity: exerciseForm.name.trim() ? 1 : 0.4 }}
                  whileHover={exerciseForm.name.trim() ? { scale: 1.02 } : {}}
                  whileTap={exerciseForm.name.trim() ? { scale: 0.98 } : {}}
                >
                  <Check size={14} /> {exerciseModal.editing ? t.programBuilder.save : t.programBuilder.addExercise}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  metaCard: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    alignItems: 'flex-end',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '17px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
  },
  input: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    outline: 'none',
  },
  assignRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px 16px',
    flexWrap: 'wrap',
  },
  chipGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  clientChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px 4px 4px',
    borderRadius: '20px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    fontSize: '17px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  chipAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  chipRemove: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  assignBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--accent-primary)',
    fontSize: '17px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  // Day Tabs
  dayTabsWrap: {
    padding: '12px 16px',
  },
  dayTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflowX: 'auto',
    flexWrap: 'nowrap',
  },
  dayTab: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    background: 'transparent',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tinyBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
  },
  addDayBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '17px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  // Exercise List
  exerciseHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
  },
  dayTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  exerciseCount: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-subtle-hover)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontFamily: 'var(--font-mono)',
  },
  addExerciseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary-dim)',
    border: '1px solid rgba(0, 229, 200, 0.15)',
    color: 'var(--accent-primary)',
    fontSize: '17px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  exerciseList: {
    padding: '0 20px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  exerciseRow: {
    padding: '14px 0',
    borderBottom: '1px solid var(--glass-border)',
  },
  exerciseMain: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  orderNum: {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    background: 'var(--bg-subtle-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    marginTop: '2px',
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  exerciseName: {
    fontSize: '20px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  prescriptionRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  prescriptionChip: {
    fontSize: '17px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '2px',
  },
  detailText: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  exerciseActions: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },
  actionBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  },
  emptyDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  // Bottom bar
  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  summaryChips: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  summaryChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  cancelBtnBottom: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  saveBtnBottom: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
  // Modal styles
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  overlayCenter: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    maxHeight: '85vh',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 101,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalCentered: {
    width: '90vw',
    maxHeight: '85vh',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 101,
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--glass-border)',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
    borderTop: '1px solid var(--glass-border)',
    flexShrink: 0,
  },
  cancelBtnModal: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
  fieldRow: {
    display: 'flex',
    gap: '12px',
  },
  textarea: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    resize: 'vertical',
    width: '100%',
    boxSizing: 'border-box',
  },
  suggestions: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    maxHeight: '200px',
    overflowY: 'auto',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    padding: '4px',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  // Assign modal
  clientRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '6px',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    transition: 'background 0.15s',
  },
  clientAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    flexShrink: 0,
  },
  clientInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  clientName: {
    fontSize: '18px',
    fontWeight: 600,
  },
  clientPlan: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  checkCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-on-accent)',
    flexShrink: 0,
  },
  // Quick-add row
  quickAddWrap: {
    padding: '12px 20px 16px',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  quickAddRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
