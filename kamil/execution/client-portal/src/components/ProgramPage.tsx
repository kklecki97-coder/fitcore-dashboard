import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { WorkoutProgram, WorkoutSetLog } from '../types';

interface ProgramPageProps {
  program: WorkoutProgram | null;
  setLogs: WorkoutSetLog[];
  onLogSet: (log: WorkoutSetLog) => void;
}

export default function ProgramPage({ program, setLogs, onLogSet }: ProgramPageProps) {
  const isMobile = useIsMobile();
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  if (!program) {
    return (
      <div style={styles.page}>
        <GlassCard>
          <div style={styles.emptyState}>
            <Dumbbell size={40} color="var(--text-tertiary)" />
            <h3 style={styles.emptyTitle}>No program assigned</h3>
            <p style={styles.emptySub}>Your coach hasn't assigned a workout program yet. Check back soon!</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  const day = program.days[selectedDay];
  const todayStr = new Date().toISOString().split('T')[0];

  const getSetCompleted = (exerciseId: string, setNum: number) => {
    return setLogs.some(l => l.exerciseId === exerciseId && l.setNumber === setNum && l.completed && l.date === todayStr);
  };

  const completedExercises = day.exercises.filter(ex => {
    const allDone = Array.from({ length: ex.sets }, (_, i) => getSetCompleted(ex.id, i + 1));
    return allDone.every(Boolean);
  }).length;

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 12px' : '24px' }}>
      {/* Program Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{program.name}</h2>
        <p style={styles.subtitle}>{program.durationWeeks} week program</p>
      </div>

      {/* Day Selector */}
      <div style={styles.dayRow}>
        {program.days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setSelectedDay(i)}
            style={{
              ...styles.dayPill,
              background: i === selectedDay ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: i === selectedDay ? '#07090e' : 'var(--text-secondary)',
              border: i === selectedDay ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            Day {i + 1}
          </button>
        ))}
      </div>

      {/* Day Name */}
      <div style={styles.dayName}>{day.name}</div>

      {/* Exercise List */}
      <div style={styles.exerciseList}>
        {day.exercises.map((exercise, ei) => {
          const isExpanded = expandedExercise === exercise.id;
          const allSetsComplete = Array.from({ length: exercise.sets }, (_, i) =>
            getSetCompleted(exercise.id, i + 1)
          ).every(Boolean);

          return (
            <GlassCard key={exercise.id} delay={ei * 0.05} style={styles.exerciseCard}>
              {/* Exercise Header */}
              <div
                style={styles.exerciseHeader}
                onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
              >
                <div style={styles.exerciseLeft}>
                  {allSetsComplete ? (
                    <CheckCircle2 size={20} color="var(--accent-success)" />
                  ) : (
                    <Circle size={20} color="var(--text-tertiary)" />
                  )}
                  <div>
                    <div style={{
                      ...styles.exerciseName,
                      textDecoration: allSetsComplete ? 'line-through' : 'none',
                      opacity: allSetsComplete ? 0.6 : 1,
                    }}>
                      {exercise.name}
                    </div>
                    <div style={styles.exerciseMeta}>
                      {exercise.sets} × {exercise.reps} · {exercise.weight}
                      {exercise.rpe && <span> · RPE {exercise.rpe}</span>}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
              </div>

              {/* Expanded Sets */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={styles.setsWrap}
                >
                  {exercise.tempo && (
                    <div style={styles.tempoRow}>
                      <Clock size={12} color="var(--text-tertiary)" />
                      <span>Tempo: {exercise.tempo}</span>
                      {exercise.restSeconds && <span>· Rest: {exercise.restSeconds}s</span>}
                    </div>
                  )}
                  {exercise.notes && (
                    <div style={styles.exerciseNotes}>Note: {exercise.notes}</div>
                  )}
                  <div style={styles.setsList}>
                    {Array.from({ length: exercise.sets }, (_, i) => {
                      const setNum = i + 1;
                      const completed = getSetCompleted(exercise.id, setNum);
                      return (
                        <div key={setNum} style={styles.setRow}>
                          <span style={styles.setLabel}>Set {setNum}</span>
                          <span style={styles.setTarget}>{exercise.reps} × {exercise.weight}</span>
                          <button
                            style={{
                              ...styles.setCheckBtn,
                              background: completed ? 'var(--accent-success-dim)' : 'transparent',
                              borderColor: completed ? 'var(--accent-success)' : 'var(--glass-border)',
                              color: completed ? 'var(--accent-success)' : 'var(--text-tertiary)',
                            }}
                            onClick={() => {
                              if (!completed) {
                                onLogSet({
                                  id: `sl-${exercise.id}-${setNum}-${Date.now()}`,
                                  date: todayStr,
                                  exerciseId: exercise.id,
                                  exerciseName: exercise.name,
                                  setNumber: setNum,
                                  reps: parseInt(exercise.reps) || 10,
                                  weight: exercise.weight,
                                  completed: true,
                                });
                              }
                            }}
                          >
                            {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        {completedExercises}/{day.exercises.length} exercises completed
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    height: '100%',
  },
  header: { marginBottom: '4px' },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  dayRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  dayPill: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  dayName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  exerciseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  exerciseCard: {
    padding: '16px',
  },
  exerciseHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  exerciseLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  exerciseName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  exerciseMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  setsWrap: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--glass-border)',
  },
  tempoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginBottom: '8px',
  },
  exerciseNotes: {
    fontSize: '12px',
    color: 'var(--accent-warm)',
    marginBottom: '10px',
    fontStyle: 'italic',
  },
  setsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  setRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  setLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    minWidth: '48px',
    width: 'auto',
  },
  setTarget: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    flex: 1,
    textAlign: 'center',
  },
  setCheckBtn: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  summary: {
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '12px 0 24px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptySub: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '280px',
  },
};
