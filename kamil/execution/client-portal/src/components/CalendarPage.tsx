import { useRef, useEffect } from 'react';
import { Check, X, Dumbbell } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { WorkoutProgram, WorkoutLog, WeeklySchedule } from '../types';

interface CalendarPageProps {
  program: WorkoutProgram | null;
  workoutLogs: WorkoutLog[];
  weeklySchedule: WeeklySchedule | null;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export default function CalendarPage({ program, workoutLogs, weeklySchedule }: CalendarPageProps) {
  const isMobile = useIsMobile();
  const currentWeekRef = useRef<HTMLDivElement>(null);

  const dayAssignments = weeklySchedule?.dayAssignments ?? {};
  const programWeeks = program?.durationWeeks ?? 0;
  const programStart = program ? new Date(program.createdAt) : new Date();

  // Map each program day ID to a color index
  const dayColorMap: Record<string, number> = {};
  if (program) {
    program.days.forEach((d, i) => { dayColorMap[d.id] = i % WORKOUT_COLORS.length; });
  }

  // Get Monday of the program start week
  const startMonday = new Date(programStart);
  const startDow = startMonday.getDay();
  startMonday.setDate(startMonday.getDate() - (startDow === 0 ? 6 : startDow - 1));
  startMonday.setHours(0, 0, 0, 0);

  // Current week calculation — shift "today" when DEV_DAY_OVERRIDE is set
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

  const weeksElapsed = Math.max(1, Math.ceil((today.getTime() - startMonday.getTime()) / (7 * 86400000)));
  const currentWeekNum = Math.min(weeksElapsed, programWeeks);

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
      let shortLabel = '';
      if (assignedDay) {
        const n = assignedDay.name.toLowerCase();
        if (n.includes('push')) shortLabel = 'Push';
        else if (n.includes('pull')) shortLabel = 'Pull';
        else if (n.includes('upper')) shortLabel = 'Upper';
        else if (n.includes('lower')) shortLabel = 'Lower';
        else if (n.includes('legs')) shortLabel = 'Legs';
        else shortLabel = assignedDay.name.slice(0, 5);
      }

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
        <h1 style={styles.title}>{program.name}</h1>
        <div style={styles.headerRow}>
          <span style={styles.subtitle}>{programWeeks} weeks</span>
          <div style={styles.legend}>
            {program.days.map((d, i) => {
              const c = WORKOUT_COLORS[i % WORKOUT_COLORS.length];
              const n = d.name.toLowerCase();
              let label = d.name.slice(0, 5);
              if (n.includes('push')) label = 'Push';
              else if (n.includes('pull')) label = 'Pull';
              else if (n.includes('upper')) label = 'Upper';
              else if (n.includes('lower')) label = 'Lower';
              else if (n.includes('legs')) label = 'Legs';
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
            })}
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
            } else if (day.isFuture && day.isTraining && c) {
              cellBg = `rgba(${rgb},0.06)`;
              cellBorder = `1px solid rgba(${rgb},0.12)`;
            }

            if (!day.isTraining && !day.completed) {
              cellOpacity = day.isFuture ? 0.2 : 0.35;
            } else if (day.isFuture && !day.isToday) {
              cellOpacity = 0.5;
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
                {day.isToday && !day.completed && !day.missed && day.isTraining && (
                  <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgb(0,229,200)', textTransform: 'uppercase' as const, letterSpacing: '0.3px', lineHeight: 1 }}>{day.shortLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
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
    opacity: 0.5,
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
