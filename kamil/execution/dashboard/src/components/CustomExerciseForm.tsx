import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { useLang } from '../i18n';
import type { CatalogExercise, MuscleGroup, Equipment, MovementPattern, Difficulty } from '../types';

interface Props {
  exercise?: CatalogExercise | null;
  onSave: (exercise: Omit<CatalogExercise, 'id' | 'slug' | 'isGlobal'>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const muscleGroups: MuscleGroup[] = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full-body', 'cardio'];
const equipmentList: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other'];
const movementPatterns: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'carry', 'rotation', 'isolation'];
const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export default function CustomExerciseForm({ exercise, onSave, onDelete, onClose }: Props) {
  const { t } = useLang();
  const tl = t.exerciseLibrary;
  const isEditing = !!exercise;

  const [name, setName] = useState('');
  const [namePl, setNamePl] = useState('');
  const [description, setDescription] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('legs');
  const [primaryMuscle, setPrimaryMuscle] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [newMuscle, setNewMuscle] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [movementPattern, setMovementPattern] = useState<MovementPattern>('push');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [mechanic, setMechanic] = useState<'compound' | 'isolation'>('compound');
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [tips, setTips] = useState<string[]>(['']);
  const [gifUrl, setGifUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState('10');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(90);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setNamePl(exercise.namePl || '');
      setDescription(exercise.description || '');
      setMuscleGroup(exercise.muscleGroup);
      setPrimaryMuscle(exercise.primaryMuscle);
      setSecondaryMuscles(exercise.secondaryMuscles);
      setEquipment(exercise.equipment);
      setMovementPattern(exercise.movementPattern);
      setDifficulty(exercise.difficulty);
      setMechanic(exercise.mechanic);
      setInstructions(exercise.instructions.length > 0 ? exercise.instructions : ['']);
      setTips(exercise.tips.length > 0 ? exercise.tips : ['']);
      setGifUrl(exercise.gifUrl || '');
      setVideoUrl(exercise.videoUrl || '');
      setDefaultSets(exercise.defaultSets);
      setDefaultReps(exercise.defaultReps);
      setDefaultRestSeconds(exercise.defaultRestSeconds);
    }
  }, [exercise]);

  const handleSave = () => {
    if (!name.trim() || !primaryMuscle.trim()) return;
    onSave({
      name: name.trim(),
      namePl: namePl.trim() || undefined,
      description: description.trim(),
      instructions: instructions.filter(s => s.trim()),
      tips: tips.filter(s => s.trim()),
      commonMistakes: [],
      primaryMuscle: primaryMuscle.trim(),
      secondaryMuscles: secondaryMuscles.filter(s => s.trim()),
      muscleGroup,
      equipment,
      movementPattern,
      difficulty,
      mechanic,
      gifUrl: gifUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      defaultSets,
      defaultReps,
      defaultRestSeconds,
      isCoachCustom: true,
      isFavorite: false,
    });
  };

  const addSecondaryMuscle = () => {
    if (newMuscle.trim() && !secondaryMuscles.includes(newMuscle.trim())) {
      setSecondaryMuscles([...secondaryMuscles, newMuscle.trim()]);
      setNewMuscle('');
    }
  };

  const updateListItem = (list: string[], setList: (v: string[]) => void, index: number, value: string) => {
    const copy = [...list];
    copy[index] = value;
    setList(copy);
  };

  const removeListItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const isValid = name.trim() && primaryMuscle.trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: 560,
            maxHeight: '85vh', overflow: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
              {isEditing ? tl.editExercise : tl.createExercise}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color="var(--text-tertiary)" />
            </button>
          </div>

          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name */}
            <Field label={tl.exerciseName + ' *'}>
              <Input value={name} onChange={setName} placeholder="e.g. Landmine Squat" />
            </Field>

            <Field label={tl.exerciseNamePl}>
              <Input value={namePl} onChange={setNamePl} placeholder="e.g. Przysiad z Landmine" />
            </Field>

            {/* Description */}
            <Field label={tl.description}>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of the exercise..."
                rows={2}
                style={inputStyle}
              />
            </Field>

            {/* Dropdowns row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={tl.muscleGroup + ' *'}>
                <Select value={muscleGroup} onChange={v => setMuscleGroup(v as MuscleGroup)}
                  options={muscleGroups.map(mg => ({ value: mg, label: tl.muscles[mg === 'full-body' ? 'fullBody' : mg as keyof typeof tl.muscles] || mg }))} />
              </Field>
              <Field label={tl.equipment + ' *'}>
                <Select value={equipment} onChange={v => setEquipment(v as Equipment)}
                  options={equipmentList.map(eq => ({ value: eq, label: tl.equipmentTypes[eq as keyof typeof tl.equipmentTypes] || eq }))} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label={tl.difficulty}>
                <Select value={difficulty} onChange={v => setDifficulty(v as Difficulty)}
                  options={difficulties.map(d => ({ value: d, label: tl.difficulties[d as keyof typeof tl.difficulties] }))} />
              </Field>
              <Field label={tl.movement}>
                <Select value={movementPattern} onChange={v => setMovementPattern(v as MovementPattern)}
                  options={movementPatterns.map(m => ({ value: m, label: tl.movements[m as keyof typeof tl.movements] || m }))} />
              </Field>
              <Field label={tl.selectMechanic}>
                <Select value={mechanic} onChange={v => setMechanic(v as 'compound' | 'isolation')}
                  options={[{ value: 'compound', label: tl.mechanics.compound }, { value: 'isolation', label: tl.mechanics.isolation }]} />
              </Field>
            </div>

            {/* Primary & secondary muscles */}
            <Field label={tl.primaryMuscle + ' *'}>
              <Input value={primaryMuscle} onChange={setPrimaryMuscle} placeholder="e.g. quadriceps" />
            </Field>

            <Field label={tl.secondaryMuscles}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: secondaryMuscles.length > 0 ? 8 : 0 }}>
                {secondaryMuscles.map((m, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: '3px 8px 3px 10px', borderRadius: 100,
                    background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {m}
                    <button onClick={() => setSecondaryMuscles(secondaryMuscles.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <X size={12} color="var(--accent-primary)" />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input value={newMuscle} onChange={setNewMuscle} placeholder={tl.addMuscle}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSecondaryMuscle(); }}} />
                <button onClick={addSecondaryMuscle} style={{ ...btnSmall, flexShrink: 0 }}>
                  <Plus size={14} />
                </button>
              </div>
            </Field>

            {/* Instructions */}
            <Field label={tl.instructionsLabel}>
              {instructions.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 18, textAlign: 'center', paddingTop: 10 }}>{i + 1}.</span>
                  <Input value={step} onChange={v => updateListItem(instructions, setInstructions, i, v)} placeholder={`Step ${i + 1}`} />
                  {instructions.length > 1 && (
                    <button onClick={() => removeListItem(instructions, setInstructions, i)} style={{ ...btnSmall, flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setInstructions([...instructions, ''])} style={linkBtn}>
                <Plus size={12} /> {tl.addStep}
              </button>
            </Field>

            {/* Tips */}
            <Field label={tl.tipsLabel}>
              {tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <Input value={tip} onChange={v => updateListItem(tips, setTips, i, v)} placeholder={`Tip ${i + 1}`} />
                  {tips.length > 1 && (
                    <button onClick={() => removeListItem(tips, setTips, i)} style={{ ...btnSmall, flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setTips([...tips, ''])} style={linkBtn}>
                <Plus size={12} /> {tl.addTip}
              </button>
            </Field>

            {/* Defaults */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label={tl.defaultSets}>
                <Input type="number" value={String(defaultSets)} onChange={v => setDefaultSets(Number(v) || 3)} />
              </Field>
              <Field label={tl.defaultReps}>
                <Input value={defaultReps} onChange={setDefaultReps} placeholder="e.g. 8-12" />
              </Field>
              <Field label={tl.defaultRest}>
                <Input type="number" value={String(defaultRestSeconds)} onChange={v => setDefaultRestSeconds(Number(v) || 60)} />
              </Field>
            </div>

            {/* Media URLs */}
            <Field label={tl.gifUrl}>
              <Input value={gifUrl} onChange={setGifUrl} placeholder="https://..." />
            </Field>
            <Field label={tl.videoUrl}>
              <Input value={videoUrl} onChange={setVideoUrl} placeholder="https://..." />
            </Field>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <div>
                {isEditing && onDelete && !showDeleteConfirm && (
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ ...dangerBtn }}>
                    <Trash2 size={14} /> {tl.delete}
                  </button>
                )}
                {showDeleteConfirm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#ef4444' }}>{tl.deleteConfirm}</span>
                    <button onClick={() => { onDelete?.(exercise!.id); onClose(); }} style={{ ...dangerBtn, background: '#ef4444', color: '#fff' }}>Yes</button>
                    <button onClick={() => setShowDeleteConfirm(false)} style={linkBtn}>Cancel</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={cancelBtn}>{t.common.cancel}</button>
                <button onClick={handleSave} disabled={!isValid} style={{
                  ...primaryBtn,
                  opacity: isValid ? 1 : 0.4,
                  cursor: isValid ? 'pointer' : 'not-allowed',
                }}>
                  {tl.save}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Sub-components ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Styles ──

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 14, fontFamily: 'var(--font-display)',
  background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
};

const btnSmall: React.CSSProperties = {
  padding: '8px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex',
};

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 12,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'var(--font-display)',
};

const cancelBtn: React.CSSProperties = {
  padding: '8px 16px', fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 500,
  background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  padding: '8px 20px', fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 600,
  background: 'var(--accent-primary)', border: 'none',
  borderRadius: 'var(--radius-sm)', color: '#000', cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 500,
  background: 'transparent', border: '1px solid #ef4444',
  borderRadius: 'var(--radius-sm)', color: '#ef4444', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4,
};
