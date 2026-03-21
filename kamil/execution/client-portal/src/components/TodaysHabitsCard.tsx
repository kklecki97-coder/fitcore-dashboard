import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Droplets, Moon, Pill, Footprints, Brain,
  StretchHorizontal, Beef, Check, ChevronDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { useLang } from '../i18n';
import { useToast } from './Toast';
import type { Habit, HabitAssignment, HabitLog } from '../types';

const iconMap: Record<string, typeof Heart> = {
  Droplets, Moon, Pill, Footprints, Brain, StretchHorizontal, Beef, Heart,
};

type PresetKey = 'waterIntake' | 'sleep' | 'supplements' | 'steps' | 'meditation' | 'stretching' | 'proteinIntake' | 'creatine' | 'omega3' | 'vitaminD' | 'magnesium' | 'wheyProtein';
const presetNameKeys: Record<string, PresetKey> = {
  'h-water': 'waterIntake', 'h-sleep': 'sleep', 'h-supplements': 'supplements',
  'h-steps': 'steps', 'h-meditation': 'meditation', 'h-stretching': 'stretching',
  'h-protein': 'proteinIntake', 'h-creatine': 'creatine', 'h-omega3': 'omega3',
  'h-vitamind': 'vitaminD', 'h-magnesium': 'magnesium', 'h-whey': 'wheyProtein',
};

// Supplement habit IDs that group under expandable "Supplements" toggle
const SUPPLEMENT_IDS = new Set(['h-creatine', 'h-omega3', 'h-vitamind', 'h-magnesium', 'h-whey']);

interface TodaysHabitsCardProps {
  habits: Habit[];
  habitAssignments: HabitAssignment[];
  habitLogs: HabitLog[];
  onLogHabit: (log: HabitLog) => void;
  clientId: string;
  delay?: number;
  onNavigateToHabits?: () => void;
}

export default function TodaysHabitsCard({
  habits, habitAssignments, habitLogs, onLogHabit, clientId, delay = 0.08, onNavigateToHabits,
}: TodaysHabitsCardProps) {
  const { t } = useLang();
  const { showToast } = useToast();
  const getHabitName = (habit: Habit) => {
    const key = presetNameKeys[habit.id];
    return key ? t.habits[key] : habit.name;
  };
  const today = new Date().toISOString().split('T')[0];

  const activeAssignments = useMemo(() =>
    habitAssignments.filter(a => a.clientId === clientId && a.isActive),
  [habitAssignments, clientId]);

  // Split into regular habits and supplement sub-habits
  const regularAssignments = useMemo(() =>
    activeAssignments.filter(a => !SUPPLEMENT_IDS.has(a.habitId)),
  [activeAssignments]);
  const supplementAssignments = useMemo(() =>
    activeAssignments.filter(a => SUPPLEMENT_IDS.has(a.habitId)),
  [activeAssignments]);

  const todayLogs = useMemo(() =>
    habitLogs.filter(l => l.logDate === today && l.clientId === clientId),
  [habitLogs, today, clientId]);

  const completedCount = todayLogs.filter(l => l.completed).length;

  // Track animation for newly completed
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [suppsExpanded, setSuppsExpanded] = useState(false);

  if (activeAssignments.length === 0) return null;

  const handleToggle = (assignment: HabitAssignment) => {
    const habit = habits.find(h => h.id === assignment.habitId);
    if (!habit) return;

    const existingLog = todayLogs.find(l => l.habitAssignmentId === assignment.id);

    if (habit.type === 'checkbox') {
      const completed = !existingLog?.completed;
      const log: HabitLog = {
        id: existingLog?.id || crypto.randomUUID(),
        clientId,
        habitAssignmentId: assignment.id,
        logDate: today,
        value: completed ? 1 : 0,
        completed,
        createdAt: new Date().toISOString(),
      };
      onLogHabit(log);
      if (completed) {
        setJustCompleted(assignment.id);
        setTimeout(() => setJustCompleted(null), 600);
        showToast(t.habits.habitLogged, 'success');
      }
    }
  };

  const handleNumberInput = (assignment: HabitAssignment, value: string) => {
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return;
    const target = assignment.targetValue ?? 0;
    const log: HabitLog = {
      id: todayLogs.find(l => l.habitAssignmentId === assignment.id)?.id || crypto.randomUUID(),
      clientId,
      habitAssignmentId: assignment.id,
      logDate: today,
      value: numVal,
      completed: numVal >= target,
      createdAt: new Date().toISOString(),
    };
    onLogHabit(log);
  };

  return (
    <GlassCard delay={delay} hover onClick={onNavigateToHabits}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{t.habits.todaysHabits}</span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)',
          color: completedCount === activeAssignments.length ? 'var(--accent-success)' : 'var(--text-secondary)',
        }}>
          {t.habits.completed(completedCount, activeAssignments.length)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
        {/* Regular habits */}
        {regularAssignments.map(assignment => {
          const habit = habits.find(h => h.id === assignment.habitId);
          if (!habit) return null;
          const Icon = iconMap[habit.icon] || Heart;
          const log = todayLogs.find(l => l.habitAssignmentId === assignment.id);
          const isCompleted = log?.completed ?? false;

          return (
            <div key={assignment.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: isCompleted ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.2)' : 'var(--glass-border)'}`,
              transition: 'all 0.2s',
            }}>
              <Icon size={16} style={{ color: isCompleted ? 'var(--accent-success)' : 'var(--accent-primary)', flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: isCompleted ? 'var(--accent-success)' : 'var(--text-primary)',
                  textDecoration: isCompleted && habit.type === 'checkbox' ? 'line-through' : 'none',
                  opacity: isCompleted ? 0.8 : 1,
                }}>
                  {getHabitName(habit)}
                </div>
              </div>

              {habit.type === 'checkbox' ? (
                <motion.button
                  onClick={() => handleToggle(assignment)}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none',
                    background: isCompleted ? 'var(--accent-success)' : 'rgba(255,255,255,0.06)',
                    color: isCompleted ? '#fff' : 'var(--text-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {justCompleted === assignment.id ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }} animate={{ scale: 1.2 }} exit={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      >
                        <Check size={16} />
                      </motion.div>
                    ) : isCompleted ? (
                      <Check size={16} />
                    ) : null}
                  </AnimatePresence>
                </motion.button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    value={log?.value ?? ''}
                    onChange={e => handleNumberInput(assignment, e.target.value)}
                    placeholder={String(assignment.targetValue ?? '')}
                    style={{
                      width: 56, padding: '4px 6px', borderRadius: 6, textAlign: 'center',
                      border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.3)' : 'var(--glass-border)'}`,
                      background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)',
                      fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{habit.unit}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Supplements expandable group */}
        {supplementAssignments.length > 0 && (() => {
          const suppCompleted = supplementAssignments.filter(a => {
            const log = todayLogs.find(l => l.habitAssignmentId === a.id);
            return log?.completed;
          }).length;
          const allSuppDone = suppCompleted === supplementAssignments.length;

          return (
            <div style={{
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${allSuppDone ? 'rgba(34,197,94,0.2)' : 'var(--glass-border)'}`,
              background: allSuppDone ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
              overflow: 'hidden', transition: 'all 0.2s',
            }}>
              {/* Header row */}
              <button
                onClick={() => setSuppsExpanded(!suppsExpanded)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                <Pill size={16} style={{ color: allSuppDone ? 'var(--accent-success)' : 'var(--accent-primary)', flexShrink: 0 }} />
                <span style={{
                  flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500,
                  color: allSuppDone ? 'var(--accent-success)' : 'var(--text-primary)',
                }}>
                  {t.habits.supplements}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)',
                  color: allSuppDone ? 'var(--accent-success)' : 'var(--text-secondary)',
                  marginRight: 4,
                }}>
                  {suppCompleted}/{supplementAssignments.length}
                </span>
                <motion.div animate={{ rotate: suppsExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>
              </button>

              {/* Expanded supplement list */}
              <AnimatePresence>
                {suppsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {supplementAssignments.map(assignment => {
                        const habit = habits.find(h => h.id === assignment.habitId);
                        if (!habit) return null;
                        const log = todayLogs.find(l => l.habitAssignmentId === assignment.id);
                        const isCompleted = log?.completed ?? false;

                        return (
                          <div key={assignment.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                            borderRadius: 6, background: isCompleted ? 'rgba(34,197,94,0.04)' : 'transparent',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, fontWeight: 500,
                                color: isCompleted ? 'var(--accent-success)' : 'var(--text-primary)',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                opacity: isCompleted ? 0.8 : 1,
                              }}>
                                {getHabitName(habit)}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                {(() => { const hk = presetNameKeys[habit.id]; return hk ? (t.habits as unknown as Record<string, string>)[hk + 'Hint'] ?? '' : ''; })()}
                              </div>
                            </div>
                            <motion.button
                              onClick={() => handleToggle(assignment)}
                              whileTap={{ scale: 0.9 }}
                              style={{
                                width: 24, height: 24, borderRadius: 6, border: 'none',
                                background: isCompleted ? 'var(--accent-success)' : 'rgba(255,255,255,0.06)',
                                color: isCompleted ? '#fff' : 'var(--text-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                              }}
                            >
                              {isCompleted && <Check size={14} />}
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}
      </div>

      {completedCount === activeAssignments.length && activeAssignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 10, padding: '6px 12px', borderRadius: 8,
            background: 'rgba(34,197,94,0.1)', textAlign: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--accent-success)',
          }}
        >
          {t.habits.allDone}
        </motion.div>
      )}
    </GlassCard>
  );
}
