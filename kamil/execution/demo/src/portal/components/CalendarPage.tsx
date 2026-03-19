import { useRef, useEffect, useState } from 'react';
import { Check, X, Dumbbell, CalendarCog } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { WorkoutProgram, WorkoutLog, WeeklySchedule } from '../types';

interface CalendarPageProps {
  program: WorkoutProgram | null;
  workoutLogs: WorkoutLog[];
  weeklySchedule: WeeklySchedule | null;
  onUpdateSchedule?: (assignments: Record<string, string>) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Extract a short label from a workout day name like "Monday - Boxing + Jiu-Jitsu" → "BJJ + Box"
const extractLabel = (name: string): string => {
  // Strip leading day-of-week prefix (e.g. "Monday - ", "Wed - ")
  const stripped = name.replace(/^(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?)\s*[\-–\-:]\s*/i, '');
  const s = stripped.toLowerCase();

  // Keyword matching for common workout types
  if (s.includes('push')) return 'Push';
  if (s.includes('pull')) return 'Pull';
  if (s.includes('upper')) return 'Upper';
  if (s.includes('lower')) return 'Lower';
  if (s.includes('legs') || s.includes('leg day')) return 'Legs';

  // Martial arts / combat
  const hasBjj = s.includes('jiu') || s.includes('bjj') || s.includes('grappling');
  const hasBoxing = s.includes('box');
  const hasMma = s.includes('mma');
  if (hasBjj && hasBoxing) return 'BJJ + Box';
  if (hasBjj && hasMma) return 'BJJ + MMA';
  if (hasBjj) return 'BJJ';
  if (hasBoxing) return 'Boxing';
  if (hasMma) return 'MMA';

  // Strength / gym
  if (s.includes('strength') || s.includes('full body') || s.includes('gym')) return 'Gym';
  if (s.includes('cardio')) return 'Cardio';
  if (s.includes('hiit')) return 'HIIT';
  if (s.includes('yoga') || s.includes('stretch')) return 'Yoga';

  // Fallback: use the stripped name (without day prefix), truncated
  return stripped.length > 8 ? stripped.slice(0, 8) : stripped;
};

// Color palette for workout types (up to 6 distinct workouts)
const WORKOUT_COLORS = [
  { r: 59, g: 130, b: 246 },   // blue
  { r: 249, g: 115, b: 22 },   // orange
  { r: 168, g: 85, b: 247 },   // purple
  { r: 234, g: 179, b: 8 },    // yellow
  { r: 236, g: 72, b: 153 },   // pink
  { r: 20, g: 184, b: 166 },   // teal
];

// Local date string (avoids timezone shift from toISOString)
const localDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// DEV ONLY: set to monday-based day index (0=Mon..6=Sun) to pretend today is that day, or null for real date
const DEV_DAY_OVERRIDE: number | null = null; // set to 0-6 (Mon-Sun) for demo, null for real date

export default function CalendarPage({ program, workoutLogs, weeklySchedule, onUpdateSchedule }: CalendarPageProps) {
  const isMobile = useIsMobile();
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editAssignments, setEditAssignments] = useState<Record<string, string>>({});

  const dayAssignments = weeklySchedule?.dayAssignments ?? {};
  const programWeeks = program?.durationWeeks ?? 0;
  const programStart = program ? new Date(program.createdAt) : new Date();

  // Map each program day ID to a color index - days with the same label share the same color
  const dayColorMap: Record<string, number> = {};
  if (program) {
    const labelToColor: Record<string, number> = {};
    let nextColor = 0;
    program.days.forEach((d) => {
      const label = extractLabel(d.name);
      if (!(label in labelToColor)) {
        labelToColor[label] = nextColor % WORKOUT_COLORS.length;
        nextColor++;
      }
      dayColorMap[d.id] = labelToColor[label];
    });
  }

  // Get Monday of the program start week
  const startMonday = new Date(programStart);
  const startDow = startMonday.getDay();
  startMonday.setDate(startMonday.getDate() - (startDow === 0 ? 6 : startDow - 1));
  startMonday.setHours(0, 0, 0, 0);

  // Current week calculation - shift "today" when DEV_DAY_OVERRIDE is set
  const realToday = new Date();
  const today = (() => {
    if (DEV_DAY_OVERRIDE === null) return realToday;
    const realMondayBased = realToday.getDay() === 0 ? 6 : realToday.getDay() - 1;
    const shift = DEV_DAY_OVERRIDE - realMondayBased;
    const d = new Date(realToday);
    d.setDate(d.getDate() + shift);
    return d;
  })();
  const todayStr = localDateStr(today);
  const todayMonday = new Date(today);
  const todayDow = todayMonday.getDay();
  todayMonday.setDate(todayMonday.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  todayMonday.setHours(0, 0, 0, 0);

  const msFromStart = today.getTime() - startMonday.getTime();
  const weeksElapsed = msFromStart > 0 ? Math.ceil(msFromStart / (7 * 86400000)) : 0;
  const currentWeekNum = Math.min(Math.max(weeksElapsed, 0), programWeeks);

  // Build all weeks
  const weeks = Array.from({ length: programWeeks }, (_, i) => {
    const weekNum = i + 1;
    const weekMonday = new Date(startMonday);
    weekMonday.setDate(startMonday.getDate() + i * 7);
    const isCurrent = weekNum === currentWeekNum;
    const isFuture = weekNum > currentWeekNum;

    const days = Array.from({ length: 7 }, (_, j) => {
      const d = new Date(weekMonday);
      d.setDate(weekMonday.getDate() + j);
      const dateStr = localDateStr(d);
      const isToday = dateStr === todayStr;
      const isPast = d < today && !isToday;
      const assignedId = dayAssignments[String(j)];
      const assignedDay = assignedId && program ? program.days.find(dd => dd.id === assignedId) : null;
      const log = workoutLogs.find(w => w.date === dateStr);
      const completed = !!log?.completed;
      const missed = isPast && !!assignedDay && !log;

      // Short label
      const shortLabel = assignedDay ? extractLabel(assignedDay.name) : '';

      const colorIdx = assignedId ? (dayColorMap[assignedId] ?? -1) : -1;

      return { dateStr, date: d.getDate(), isToday, isPast, isTraining: !!assignedDay, completed, missed, shortLabel, isFuture, colorIdx };
    });

    // Week stats
    const planned = days.filter(d => d.isTraining).length;
    const done = days.filter(d => d.completed).length;

    return { weekNum, days, isCurrent, isFuture, planned, done };
  });

  // Auto-scroll to current week
  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  if (!program) {
    return (
      <div style={{ ...styles.page, padding: isMobile ? '20px 16px' : '24px' }}>
        <GlassCard>
          <div style={styles.empty}>
            <Dumbbell size={32} color="var(--text-tertiary)" />
            <p style={styles.emptyText}>No program assigned yet</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? '20px 16px' : '24px' }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={styles.title}>{program.name}</h1>
          {onUpdateSchedule && (
            <motion.button
              onClick={() => {
                setEditAssignments({ ...dayAssignments });
                setShowEditor(true);
              }}
              style={schedStyles.editBtn}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <CalendarCog size={15} />
              <span>Edit</span>
            </motion.button>
          )}
        </div>
        <div style={styles.headerRow}>
          <span style={styles.subtitle}>{programWeeks} weeks</span>
          <div style={styles.legend}>
            {(() => {
              const seen = new Set<string>();
              return program.days.map((d) => {
                const label = extractLabel(d.name);
                if (seen.has(label)) return null;
                seen.add(label);
                const c = WORKOUT_COLORS[dayColorMap[d.id] ?? 0];
                return (
                  <div key={d.id} style={styles.legendItem}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: `rgb(${c.r},${c.g},${c.b})`,
                    }} />
                    <span style={styles.legendText}>{label}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Day labels row */}
      <div style={styles.dayLabelsRow}>
        <div style={styles.weekLabel} />
        {DAY_LABELS.map(d => (
          <div key={d} style={styles.dayLabel}>{d}</div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map(week => (
        <div
          key={week.weekNum}
          ref={week.isCurrent ? currentWeekRef : undefined}
          style={{
            ...styles.weekRow,
            ...(week.isCurrent ? styles.weekRowCurrent : {}),
            ...(week.isFuture ? styles.weekRowFuture : {}),
          }}
        >
          {/* Week number + stats */}
          <div style={styles.weekInfo}>
            <span style={{
              ...styles.weekNum,
              color: week.isCurrent ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}>
              W{week.weekNum}
            </span>
            {!week.isFuture && (
              <span style={{
                ...styles.weekStats,
                color: week.done >= week.planned && week.planned > 0 ? 'var(--accent-success)' : 'var(--text-tertiary)',
              }}>
                {week.done}/{week.planned}
              </span>
            )}
          </div>

          {/* 7 day cells */}
          {week.days.map(day => {
            const c = day.colorIdx >= 0 ? WORKOUT_COLORS[day.colorIdx] : null;
            const rgb = c ? `${c.r},${c.g},${c.b}` : '';

            let cellBg = 'rgba(255,255,255,0.03)';
            let cellBorder = 'none';
            let cellOpacity = 1;

            if (day.isToday) {
              cellBg = 'rgba(0,229,200,0.15)';
              cellBorder = '2px solid rgba(0,229,200,0.5)';
            } else if (day.completed && c) {
              cellBg = `rgba(${rgb},0.18)`;
              cellBorder = `1px solid rgba(${rgb},0.3)`;
            } else if (day.missed && c) {
              cellBg = `rgba(${rgb},0.08)`;
              cellBorder = `1px solid rgba(${rgb},0.15)`;
              cellOpacity = 0.45;
            } else if (day.isTraining && c) {
              // Upcoming training day - subtle tint, no text
              cellBg = `rgba(${rgb},0.08)`;
              cellBorder = `1px solid rgba(${rgb},0.15)`;
            }

            if (!day.isTraining && !day.completed) {
              cellOpacity = day.isFuture ? 0.25 : 0.4;
            }

            return (
              <div
                key={day.dateStr}
                style={{
                  ...styles.dayCell,
                  background: cellBg,
                  border: cellBorder,
                  opacity: cellOpacity,
                  ...(day.isToday ? { boxShadow: '0 0 12px rgba(0,229,200,0.25)' } : {}),
                }}
              >
                <span style={{
                  ...styles.dayDate,
                  color: day.isToday ? 'rgb(0,229,200)' :
                         day.completed && c ? `rgb(${rgb})` :
                         'var(--text-secondary)',
                }}>
                  {day.date}
                </span>
                {day.completed && <Check size={12} color={c ? `rgb(${rgb})` : 'var(--accent-success)'} strokeWidth={3} />}
                {day.missed && <X size={10} color={c ? `rgba(${rgb},0.7)` : 'rgba(239,68,68,0.6)'} strokeWidth={2.5} />}
              </div>
            );
          })}
        </div>
      ))}

      {/* Schedule Editor Modal */}
      <AnimatePresence>
        {showEditor && program && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={schedStyles.overlay}
            onClick={() => setShowEditor(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={schedStyles.modal}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div style={schedStyles.modalHeader}>
                <h2 style={schedStyles.modalTitle}>Edit Schedule</h2>
                <button onClick={() => setShowEditor(false)} style={schedStyles.closeBtn}>
                  <X size={18} />
                </button>
              </div>

              <p style={schedStyles.modalDesc}>Choose which workout to do on each day. Set to Rest if you don&#39;t train that day.</p>

              <div style={schedStyles.dayList}>
                {DAY_LABELS.map((label, i) => {
                  const key = String(i);
                  const assignedId = editAssignments[key] || '';
                  const assignedDay = assignedId ? program.days.find(d => d.id === assignedId) : null;
                  const colorIdx = assignedId ? (dayColorMap[assignedId] ?? -1) : -1;
                  const c = colorIdx >= 0 ? WORKOUT_COLORS[colorIdx] : null;

                  return (
                    <div key={key} style={schedStyles.dayRow}>
                      <div style={{
                        ...schedStyles.dayName,
                        color: assignedDay ? `rgb(${c?.r ?? 200},${c?.g ?? 200},${c?.b ?? 200})` : 'var(--text-tertiary)',
                      }}>
                        {label}
                      </div>
                      <select
                        value={assignedId}
                        onChange={(e) => {
                          setEditAssignments(prev => {
                            const next = { ...prev };
                            if (e.target.value) {
                              next[key] = e.target.value;
                            } else {
                              delete next[key];
                            }
                            return next;
                          });
                        }}
                        style={{
                          ...schedStyles.select,
                          borderColor: c ? `rgba(${c.r},${c.g},${c.b},0.4)` : 'var(--glass-border)',
                          color: assignedDay ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        }}
                      >
                        <option value="">Rest Day</option>
                        {program.days.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div style={schedStyles.modalFooter}>
                <button onClick={() => setShowEditor(false)} style={schedStyles.cancelBtn}>
                  Cancel
                </button>
                <motion.button
                  onClick={() => {
                    onUpdateSchedule?.(editAssignments);
                    setShowEditor(false);
                  }}
                  style={schedStyles.saveBtn}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Check size={14} /> Save Schedule
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
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minHeight: '100%',
    paddingBottom: '100px',
  },
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '2px',
  },
  legend: {
    display: 'flex',
    gap: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendText: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.2px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    margin: 0,
  },

  // Day labels header
  dayLabelsRow: {
    display: 'grid',
    gridTemplateColumns: '44px repeat(7, 1fr)',
    gap: '3px',
    marginBottom: '2px',
  },
  dayLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  // Week row
  weekRow: {
    display: 'grid',
    gridTemplateColumns: '44px repeat(7, 1fr)',
    gap: '3px',
    padding: '4px 0',
    borderRadius: '10px',
    transition: 'all 0.2s',
  },
  weekRowCurrent: {
    background: 'rgba(0,229,200,0.05)',
    padding: '6px 4px',
    border: '1px solid rgba(0,229,200,0.15)',
    boxShadow: '0 0 12px rgba(0,229,200,0.08)',
  },
  weekRowFuture: {
    // no row-level opacity - handled per cell so training days stay visible
  },
  weekInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
  },
  weekNum: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  weekLabel: {
    width: '44px',
  },
  weekStats: {
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },

  // Day cell
  dayCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    padding: '6px 2px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    minHeight: '44px',
  },
  dayDate: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  dayWorkoutLabel: {
    fontSize: '8px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    lineHeight: 1,
  },
};

const schedStyles: Record<string, React.CSSProperties> = {
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(0,229,200,0.25)',
    background: 'rgba(0,229,200,0.08)',
    color: 'var(--accent-primary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    width: '100%',
    maxWidth: '420px',
    maxHeight: '85vh',
    borderRadius: '20px 20px 16px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalDesc: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    margin: 0,
    lineHeight: 1.5,
  },
  dayList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dayName: {
    width: '42px',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  select: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  },
  modalFooter: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    color: 'var(--text-on-accent)',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
};
