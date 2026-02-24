import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Plus, Trash2, X, ChevronUp, ChevronDown,
  Edit3, Clock, Users, Dumbbell, Check, Copy,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram, WorkoutDay, Exercise } from '../types';

interface ProgramBuilderPageProps {
  program: WorkoutProgram | null;
  clients: Client[];
  exerciseLibrary: string[];
  onSave: (program: WorkoutProgram) => void;
  onBack: () => void;
  backLabel?: string;
}

const emptyExercise = (): Exercise => ({
  id: `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  program, clients, exerciseLibrary, onSave, onBack, backLabel = 'Back to Programs',
}: ProgramBuilderPageProps) {
  const isMobile = useIsMobile();

  const [draft, setDraft] = useState<WorkoutProgram>(() => {
    if (program) return structuredClone(program);
    return {
      id: `wp${Date.now()}`,
      name: '',
      status: 'draft' as const,
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
  const [exerciseForm, setExerciseForm] = useState<Exercise>(emptyExercise());
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [renamingDay, setRenamingDay] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close suggestions on outside click
  const closeSuggestions = useCallback((e: MouseEvent) => {
    if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (showSuggestions) {
      document.addEventListener('mousedown', closeSuggestions);
      return () => document.removeEventListener('mousedown', closeSuggestions);
    }
  }, [showSuggestions, closeSuggestions]);

  const activeDay: WorkoutDay | undefined = draft.days[activeDayIndex];

  const totalExercises = draft.days.reduce((sum, d) => sum + d.exercises.length, 0);

  // ── Day management ──
  const addDay = () => {
    const newDay: WorkoutDay = {
      id: `wd${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `Day ${draft.days.length + 1}`,
      exercises: [],
    };
    setDraft(prev => ({ ...prev, days: [...prev.days, newDay] }));
    setActiveDayIndex(draft.days.length);
  };

  const removeDay = (index: number) => {
    if (!window.confirm(`Remove "${draft.days[index].name}" and all its exercises?`)) return;
    setDraft(prev => ({ ...prev, days: prev.days.filter((_, i) => i !== index) }));
    if (activeDayIndex >= draft.days.length - 1) {
      setActiveDayIndex(Math.max(0, draft.days.length - 2));
    }
  };

  const duplicateDay = (index: number) => {
    const source = draft.days[index];
    const newDay: WorkoutDay = {
      ...structuredClone(source),
      id: `wd${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${source.name} (Copy)`,
      exercises: source.exercises.map(e => ({
        ...e,
        id: `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      const newDraft = structuredClone(prev);
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
      const newDraft = structuredClone(prev);
      newDraft.days[activeDayIndex].exercises.splice(index, 1);
      return newDraft;
    });
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    setDraft(prev => {
      const newDraft = structuredClone(prev);
      const exercises = newDraft.days[activeDayIndex].exercises;
      if (target < 0 || target >= exercises.length) return prev;
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return newDraft;
    });
  };

  // ── Client assignment ──
  const toggleClient = (clientId: string) => {
    setDraft(prev => ({
      ...prev,
      clientIds: prev.clientIds.includes(clientId)
        ? prev.clientIds.filter(id => id !== clientId)
        : [...prev.clientIds, clientId],
    }));
  };

  // ── Save ──
  const handleSave = () => {
    if (!draft.name.trim()) {
      alert('Please enter a program name.');
      return;
    }
    onSave({ ...draft, updatedAt: new Date().toISOString().split('T')[0] });
  };

  // ── Filtered suggestions ──
  const filteredSuggestions = exerciseSearch.trim()
    ? exerciseLibrary.filter(ex => ex.toLowerCase().includes(exerciseSearch.toLowerCase())).slice(0, 8)
    : [];

  const assignedClients = draft.clientIds
    .map(id => clients.find(c => c.id === id))
    .filter(Boolean) as Client[];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Back Bar */}
      <div style={styles.topBar}>
        <motion.button onClick={onBack} style={styles.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
          <ArrowLeft size={16} /> {backLabel}
        </motion.button>
      </div>

      {/* Program Metadata */}
      <GlassCard delay={0.05}>
        <div style={{ ...styles.metaCard, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ ...styles.fieldGroup, flex: 1 }}>
            <label style={styles.label}>Program Name</label>
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
              <label style={styles.label}>Duration</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={draft.durationWeeks}
                  onChange={(e) => setDraft(prev => ({ ...prev, durationWeeks: parseInt(e.target.value) || 1 }))}
                  style={{ ...styles.input, width: '70px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>weeks</span>
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft(prev => ({ ...prev, status: e.target.value as WorkoutProgram['status'] }))}
                style={styles.select}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assigned Clients */}
        <div style={styles.assignRow}>
          <Users size={14} color="var(--text-tertiary)" />
          {assignedClients.length > 0 ? (
            <div style={styles.chipGroup}>
              {assignedClients.map(c => (
                <span key={c.id} style={styles.clientChip}>
                  <span style={{ ...styles.chipAvatar, background: getAvatarColor(c.id) }}>{getInitials(c.name)}</span>
                  {c.name}
                  <button onClick={() => toggleClient(c.id)} style={styles.chipRemove}><X size={12} /></button>
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '18px', color: 'var(--text-tertiary)' }}>No clients assigned</span>
          )}
          <button onClick={() => setAssignModal(true)} style={styles.assignBtn}>
            <Plus size={13} /> Assign
          </button>
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
                    <button onClick={() => duplicateDay(i)} style={{ ...styles.tinyBtn, color: 'var(--accent-secondary)' }} title="Duplicate day">
                      <Copy size={12} />
                    </button>
                  </>
                )}
                {draft.days.length > 1 && activeDayIndex === i && (
                  <button onClick={() => removeDay(i)} style={{ ...styles.tinyBtn, color: 'var(--accent-danger)' }} title="Remove day">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addDay} style={styles.addDayBtn}>
              <Plus size={14} /> Add Day
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
              <Plus size={14} /> Add Exercise
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
                        {ex.weight && (
                          <span style={{ ...styles.prescriptionChip, color: 'var(--accent-primary)' }}>
                            {ex.weight}
                          </span>
                        )}
                        {ex.rpe !== null && (
                          <span style={{
                            ...styles.prescriptionChip,
                            color: ex.rpe >= 8 ? 'var(--accent-warm)' : 'var(--accent-secondary)',
                          }}>
                            RPE {ex.rpe}
                          </span>
                        )}
                      </div>
                      {(ex.tempo || ex.restSeconds || ex.notes) && (
                        <div style={styles.detailRow}>
                          {ex.tempo && <span style={styles.detailText}>Tempo: {ex.tempo}</span>}
                          {ex.restSeconds && <span style={styles.detailText}>Rest: {ex.restSeconds}s</span>}
                          {ex.notes && <span style={{ ...styles.detailText, fontStyle: 'italic', color: 'var(--text-secondary)' }}>{ex.notes}</span>}
                        </div>
                      )}
                    </div>
                    <div style={styles.exerciseActions}>
                      <button
                        onClick={() => moveExercise(i, 'up')}
                        style={{ ...styles.actionBtn, opacity: i === 0 ? 0.25 : 1 }}
                        disabled={i === 0}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveExercise(i, 'down')}
                        style={{ ...styles.actionBtn, opacity: i === activeDay.exercises.length - 1 ? 0.25 : 1 }}
                        disabled={i === activeDay.exercises.length - 1}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={() => openEditExercise(i)} style={styles.actionBtn}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => removeExercise(i)} style={{ ...styles.actionBtn, color: 'var(--accent-danger)' }}>
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
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0 12px', fontSize: '18px' }}>No exercises yet</p>
              <button onClick={openAddExercise} style={styles.addExerciseBtn}>
                <Plus size={14} /> Add Exercise
              </button>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard delay={0.15}>
          <div style={styles.emptyDay}>
            <Dumbbell size={40} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0', fontSize: '20px' }}>
              No workout days yet. Add your first day to get started.
            </p>
            <button onClick={addDay} style={styles.addExerciseBtn}>
              <Plus size={14} /> Add Day
            </button>
          </div>
        </GlassCard>
      )}

      {/* Bottom Summary Bar */}
      <GlassCard delay={0.2}>
        <div style={styles.bottomBar}>
          <div style={styles.summaryChips}>
            <span style={styles.summaryChip}><Dumbbell size={13} /> {draft.days.length} {draft.days.length === 1 ? 'day' : 'days'}</span>
            <span style={styles.summaryChip}>{totalExercises} exercises</span>
            <span style={styles.summaryChip}><Clock size={13} /> {draft.durationWeeks} weeks</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onBack} style={styles.cancelBtnBottom}>Cancel</button>
            <motion.button onClick={handleSave} style={styles.saveBtnBottom} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Save size={14} /> Save
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
                <h3 style={styles.modalTitle}>{exerciseModal.editing ? 'Edit Exercise' : 'Add Exercise'}</h3>
                <button onClick={() => setExerciseModal(null)} style={styles.closeBtn}><X size={16} /></button>
              </div>
              <div style={styles.modalBody}>
                {/* Exercise Name with autocomplete */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Exercise Name</label>
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
                      placeholder="Search or type exercise name..."
                      style={styles.input}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div ref={suggestionsRef} style={styles.suggestions}>
                        {filteredSuggestions.map(name => (
                          <button
                            key={name}
                            onClick={() => {
                              setExerciseSearch(name);
                              setExerciseForm(prev => ({ ...prev, name }));
                              setShowSuggestions(false);
                            }}
                            style={styles.suggestionItem}
                          >
                            <Dumbbell size={13} color="var(--text-tertiary)" /> {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sets + Reps */}
                <div style={styles.fieldRow}>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Sets</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={exerciseForm.sets}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, sets: parseInt(e.target.value) || 1 }))}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Reps</label>
                    <input
                      type="text"
                      value={exerciseForm.reps}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, reps: e.target.value }))}
                      placeholder='e.g. 8-12, AMRAP, 30s'
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Weight + RPE */}
                <div style={styles.fieldRow}>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Weight / Load</label>
                    <input
                      type="text"
                      value={exerciseForm.weight}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder='e.g. 80kg, BW'
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>RPE (1-10)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={exerciseForm.rpe ?? ''}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, rpe: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder='Optional'
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Tempo + Rest */}
                <div style={styles.fieldRow}>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Tempo</label>
                    <input
                      type="text"
                      value={exerciseForm.tempo}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, tempo: e.target.value }))}
                      placeholder='e.g. 3-1-2-0'
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.fieldGroup, flex: 1 }}>
                    <label style={styles.label}>Rest (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      value={exerciseForm.restSeconds ?? ''}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, restSeconds: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder='Optional'
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    value={exerciseForm.notes}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Exercise-specific coaching cues..."
                    rows={2}
                    style={styles.textarea}
                  />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setExerciseModal(null)} style={styles.cancelBtnModal}>Cancel</button>
                <motion.button
                  onClick={saveExercise}
                  style={{ ...styles.primaryBtn, opacity: exerciseForm.name.trim() ? 1 : 0.4 }}
                  whileHover={exerciseForm.name.trim() ? { scale: 1.02 } : {}}
                  whileTap={exerciseForm.name.trim() ? { scale: 0.98 } : {}}
                >
                  <Check size={14} /> {exerciseModal.editing ? 'Save Changes' : 'Add Exercise'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Assign to Clients Modal ═══ */}
      <AnimatePresence>
        {assignModal && (
          <motion.div style={styles.overlayCenter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssignModal(false)}>
            <motion.div
              style={{ ...styles.modalCentered, maxWidth: '440px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Assign Program</h3>
                <button onClick={() => setAssignModal(false)} style={styles.closeBtn}><X size={16} /></button>
              </div>
              <div style={{ ...styles.modalBody, maxHeight: '400px', overflowY: 'auto' }}>
                {clients.filter(c => c.status === 'active').map(client => {
                  const isAssigned = draft.clientIds.includes(client.id);
                  return (
                    <button
                      key={client.id}
                      onClick={() => toggleClient(client.id)}
                      style={{
                        ...styles.clientRow,
                        background: isAssigned ? 'var(--accent-primary-dim)' : 'transparent',
                        borderColor: isAssigned ? 'rgba(0, 229, 200, 0.15)' : 'var(--glass-border)',
                      }}
                    >
                      <div style={{ ...styles.clientAvatar, background: getAvatarColor(client.id) }}>
                        {getInitials(client.name)}
                      </div>
                      <div style={styles.clientInfo}>
                        <span style={styles.clientName}>{client.name}</span>
                        <span style={styles.clientPlan}>{client.plan}</span>
                      </div>
                      {isAssigned && (
                        <div style={styles.checkCircle}><Check size={12} /></div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setAssignModal(false)} style={styles.primaryBtn}>
                  Done
                </button>
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
};
