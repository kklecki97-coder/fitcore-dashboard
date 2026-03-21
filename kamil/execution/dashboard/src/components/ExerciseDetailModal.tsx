import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Zap, Target, AlertTriangle, Shuffle, Clock, RotateCcw } from 'lucide-react';
import { useLang } from '../i18n';
import type { CatalogExercise } from '../types';

interface Props {
  exercise: CatalogExercise | null;
  onClose: () => void;
  onToggleFavorite?: (exercise: CatalogExercise) => void;
  alternatives?: CatalogExercise[];
  onSelectAlternative?: (exercise: CatalogExercise) => void;
}

export default function ExerciseDetailModal({ exercise, onClose, onToggleFavorite, alternatives = [], onSelectAlternative }: Props) {
  const { t, lang } = useLang();
  const tl = t.exerciseLibrary;

  if (!exercise) return null;

  // Use Polish content when available and lang is 'pl'
  const isPl = lang === 'pl';
  const description = (isPl && exercise.descriptionPl) || exercise.description;
  const instructions = (isPl && exercise.instructionsPl?.length) ? exercise.instructionsPl : exercise.instructions;

  const muscleGroupLabel = tl.muscles[exercise.muscleGroup === 'full-body' ? 'fullBody' : exercise.muscleGroup as keyof typeof tl.muscles] || exercise.muscleGroup;
  const equipmentLabel = tl.equipmentTypes[exercise.equipment as keyof typeof tl.equipmentTypes] || exercise.equipment;
  const difficultyLabel = tl.difficulties[exercise.difficulty as keyof typeof tl.difficulties] || exercise.difficulty;
  const movementLabel = tl.movements[exercise.movementPattern as keyof typeof tl.movements] || exercise.movementPattern;
  const mechanicLabel = tl.mechanics[exercise.mechanic as keyof typeof tl.mechanics] || exercise.mechanic;

  const difficultyColor = exercise.difficulty === 'beginner' ? '#4ade80' : exercise.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444';

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
          zIndex: 1000,
          padding: '20px',
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
            width: '100%',
            maxWidth: 600,
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
                {exercise.name}
              </h2>
              {exercise.namePl && (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{exercise.namePl}</div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <Badge color="var(--accent-primary)">{muscleGroupLabel}</Badge>
                <Badge color="#6366f1">{equipmentLabel}</Badge>
                <Badge color={difficultyColor}>{difficultyLabel}</Badge>
                <Badge color="#8b5cf6">{movementLabel}</Badge>
                <Badge color="#64748b">{mechanicLabel}</Badge>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(exercise)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <Star size={20} fill={exercise.isFavorite ? '#f59e0b' : 'none'} color={exercise.isFavorite ? '#f59e0b' : 'var(--text-tertiary)'} />
                </button>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="var(--text-tertiary)" />
              </button>
            </div>
          </div>

          <div style={{ padding: '20px 24px 24px' }}>
            {/* GIF placeholder */}
            {exercise.gifUrl ? (
              <div style={{
                width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                marginBottom: 20, background: 'var(--bg-secondary)',
              }}>
                <img src={exercise.gifUrl} alt={exercise.name} style={{ width: '100%', display: 'block' }} loading="lazy" />
              </div>
            ) : (
              <div style={{
                width: '100%', height: 160, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, border: '1px dashed var(--glass-border)',
              }}>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Zap size={32} style={{ opacity: 0.3, marginBottom: 4 }} />
                  <div style={{ fontSize: 12 }}>Animation coming soon</div>
                </div>
              </div>
            )}

            {/* Description */}
            {description && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                {description}
              </p>
            )}

            {/* Defaults */}
            <div style={{
              display: 'flex', gap: 12, marginBottom: 20,
              padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-primary-dim)',
              border: '1px solid rgba(0,229,200,0.15)',
            }}>
              <DefaultStat icon={<RotateCcw size={14} />} label={tl.sets} value={String(exercise.defaultSets)} />
              <DefaultStat icon={<Target size={14} />} label={tl.reps} value={exercise.defaultReps} />
              <DefaultStat icon={<Clock size={14} />} label={tl.rest} value={`${exercise.defaultRestSeconds}s`} />
            </div>

            {/* Instructions */}
            {instructions.length > 0 && (
              <Section title={tl.instructions}>
                <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
                  {instructions.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </Section>
            )}

            {/* Muscles Worked */}
            <Section title={tl.musclesWorked}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{tl.primary}</span>
                  <span style={{ marginLeft: 8 }}>{exercise.primaryMuscle}</span>
                </div>
                {exercise.secondaryMuscles.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{tl.secondary}</span>
                    <span style={{ marginLeft: 8 }}>{exercise.secondaryMuscles.join(', ')}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* Tips */}
            {exercise.tips.length > 0 && (
              <Section title={tl.tips} icon={<Zap size={14} color="var(--accent-primary)" />}>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
                  {exercise.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
              </Section>
            )}

            {/* Common Mistakes */}
            {exercise.commonMistakes.length > 0 && (
              <Section title={tl.commonMistakes} icon={<AlertTriangle size={14} color="#f59e0b" />}>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
                  {exercise.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </Section>
            )}

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <Section title={tl.alternatives} icon={<Shuffle size={14} color="var(--accent-primary)" />}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {alternatives.slice(0, 6).map(alt => (
                    <button
                      key={alt.id}
                      onClick={() => onSelectAlternative?.(alt)}
                      style={{
                        padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
                        fontFamily: 'var(--font-display)',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {alt.name}
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px',
      borderRadius: 100, textTransform: 'uppercase', letterSpacing: 0.5,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function DefaultStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      <div style={{ color: 'var(--accent-primary)' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
