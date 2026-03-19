import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Dumbbell, Timer, Minus, Plus, Play, X, ChevronRight, Trophy, Menu } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { WorkoutProgram, WorkoutSetLog, WorkoutLog, WeeklySchedule } from '../types';

interface ProgramPageProps {
  program: WorkoutProgram | null;
  setLogs: WorkoutSetLog[];
  onLogSet: (log: WorkoutSetLog) => void;
  onLogWorkout: (type: string, date: string) => void;
  onRemoveWorkout: (type: string, date: string) => void;
  onRemoveLog: (exerciseId: string, setNumber: number, date: string) => void;
  onUpdateLog: (exerciseId: string, setNumber: number, date: string, updates: Partial<WorkoutSetLog>) => void;
  workoutLogs: WorkoutLog[];
  weeklySchedule: WeeklySchedule | null;
}

export default function ProgramPage({ program, setLogs, onLogSet, onLogWorkout, onRemoveWorkout, onRemoveLog, onUpdateLog, workoutLogs, weeklySchedule }: ProgramPageProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();

  // ── Compute today's workout day index (schedule-aware) ──
  // DEV OVERRIDE: pretend today is Friday (mondayBased=4) so we can demo all 3 workout types
  // Remove this override before deploying!
  const DEV_DAY_OVERRIDE: number | null = null; // set to 0-6 (Mon-Sun) for demo, null for real date
  const dayAssignments = weeklySchedule?.dayAssignments ?? {};
  const todayDayIndex = (() => {
    if (!program || program.days.length === 0) return 0;
    const dayOfWeek = new Date().getDay();
    const mondayBased = DEV_DAY_OVERRIDE ?? (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const assignedId = dayAssignments[String(mondayBased)];
    if (assignedId) {
      const idx = program.days.findIndex(d => d.id === assignedId);
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  const selectedDay = todayDayIndex;
  // @ts-ignore - scaffolded for exercise expand/collapse UI
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // ── Workout Mode state ──
  const [workoutActive, setWorkoutActive] = useState(false);
  const [workoutExerciseIdx, setWorkoutExerciseIdx] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<number>(0);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // ── Editable set state ──
  const [editingSet, setEditingSet] = useState<Record<string, { reps: number; weight: string }>>({});

  const updateEditValue = (exerciseId: string, setNum: number, field: 'reps' | 'weight', value: number | string) => {
    const key = `${exerciseId}-${setNum}`;
    setEditingSet(prev => ({
      ...prev,
      [key]: { ...getEditValues(exerciseId, setNum, { reps: '10', weight: '0' }), [field]: value },
    }));
  };

  // ── Rest timer state ──
  const [restTimer, setRestTimer] = useState<{ exerciseId: string; seconds: number; total: number } | null>(null);

  const clearTimer = useCallback(() => setRestTimer(null), []);

  // Rest timer countdown
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

  // Countdown timer before workout starts: 3 → 2 → 1 → "GO!" → start
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === -1) {
      // "GO!" was shown, now start the workout
      const timeout = setTimeout(() => {
        setCountdown(null);
        setWorkoutActive(true);
        setWorkoutExerciseIdx(0);
        setWorkoutStartTime(Date.now());
        setWorkoutElapsed(0);
        setWorkoutFinished(false);
        setRestTimer(null);
      }, 1500);
      return () => clearTimeout(timeout);
    }
    if (countdown === 0) {
      // Transition from 1 → GO!
      const timeout = setTimeout(() => setCountdown(-1), 1000);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timeout);
  }, [countdown]);

  // Workout elapsed timer
  useEffect(() => {
    if (!workoutActive || workoutFinished) return;
    const interval = setInterval(() => {
      setWorkoutElapsed(Math.floor((Date.now() - workoutStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutActive, workoutStartTime, workoutFinished]);

  if (!program) {
    return (
      <div style={styles.page}>
        <GlassCard>
          <div style={styles.emptyState}>
            <Dumbbell size={40} color="var(--text-tertiary)" />
            <h3 style={styles.emptyTitle}>{t.program.noProgram}</h3>
            <p style={styles.emptySub}>{t.program.noProgramSub}</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  const day = program.days[selectedDay];
  const todayStr = new Date().toISOString().split('T')[0];

  const isTodaysWorkout = selectedDay === todayDayIndex && (() => {
    const dow = new Date().getDay();
    const mondayBased = DEV_DAY_OVERRIDE ?? (dow === 0 ? 6 : dow - 1);
    return !!dayAssignments[String(mondayBased)];
  })();

  if (!day) {
    return (
      <div style={styles.page}>
        <GlassCard>
          <div style={styles.emptyState}>
            <Dumbbell size={40} color="var(--text-tertiary)" />
            <h3 style={styles.emptyTitle}>{t.program.noProgram}</h3>
            <p style={styles.emptySub}>{t.program.noProgramSub}</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  const getSetCompleted = (exerciseId: string, setNum: number) => {
    return setLogs.some(l => l.exerciseId === exerciseId && l.setNumber === setNum && l.completed && l.date === todayStr);
  };

  const getSetLog = (exerciseId: string, setNum: number) => {
    return setLogs.find(l => l.exerciseId === exerciseId && l.setNumber === setNum && l.date === todayStr);
  };

  const getLastSession = (exerciseId: string, setNum: number) => {
    return setLogs
      .filter(l => l.exerciseId === exerciseId && l.setNumber === setNum && l.completed && l.date !== todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  };

  const getEditValues = (exerciseId: string, setNum: number, exercise: { reps: string; weight: string }) => {
    const key = `${exerciseId}-${setNum}`;
    if (editingSet[key]) return editingSet[key];
    const parsedReps = parseInt(exercise.reps.split('-')[0]) || 10;
    return { reps: parsedReps, weight: exercise.weight };
  };

  // ── Progress calculations ──
  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = day.exercises.reduce((sum, ex) => {
    return sum + Array.from({ length: ex.sets }, (_, i) => getSetCompleted(ex.id, i + 1)).filter(Boolean).length;
  }, 0);
  // @ts-ignore - scaffolded for progress bar UI
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const allDone = completedSets === totalSets && totalSets > 0;

  // Auto-log workout when all sets are completed
  const alreadyLogged = workoutLogs.some(l => l.type === day.name && l.date === todayStr && l.completed);
  useEffect(() => {
    if (allDone && isTodaysWorkout && !alreadyLogged) {
      onLogWorkout(day.name, todayStr);
    }
  }, [allDone, isTodaysWorkout, alreadyLogged]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Workout Mode handlers ──
  const startWorkout = () => {
    setCountdown(3);
  };

  const endWorkout = () => {
    setWorkoutFinished(true);
    setRestTimer(null);
  };

  const closeWorkout = () => {
    setWorkoutActive(false);
    setWorkoutFinished(false);
    setWorkoutExerciseIdx(0);
    setRestTimer(null);
  };

  const goNextExercise = () => {
    if (workoutExerciseIdx < day.exercises.length - 1) {
      setWorkoutExerciseIdx(prev => prev + 1);
      setRestTimer(null);
    } else {
      endWorkout();
    }
  };

  // @ts-ignore - scaffolded for workout mode navigation
  const goPrevExercise = () => {
    if (workoutExerciseIdx > 0) {
      setWorkoutExerciseIdx(prev => prev - 1);
      setRestTimer(null);
    }
  };

  // Calculate total volume for summary
  const getTotalVolume = () => {
    let volume = 0;
    day.exercises.forEach(ex => {
      for (let i = 1; i <= ex.sets; i++) {
        const log = getSetLog(ex.id, i);
        if (log?.completed) {
          const w = parseFloat(log.weight) || 0;
          volume += w * log.reps;
        }
      }
    });
    return Math.round(volume);
  };

  // ── Render set logging (shared between overview expanded and workout mode) ──
  // @ts-ignore - scaffolded for detailed set logging UI
  const renderSetRow = (exercise: typeof day.exercises[0], setNum: number, compact: boolean = false) => {
    const completed = getSetCompleted(exercise.id, setNum);
    const log = getSetLog(exercise.id, setNum);
    const lastSession = getLastSession(exercise.id, setNum);
    const loggedRpe = log?.rpe;
    const editVals = getEditValues(exercise.id, setNum, exercise);

    return (
      <div key={setNum} style={{
        ...styles.setBlock,
        opacity: completed ? 0.55 : 1,
        background: completed ? 'rgba(0,229,200,0.04)' : 'transparent',
        padding: compact ? '10px 8px' : '8px 4px',
      }}>
        <div style={{
          ...styles.setRow,
          gridTemplateColumns: compact ? '32px 1fr 1fr 44px' : '36px 1fr 1fr 44px 44px',
        }}>
          <span style={{
            ...styles.setLabel,
            color: completed ? 'var(--accent-success)' : 'var(--text-secondary)',
            fontSize: compact ? '16px' : '15px',
          }}>
            {setNum}
          </span>

          {/* Reps */}
          {completed ? (
            <span style={{ ...styles.setValueCompleted, fontSize: compact ? '17px' : '15px' }}>{log?.reps ?? editVals.reps}</span>
          ) : (
            <div style={styles.editableGroup}>
              <button
                style={{ ...styles.stepBtn, width: compact ? '34px' : '28px', height: compact ? '34px' : '28px' }}
                onClick={() => updateEditValue(exercise.id, setNum, 'reps', Math.max(1, editVals.reps - 1))}
                disabled={!isTodaysWorkout}
              >
                <Minus size={compact ? 14 : 12} />
              </button>
              <span style={{ ...styles.editableValue, fontSize: compact ? '18px' : '16px' }}>{editVals.reps}</span>
              <button
                style={{ ...styles.stepBtn, width: compact ? '34px' : '28px', height: compact ? '34px' : '28px' }}
                onClick={() => updateEditValue(exercise.id, setNum, 'reps', editVals.reps + 1)}
                disabled={!isTodaysWorkout}
              >
                <Plus size={compact ? 14 : 12} />
              </button>
            </div>
          )}

          {/* Weight */}
          {completed ? (
            <span style={{ ...styles.setValueCompleted, fontSize: compact ? '17px' : '15px' }}>{log?.weight ?? editVals.weight}</span>
          ) : (
            <input
              type="text"
              value={editVals.weight}
              onChange={(e) => updateEditValue(exercise.id, setNum, 'weight', e.target.value)}
              style={{ ...styles.weightInput, padding: compact ? '8px' : '6px 8px', fontSize: compact ? '15px' : '14px' }}
              disabled={!isTodaysWorkout}
            />
          )}

          {/* RPE badge (only in non-compact / overview mode) */}
          {!compact && (
            completed ? (
              <span style={{
                ...styles.rpeBadge,
                color: (loggedRpe ?? 0) >= 9 ? 'var(--accent-danger)' : 'var(--accent-primary)',
                background: (loggedRpe ?? 0) >= 9 ? 'var(--accent-danger-dim)' : 'var(--accent-primary-dim)',
              }}>
                {loggedRpe ?? '-'}
              </span>
            ) : (
              <span style={styles.rpeTarget}>{exercise.rpe ?? '-'}</span>
            )
          )}

          {/* Complete button */}
          <button
            disabled={!isTodaysWorkout}
            style={{
              ...styles.setCheckBtn,
              width: compact ? '50px' : '44px',
              height: compact ? '50px' : '44px',
              background: completed ? 'var(--accent-success)' : 'transparent',
              borderColor: completed ? 'var(--accent-success)' : 'var(--glass-border)',
              color: completed ? '#07090e' : 'var(--text-tertiary)',
              opacity: isTodaysWorkout ? 1 : 0.3,
              cursor: isTodaysWorkout ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              if (!isTodaysWorkout) return;
              if (completed) {
                onRemoveLog(exercise.id, setNum, todayStr);
              } else {
                const vals = getEditValues(exercise.id, setNum, exercise);
                onLogSet({
                  id: crypto.randomUUID(),
                  date: todayStr,
                  exerciseId: exercise.id,
                  exerciseName: exercise.name,
                  setNumber: setNum,
                  reps: vals.reps,
                  weight: vals.weight,
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
            {completed ? <CheckCircle2 size={compact ? 20 : 16} /> : <Circle size={compact ? 20 : 16} />}
          </button>
        </div>

        {/* RPE selector after completing (only if no RPE logged yet) */}
        {completed && !loggedRpe && (
          <div style={styles.rpeRow}>
            <span style={styles.rpeLabel}>How hard?</span>
            <div style={styles.rpePills}>
              {[6, 7, 8, 9, 10].map(val => (
                <button
                  key={val}
                  disabled={!isTodaysWorkout}
                  style={{
                    ...styles.rpePill,
                    width: compact ? '38px' : '34px',
                    height: compact ? '34px' : '30px',
                    background: 'transparent',
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-tertiary)',
                    opacity: isTodaysWorkout ? 1 : 0.3,
                    cursor: isTodaysWorkout ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    if (!isTodaysWorkout) return;
                    onUpdateLog(exercise.id, setNum, todayStr, { rpe: val });
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Last session hint */}
        {!completed && lastSession && (
          <div style={styles.lastSession}>
            Last: {lastSession.weight} × {lastSession.reps}
            {lastSession.rpe ? ` @ RPE ${lastSession.rpe}` : ''}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════
  // ── COUNTDOWN before workout starts
  // ═══════════════════════════════════════════════════
  if (countdown !== null) {
    const isGo = countdown === -1;
    const circleProgress = isGo ? 0 : (countdown / 3);
    return (
      <div style={styles.countdownOverlay}>
        <div style={styles.countdownContent}>
          <span style={styles.countdownLabel}>{isGo ? '' : 'Get Ready'}</span>
          <div style={styles.countdownCircle}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="82" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <circle
                cx="90" cy="90" r="82" fill="none"
                stroke={isGo ? 'var(--accent-success, #22c55e)' : 'var(--accent-primary)'}
                strokeWidth="4"
                strokeDasharray={isGo ? '515.2 515.2' : `${circleProgress * 515.2} 515.2`}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dasharray 0.9s linear' }}
              />
            </svg>
            <span style={{
              ...styles.countdownNumber,
              ...(isGo ? { fontSize: '48px', color: 'var(--accent-success, #22c55e)' } : {}),
            }} key={countdown}>{isGo ? 'GO!' : countdown}</span>
          </div>
          <span style={styles.countdownExercise}>{day.name}</span>
          <span style={styles.countdownMeta}>{day.exercises.length} exercises</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // ── WORKOUT MODE: Full-screen immersive experience
  // ═══════════════════════════════════════════════════
  if (workoutActive) {
    const currentExercise = day.exercises[workoutExerciseIdx];

    // Workout finished summary
    if (workoutFinished) {
      const completedExCount = day.exercises.filter(ex =>
        Array.from({ length: ex.sets }, (_, i) => getSetCompleted(ex.id, i + 1)).every(Boolean)
      ).length;

      return (
        <div style={styles.workoutOverlay}>
          <div style={styles.summaryScreen}>
            <div style={styles.summaryIcon}>
              <Trophy size={48} color="var(--accent-primary)" />
            </div>
            <h2 style={styles.summaryTitle}>Workout Complete</h2>
            <p style={styles.summarySubtitle}>{day.name}</p>

            <div style={styles.summaryStats}>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatValue}>{formatTime(workoutElapsed)}</span>
                <span style={styles.summaryStatLabel}>Duration</span>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatValue}>{completedSets}/{totalSets}</span>
                <span style={styles.summaryStatLabel}>Sets</span>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatValue}>{completedExCount}/{day.exercises.length}</span>
                <span style={styles.summaryStatLabel}>Exercises</span>
              </div>
            </div>

            {getTotalVolume() > 0 && (
              <div style={styles.summaryVolume}>
                <span style={styles.summaryVolumeLabel}>Total Volume</span>
                <span style={styles.summaryVolumeValue}>{getTotalVolume().toLocaleString()} kg</span>
              </div>
            )}

            <button style={styles.summaryCloseBtn} onClick={closeWorkout}>
              Done
            </button>
          </div>
        </div>
      );
    }

    if (!currentExercise) {
      endWorkout();
      return null;
    }

    // Find the current (next incomplete) set for this exercise
    const currentSetNum = (() => {
      for (let i = 1; i <= currentExercise.sets; i++) {
        if (!getSetCompleted(currentExercise.id, i)) return i;
      }
      return currentExercise.sets; // all done
    })();

    const exAllDone = Array.from({ length: currentExercise.sets }, (_, i) =>
      getSetCompleted(currentExercise.id, i + 1)
    ).every(Boolean);
    // @ts-ignore - scaffolded for workout mode progress display
    const exCompletedCount = Array.from({ length: currentExercise.sets }, (_, i) =>
      getSetCompleted(currentExercise.id, i + 1)
    ).filter(Boolean).length;

    const isResting = restTimer && restTimer.exerciseId === currentExercise.id;
    const lastSession = getLastSession(currentExercise.id, currentSetNum);

    const completeCurrentSet = () => {
      const vals = getEditValues(currentExercise.id, currentSetNum, currentExercise);
      onLogSet({
        id: crypto.randomUUID(),
        date: todayStr,
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name,
        setNumber: currentSetNum,
        reps: vals.reps,
        weight: vals.weight,
        completed: true,
        rpe: null,
      });
      // Start rest timer if not the last set
      if (currentExercise.restSeconds && currentSetNum < currentExercise.sets) {
        setRestTimer({
          exerciseId: currentExercise.id,
          seconds: currentExercise.restSeconds,
          total: currentExercise.restSeconds,
        });
      }
    };

    return (
      <div style={styles.workoutOverlay}>
        {/* Exercise drawer overlay */}
        {drawerOpen && (
          <>
            <div style={styles.drawerBackdrop} onClick={() => setDrawerOpen(false)} />
            <div style={styles.drawer}>
              <div style={styles.drawerHeader}>
                <span style={styles.drawerTitle}>Exercises</span>
                <button style={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div style={styles.drawerList}>
                {day.exercises.map((ex, i) => {
                  const exDone = Array.from({ length: ex.sets }, (_, j) =>
                    getSetCompleted(ex.id, j + 1)
                  ).every(Boolean);
                  const exSetsCompleted = Array.from({ length: ex.sets }, (_, j) =>
                    getSetCompleted(ex.id, j + 1)
                  ).filter(Boolean).length;
                  const isCurrent = i === workoutExerciseIdx;
                  return (
                    <button
                      key={ex.id}
                      style={{
                        ...styles.drawerItem,
                        background: isCurrent ? 'rgba(0,229,200,0.08)' : 'transparent',
                        borderColor: isCurrent ? 'var(--accent-primary)' : 'transparent',
                      }}
                      onClick={() => {
                        setWorkoutExerciseIdx(i);
                        setRestTimer(null);
                        setDrawerOpen(false);
                      }}
                    >
                      <div style={{
                        ...styles.drawerItemDot,
                        background: exDone ? 'var(--accent-success)' : isCurrent ? 'var(--accent-primary)' : 'var(--glass-border)',
                      }}>
                        {exDone ? <CheckCircle2 size={14} color="#07090e" /> : <span style={styles.drawerItemNum}>{i + 1}</span>}
                      </div>
                      <div style={styles.drawerItemInfo}>
                        <span style={{
                          ...styles.drawerItemName,
                          color: exDone ? 'var(--text-tertiary)' : 'var(--text-primary)',
                        }}>{ex.name}</span>
                        <span style={styles.drawerItemMeta}>
                          {ex.sets} × {ex.reps} · {ex.weight}
                          {exSetsCompleted > 0 && !exDone ? ` · ${exSetsCompleted}/${ex.sets} done` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Workout header bar */}
        <div style={styles.workoutHeader}>
          <button style={styles.workoutCloseBtn} onClick={closeWorkout}>
            <X size={20} />
          </button>
          <div style={styles.workoutTimer}>
            <Timer size={14} color="var(--accent-primary)" />
            <span style={styles.workoutTimerText}>{formatTime(workoutElapsed)}</span>
          </div>
          <button style={styles.workoutMenuBtn} onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </button>
        </div>

        {/* Mini progress dots */}
        <div style={styles.exerciseDots}>
          {day.exercises.map((ex, i) => {
            const done = Array.from({ length: ex.sets }, (_, j) =>
              getSetCompleted(ex.id, j + 1)
            ).every(Boolean);
            return (
              <div
                key={ex.id}
                style={{
                  ...styles.exerciseDot,
                  background: done ? 'var(--accent-success)' : i === workoutExerciseIdx ? 'var(--accent-primary)' : 'var(--glass-border)',
                  width: i === workoutExerciseIdx ? '24px' : '8px',
                }}
              />
            );
          })}
        </div>

        {/* Single-focus content */}
        <div style={styles.workoutContent}>
          <div style={styles.workoutExName}>{currentExercise.name}</div>

          {/* Set dots - small indicators for which set you're on */}
          <div style={styles.setDots}>
            {Array.from({ length: currentExercise.sets }, (_, i) => (
              <div key={i} style={{
                ...styles.setDot,
                background: getSetCompleted(currentExercise.id, i + 1)
                  ? 'var(--accent-success)'
                  : i + 1 === currentSetNum
                    ? 'var(--accent-primary)'
                    : 'var(--glass-border)',
              }} />
            ))}
          </div>

          {/* Rest timer - takes over the center when active */}
          {isResting ? (
            <div style={styles.restCenter}>
              <div style={styles.restCircleLarge}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="72" fill="none" stroke="var(--glass-border)" strokeWidth="4" />
                  <circle
                    cx="80" cy="80" r="72" fill="none"
                    stroke="var(--accent-primary)" strokeWidth="4"
                    strokeDasharray={`${(restTimer!.seconds / restTimer!.total) * 452.4} 452.4`}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <span style={styles.restCenterValue}>{restTimer!.seconds}s</span>
              </div>
              <span style={styles.restCenterLabel}>Rest</span>
              <button style={styles.restSkipBtn} onClick={clearTimer}>Skip</button>
            </div>
          ) : exAllDone ? (
            /* All sets done for this exercise */
            <div style={styles.exDoneCenter}>
              <CheckCircle2 size={56} color="var(--accent-success)" />
              <span style={styles.exDoneText}>All {currentExercise.sets} sets done</span>
            </div>
          ) : (
            /* Current set - the one thing to focus on */
            <div style={styles.focusCenter}>
              <span style={styles.focusSetLabel}>Set {currentSetNum} of {currentExercise.sets}</span>
              <div style={styles.focusTarget}>
                <div style={styles.focusTargetBlock}>
                  <span style={styles.focusTargetValue}>{currentExercise.reps}</span>
                  <span style={styles.focusTargetLabel}>reps</span>
                </div>
                <span style={styles.focusTargetSep}>×</span>
                <div style={styles.focusTargetBlock}>
                  <span style={styles.focusTargetValue}>{currentExercise.weight}</span>
                  <span style={styles.focusTargetLabel}>weight</span>
                </div>
              </div>
              {currentExercise.rpe && (
                <span style={styles.focusRpe}>Target RPE {currentExercise.rpe}</span>
              )}
              {lastSession && (
                <span style={styles.focusLast}>Last: {lastSession.weight} × {lastSession.reps}{lastSession.rpe ? ` @ RPE ${lastSession.rpe}` : ''}</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div style={styles.workoutFooter}>
          {exAllDone ? (
            <button style={styles.workoutNextBtn} onClick={goNextExercise}>
              <span>{workoutExerciseIdx === day.exercises.length - 1 ? 'Finish Workout' : 'Next Exercise'}</span>
              <ChevronRight size={18} />
            </button>
          ) : isResting ? (
            <button style={{ ...styles.workoutNextBtn, opacity: 0.3 }} disabled>
              <span>Resting...</span>
            </button>
          ) : (
            <button style={styles.workoutDoneBtn} onClick={completeCurrentSet}>
              <CheckCircle2 size={22} />
              <span>Set Done</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ── OVERVIEW MODE: Program page with exercise list
  // ═══════════════════════════════════════════════
  // ── Rest day check ──
  const hasTodayWorkout = (() => {
    const dow = new Date().getDay();
    const mondayBased = DEV_DAY_OVERRIDE ?? (dow === 0 ? 6 : dow - 1);
    return !!dayAssignments[String(mondayBased)];
  })();

  if (!hasTodayWorkout) {
    // Find next training day
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dow = new Date().getDay();
    const mondayBased = dow === 0 ? 6 : dow - 1;
    let nextDayLabel = '';
    let nextWorkout = '';
    for (let offset = 1; offset <= 7; offset++) {
      const checkDay = (mondayBased + offset) % 7;
      const assignedId = dayAssignments[String(checkDay)];
      if (assignedId) {
        nextDayLabel = dayNames[checkDay];
        const found = program.days.find(d => d.id === assignedId);
        nextWorkout = found ? found.name : '';
        break;
      }
    }

    return (
      <div style={{ ...styles.page, padding: isMobile ? '20px 16px' : '24px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.restDayCard}>
          <div style={styles.restDayEmoji}>&#128564;</div>
          <h2 style={styles.restDayTitle}>Rest Day</h2>
          <p style={styles.restDaySub}>No workout scheduled for today. Recover and come back stronger.</p>
          {nextDayLabel && nextWorkout && (
            <div style={styles.nextWorkout}>
              <span style={styles.nextWorkoutLabel}>Next up</span>
              <span style={styles.nextWorkoutValue}>{nextDayLabel} - {nextWorkout}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Session-based workout (no exercises, e.g. BJJ, Boxing classes) ──
  const isSessionWorkout = day.exercises.length === 0;
  const sessionLogged = isSessionWorkout && workoutLogs.some(
    l => l.date === todayStr && l.type === day.name && l.completed
  );

  if (isSessionWorkout) {
    return (
      <div style={{ ...styles.page, padding: isMobile ? '20px 16px' : '24px' }}>
        <div style={styles.header}>
          <p style={styles.todayLabel}>Today's Workout</p>
          <h2 style={styles.title}>{day.name}</h2>
          <p style={styles.subtitle}>Session workout</p>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          padding: '40px 24px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)', textAlign: 'center',
        }}>
          {sessionLogged ? (
            <>
              <CheckCircle2 size={48} color="var(--accent-success)" />
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Session Complete</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Great work today!</div>
              </div>
              <button
                onClick={() => onRemoveWorkout(day.name, todayStr)}
                style={{
                  padding: '8px 20px', border: '1px solid var(--border-primary)', borderRadius: '10px',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)',
                  cursor: 'pointer', marginTop: '4px',
                }}
              >
                Undo
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', lineHeight: 1 }}>&#129354;</div>
              <div>
                <div style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                  Tap below when you've finished your session
                </div>
              </div>
              <button
                onClick={() => onLogWorkout(day.name, todayStr)}
                style={{
                  ...styles.actionBtn,
                  width: '100%', maxWidth: '280px', justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={20} color="#07090e" />
                <span>Mark as Done</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? '20px 16px' : '24px' }}>
      {/* Today's Workout Header */}
      <div style={styles.header}>
        <p style={styles.todayLabel}>Today's Workout</p>
        <h2 style={styles.title}>{day.name}</h2>
        <p style={styles.subtitle}>{day.exercises.length} exercises · {totalSets} sets</p>
      </div>

      {/* Exercise list - the main content */}
      <div style={styles.exerciseListCard}>
        {day.exercises.map((exercise, i) => (
          <div key={exercise.id} style={{
            ...styles.exerciseRow,
            borderBottom: i < day.exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={styles.exerciseNum}>{i + 1}</span>
            <div style={styles.exerciseInfo}>
              <span style={styles.exerciseNameText}>{exercise.name}</span>
              <span style={styles.exerciseDetail}>
                {exercise.sets} × {exercise.reps}
                {exercise.weight ? ` · ${exercise.weight}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Start / Resume Workout - clean action button */}
      {isTodaysWorkout && !allDone && (
        <button style={styles.actionBtn} onClick={startWorkout}>
          <Play size={20} fill="#07090e" color="#07090e" />
          <span>{completedSets > 0 ? 'Continue Workout' : 'Start Workout'}</span>
          {completedSets > 0 && (
            <span style={styles.actionBtnBadge}>{completedSets}/{totalSets}</span>
          )}
        </button>
      )}

      {/* Completed state */}
      {allDone && (
        <div style={styles.completedCard}>
          <CheckCircle2 size={24} color="var(--accent-success)" />
          <div>
            <div style={styles.completedTitle}>Workout Complete</div>
            <div style={styles.completedSub}>{completedSets}/{totalSets} sets done</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', paddingBottom: '120px' },
  header: { marginBottom: '4px', position: 'relative', zIndex: 2 },
  todayLabel: { fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' },
  title: { fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' },
  subtitle: { fontSize: '15px', color: 'var(--text-secondary)', marginTop: '2px' },

  // ── Rest Day ──
  restDayCard: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px', padding: '40px 24px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' as const, maxWidth: '360px', width: '100%' },
  restDayEmoji: { fontSize: '48px', lineHeight: 1 },
  restDayTitle: { fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  restDaySub: { fontSize: '15px', color: 'var(--text-secondary)', margin: 0, maxWidth: '280px' },
  nextWorkout: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', marginTop: '8px', padding: '12px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary-dim)' },
  nextWorkoutLabel: { fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  nextWorkoutValue: { fontSize: '15px', fontWeight: 600, color: 'var(--accent-primary)' },
  // ── Exercise List Card ──
  exerciseListCard: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  exerciseRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' },
  exerciseNum: { width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 },
  exerciseInfo: { display: 'flex', flexDirection: 'column' as const, gap: '3px' },
  exerciseNameText: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' },
  exerciseDetail: { fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' },

  // ── Completed Card ──
  completedCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(0,229,200,0.06)', border: '1px solid rgba(0,229,200,0.2)', borderRadius: 'var(--radius-lg)' },
  completedTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--accent-success)' },
  completedSub: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' },

  progressWrap: { position: 'relative', zIndex: 2 },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  progressLabel: { fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' },
  progressPct: { fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  progressBarBg: { height: '7px', borderRadius: '4px', background: 'var(--glass-border)', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s ease' },

  // ── Exercise Cards (overview) ──
  exerciseList: { display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 },
  exerciseCard: { background: 'var(--bg-card)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-card)', transition: 'border-color 0.2s' },
  exerciseHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  exerciseLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  exerciseProgress: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' },
  exerciseProgressText: { position: 'absolute', fontSize: '7px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' },
  exerciseName: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' },
  exerciseMeta: { fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' },

  // ── Expanded Sets (overview) ──
  setsWrap: { marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' },
  tempoRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '12px' },
  exerciseNotes: { fontSize: '14px', color: 'var(--accent-warm)', marginBottom: '10px', fontStyle: 'italic' },
  setHeaderRow: { display: 'grid', gridTemplateColumns: '36px 1fr 1fr 44px 44px', gap: '8px', alignItems: 'center', padding: '0 0 6px', marginBottom: '4px' },
  setHeaderLabel: { fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', textAlign: 'center' as const },
  setsList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  setBlock: { borderRadius: 'var(--radius-sm)', transition: 'all 0.2s' },
  setRow: { display: 'grid', gap: '8px', alignItems: 'center' },
  setLabel: { fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'center' as const },
  editableGroup: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' },
  stepBtn: { borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s', padding: 0 },
  editableValue: { fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'center' as const },
  weightInput: { width: '100%', maxWidth: '80px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)', textAlign: 'center' as const, outline: 'none', margin: '0 auto', display: 'block' },
  setValueCompleted: { fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'center' as const },
  rpeBadge: { fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: '6px', textAlign: 'center' as const },
  rpeTarget: { fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'center' as const },
  setCheckBtn: { borderRadius: '10px', border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  rpeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0 2px', marginTop: '4px' },
  rpeLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' },
  rpePills: { display: 'flex', gap: '4px' },
  rpePill: { borderRadius: 'var(--radius-sm)', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.15s', background: 'transparent' },
  lastSession: { fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', paddingLeft: '36px', marginTop: '2px' },

  // ── Action Button ──
  actionBtn: {
    width: '100%',
    padding: '18px 24px',
    borderRadius: '16px',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '17px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 20px rgba(0,229,200,0.3)',
    transition: 'transform 0.1s',
    position: 'sticky' as const,
    bottom: '80px',
    zIndex: 10,
  },
  actionBtnBadge: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    background: 'rgba(7,9,14,0.15)',
    padding: '2px 8px',
    borderRadius: '8px',
    color: 'rgba(7,9,14,0.6)',
  },

  // ═══════════════════════════════════════
  // ── WORKOUT MODE STYLES ──
  // ═══════════════════════════════════════
  workoutOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  workoutHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
    borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0,
  },
  workoutCloseBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  workoutTimer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  workoutTimerText: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  workoutMenuBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  // Exercise drawer
  drawerBackdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 300,
  },
  drawer: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '300px',
    maxWidth: '85vw',
    background: 'var(--bg-primary)',
    borderLeft: '1px solid var(--glass-border)',
    zIndex: 301,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
    borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0,
  },
  drawerTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  drawerClose: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  drawerList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  drawerItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    marginBottom: '4px',
  },
  drawerItemDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  drawerItemNum: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  drawerItemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  drawerItemName: {
    fontSize: '14px',
    fontWeight: 600,
  },
  drawerItemMeta: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },

  // Exercise dots
  exerciseDots: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 16px 8px',
    flexShrink: 0,
  },
  exerciseDot: {
    height: '8px',
    borderRadius: '4px',
    transition: 'all 0.3s',
  },

  // Current exercise
  workoutContent: {
    flex: 1,
    overflow: 'auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0px',
  },
  workoutExName: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    textAlign: 'center' as const,
    marginBottom: '12px',
  },

  // Set dots (mini indicators)
  setDots: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px',
  },
  setDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'all 0.3s',
  },

  // Focus center - the ONE set
  focusCenter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  focusSetLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  focusTarget: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  focusTargetBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '16px 24px',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    minWidth: '100px',
  },
  focusTargetValue: {
    fontSize: '32px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    letterSpacing: '-1px',
  },
  focusTargetLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  focusTargetSep: {
    fontSize: '24px',
    fontWeight: 300,
    color: 'var(--text-tertiary)',
  },
  focusRpe: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    marginTop: '4px',
  },
  focusLast: {
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
  },

  // Exercise all done state
  exDoneCenter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  exDoneText: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--accent-success)',
  },

  // Rest timer (centered, large)
  restCenter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  },
  restCircleLarge: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restCenterValue: {
    position: 'absolute' as const,
    fontSize: '36px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  restCenterLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  restSkipBtn: {
    padding: '10px 28px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },

  // Bottom bar
  workoutFooter: {
    padding: '12px 16px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
    borderTop: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
  workoutNextBtn: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '17px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  workoutDoneBtn: {
    width: '100%',
    padding: '18px 20px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 20px rgba(0,229,200,0.3)',
  },

  // ── Summary Screen ──
  summaryScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    gap: '16px',
  },
  summaryIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'var(--accent-primary-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  summaryTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  summarySubtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    marginTop: '-8px',
  },
  summaryStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    marginTop: '16px',
  },
  summaryStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  summaryStatValue: {
    fontSize: '22px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  summaryStatLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  summaryDivider: {
    width: '1px',
    height: '32px',
    background: 'var(--glass-border)',
  },
  summaryVolume: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginTop: '8px',
  },
  summaryVolumeLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  summaryVolumeValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  summaryCloseBtn: {
    width: '100%',
    maxWidth: '300px',
    padding: '16px',
    borderRadius: 'var(--radius-lg)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '17px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    marginTop: '24px',
  },

  // Empty state
  emptyState: { textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  emptyTitle: { fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' },
  emptySub: { fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '280px' },

  // ── Countdown overlay ──
  countdownOverlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 200,
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '24px',
  },
  countdownLabel: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '3px',
  },
  countdownCircle: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    position: 'absolute' as const,
    fontSize: '72px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    animation: 'countdownPulse 1s ease-out',
  },
  countdownExercise: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginTop: '8px',
  },
  countdownMeta: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
};
