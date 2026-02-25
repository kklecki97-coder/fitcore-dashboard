import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, Dumbbell, ChevronDown, ChevronUp, Timer, Zap } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { WorkoutProgram, WorkoutSetLog, WorkoutLog } from '../types';

interface ProgramPageProps {
  program: WorkoutProgram | null;
  setLogs: WorkoutSetLog[];
  onLogSet: (log: WorkoutSetLog) => void;
  onRemoveLog: (exerciseId: string, setNumber: number, date: string) => void;
  onUpdateLog: (exerciseId: string, setNumber: number, date: string, updates: Partial<WorkoutSetLog>) => void;
  workoutLogs: WorkoutLog[];
}

export default function ProgramPage({ program, setLogs, onLogSet, onRemoveLog, onUpdateLog, workoutLogs: _workoutLogs }: ProgramPageProps) {
  const isMobile = useIsMobile();

  // ── Compute today's workout day index (based on day-of-week, not completion count) ──
  const todayDayIndex = (() => {
    if (!program || program.days.length === 0) return 0;
    const dayOfWeek = new Date().getDay(); // 0=Sun,1=Mon...6=Sat
    const mondayBased = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Mon...6=Sun
    return mondayBased % program.days.length;
  })();

  const [selectedDay, setSelectedDay] = useState(todayDayIndex);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // ── Rest timer state ──
  const [restTimer, setRestTimer] = useState<{ exerciseId: string; seconds: number; total: number } | null>(null);

  const clearTimer = useCallback(() => setRestTimer(null), []);

  useEffect(() => {
    if (!restTimer || restTimer.seconds <= 0) return;
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (!prev || prev.seconds <= 1) return null;
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

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

  const getSetLog = (exerciseId: string, setNum: number) => {
    return setLogs.find(l => l.exerciseId === exerciseId && l.setNumber === setNum && l.date === todayStr);
  };

  // ── Progress calculations ──
  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = day.exercises.reduce((sum, ex) => {
    return sum + Array.from({ length: ex.sets }, (_, i) => getSetCompleted(ex.id, i + 1)).filter(Boolean).length;
  }, 0);
  const completedExercises = day.exercises.filter(ex => {
    return Array.from({ length: ex.sets }, (_, i) => getSetCompleted(ex.id, i + 1)).every(Boolean);
  }).length;
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const allDone = completedExercises === day.exercises.length;

  // ── Abbreviate day names for pills ──
  const abbreviate = (name: string) =>
    name.replace('Upper Body ', 'Upper ').replace('Lower Body ', 'Lower ');

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 12px' : '24px' }}>
      {/* Program Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{program.name}</h2>
        <p style={styles.subtitle}>{program.durationWeeks} week program</p>
      </div>

      {/* Day Selector — shows workout names + highlights today */}
      <div style={styles.dayRow}>
        {program.days.map((d, i) => {
          const isSelected = i === selectedDay;
          const isToday = i === todayDayIndex;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(i)}
              style={{
                ...styles.dayPill,
                background: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: isSelected ? '#07090e' : 'var(--text-primary)',
                border: isSelected ? '1px solid var(--accent-primary)' : isToday ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              }}
            >
              <span>{abbreviate(d.name)}</span>
              {isToday && !isSelected && <div style={styles.todayDot} />}
            </button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressWrap}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>
            {allDone ? 'Workout Complete!' : `${completedSets}/${totalSets} sets`}
          </span>
          <span style={{
            ...styles.progressPct,
            color: allDone ? 'var(--accent-success)' : 'var(--accent-primary)',
          }}>
            {progressPct}%
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={{
            ...styles.progressBarFill,
            width: `${progressPct}%`,
            background: allDone ? 'var(--accent-success)' : 'var(--accent-primary)',
          }} />
        </div>
      </div>

      {/* Rest Timer (floating) */}
      {restTimer && (
        <div style={styles.timerBar}>
          <Timer size={16} color="var(--accent-secondary)" />
          <span style={styles.timerText}>Rest: {restTimer.seconds}s</span>
          <div style={styles.timerBarBg}>
            <div style={{
              ...styles.timerBarFill,
              width: `${(restTimer.seconds / restTimer.total) * 100}%`,
            }} />
          </div>
          <button style={styles.timerSkip} onClick={clearTimer}>Skip</button>
        </div>
      )}

      {/* Exercise List */}
      <div style={styles.exerciseList}>
        {day.exercises.map((exercise, _ei) => {
          const isExpanded = expandedExercise === exercise.id;
          const allSetsComplete = Array.from({ length: exercise.sets }, (_, i) =>
            getSetCompleted(exercise.id, i + 1)
          ).every(Boolean);
          const completedCount = Array.from({ length: exercise.sets }, (_, i) =>
            getSetCompleted(exercise.id, i + 1)
          ).filter(Boolean).length;

          return (
            <div key={exercise.id} style={styles.exerciseCardStatic}>
              {/* Exercise Header */}
              <div
                style={styles.exerciseHeader}
                onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
              >
                <div style={styles.exerciseLeft}>
                  {allSetsComplete ? (
                    <CheckCircle2 size={20} color="var(--accent-success)" />
                  ) : (
                    <div style={styles.exerciseProgress}>
                      <Circle size={20} color="var(--text-tertiary)" />
                      {completedCount > 0 && (
                        <span style={styles.exerciseProgressText}>{completedCount}/{exercise.sets}</span>
                      )}
                    </div>
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
                <div style={styles.setsWrap}>
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
                      const log = getSetLog(exercise.id, setNum);
                      const loggedRpe = log?.rpe;
                      return (
                        <div key={setNum}>
                          <div style={styles.setRow}>
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
                                if (completed) {
                                  onRemoveLog(exercise.id, setNum, todayStr);
                                } else {
                                  const logId = `sl-${exercise.id}-${setNum}-${Date.now()}`;
                                  const parsedReps = parseInt(exercise.reps.split('-')[0]) || 10;
                                  onLogSet({
                                    id: logId,
                                    date: todayStr,
                                    exerciseId: exercise.id,
                                    exerciseName: exercise.name,
                                    setNumber: setNum,
                                    reps: parsedReps,
                                    weight: exercise.weight,
                                    completed: true,
                                    rpe: null,
                                  });
                                  if (exercise.restSeconds && setNum < exercise.sets) {
                                    setRestTimer({
                                      exerciseId: exercise.id,
                                      seconds: exercise.restSeconds,
                                      total: exercise.restSeconds,
                                    });
                                  }
                                }
                              }}
                            >
                              {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                          </div>
                          {/* RPE selector — shown after set is completed */}
                          {completed && (
                            <div style={styles.rpeRow}>
                              <span style={styles.rpeLabel}>
                                RPE{exercise.rpe ? ` (target ${exercise.rpe})` : ''}
                              </span>
                              <div style={styles.rpePills}>
                                {[6, 7, 8, 9, 10].map(val => {
                                  const isSelected = loggedRpe === val;
                                  return (
                                    <button
                                      key={val}
                                      style={{
                                        ...styles.rpePill,
                                        background: isSelected
                                          ? val >= 9 ? 'var(--accent-danger-dim)' : 'var(--accent-primary-dim)'
                                          : 'transparent',
                                        borderColor: isSelected
                                          ? val >= 9 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                                          : 'var(--glass-border)',
                                        color: isSelected
                                          ? val >= 9 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                                          : 'var(--text-tertiary)',
                                      }}
                                      onClick={() => onUpdateLog(exercise.id, setNum, todayStr, {
                                        rpe: isSelected ? null : val,
                                      })}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <GlassCard delay={0.1} style={styles.summaryCard}>
        <div style={styles.summaryRow}>
          <Zap size={18} color={allDone ? 'var(--accent-success)' : 'var(--accent-primary)'} />
          <div>
            <div style={{
              ...styles.summaryTitle,
              color: allDone ? 'var(--accent-success)' : 'var(--text-primary)',
            }}>
              {allDone
                ? 'All exercises done — great work!'
                : `${completedExercises}/${day.exercises.length} exercises completed`}
            </div>
            <div style={styles.summarySub}>
              {allDone
                ? 'Rest up and come back stronger tomorrow.'
                : `${totalSets - completedSets} sets remaining — keep going!`}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: '100%',
  },
  header: { marginBottom: '4px', position: 'relative', zIndex: 2 },
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

  // ── Day Selector ──
  dayRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    position: 'relative',
    zIndex: 2,
  },
  dayPill: {
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  todayDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
  },

  // ── Progress Bar ──
  progressWrap: { position: 'relative', zIndex: 2 },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  progressLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  progressPct: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  progressBarBg: {
    height: '6px',
    borderRadius: '3px',
    background: 'var(--glass-border)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },

  // ── Rest Timer ──
  timerBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(0,229,200,0.06)',
    border: '1px solid rgba(0,229,200,0.15)',
  },
  timerText: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-secondary)',
    minWidth: '70px',
  },
  timerBarBg: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    background: 'var(--glass-border)',
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: '2px',
    background: 'var(--accent-secondary)',
    transition: 'width 1s linear',
  },
  timerSkip: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },

  // ── Exercise Cards ──
  exerciseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    position: 'relative',
    zIndex: 1,
  },
  exerciseCardStatic: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    boxShadow: 'var(--shadow-card)',
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
  exerciseProgress: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseProgressText: {
    position: 'absolute',
    fontSize: '7px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
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

  // ── RPE Selector ──
  rpeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0 4px',
  },
  rpeLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
  rpePills: {
    display: 'flex',
    gap: '4px',
  },
  rpePill: {
    width: '30px',
    height: '26px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: 'transparent',
  },

  // ── Summary ──
  summaryCard: {
    marginBottom: '24px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: 600,
  },
  summarySub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },

  // ── Empty State ──
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
