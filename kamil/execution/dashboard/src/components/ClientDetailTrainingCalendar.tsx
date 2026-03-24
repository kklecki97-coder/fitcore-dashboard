import { useState } from 'react';
import { Dumbbell, Clock } from 'lucide-react';
import GlassCard from './GlassCard';
import { getLocale } from '../lib/locale';
import { useLang } from '../i18n';
import type { Client, WorkoutProgram, WorkoutLog, WorkoutSetLog } from '../types';

interface ClientDetailTrainingCalendarProps {
  client: Client;
  workoutLogs: WorkoutLog[];
  setLogs: WorkoutSetLog[];
  programs: WorkoutProgram[];
  clientSchedule: Record<string, string>;
  isMobile: boolean;
}

export default function ClientDetailTrainingCalendar({
  client,
  workoutLogs,
  setLogs,
  programs,
  clientSchedule,
  isMobile,
}: ClientDetailTrainingCalendarProps) {
  const { lang, t } = useLang();
  const dateLocale = getLocale(lang);
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  const clientLogs = workoutLogs
    .filter(w => w.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const completedSessions = clientLogs.filter(w => w.completed).length;
  const avgDuration = completedSessions > 0 ? Math.round(clientLogs.filter(w => w.completed).reduce((s, w) => s + w.duration, 0) / completedSessions) : 0;

  // Build month calendar data
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calYear = today.getFullYear();
  const calMonth = today.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  let plannedThisMonth = 0;
  let completedThisMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(calYear, calMonth, d);
    const dow = (cellDate.getDay() + 6) % 7;
    if (clientSchedule[String(dow)]) plannedThisMonth++;
    const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (clientLogs.some(w => w.date === dateKey && w.completed)) completedThisMonth++;
  }
  const completionRate = plannedThisMonth > 0 ? Math.round((completedThisMonth / plannedThisMonth) * 100) : 0;
  const ringR = 18;
  const ringC = 2 * Math.PI * ringR;
  const ringOff = ringC - (completionRate / 100) * ringC;

  const logsByDate: Record<string, WorkoutLog[]> = {};
  clientLogs.forEach(w => {
    if (!logsByDate[w.date]) logsByDate[w.date] = [];
    logsByDate[w.date].push(w);
  });

  // Current month grid
  const firstDay = new Date(calYear, calMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const monthName = firstDay.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });

  // Build 6-row x 7-col grid (pad with nulls)
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length < 42) calendarCells.push(null);

  const dayHeaders = t.clientDetail.calDays;

  return (
    <div>
      {/* Month Calendar */}
      <GlassCard delay={0.28} style={isMobile ? { padding: '14px 16px' } : undefined}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '10px' : '14px' }}>
          <div>
            <h3 style={{ ...styles.chartTitle, ...(isMobile ? { fontSize: '15px' } : {}) }}>{t.clientDetail.trainingActivity}</h3>
            <p style={{ ...styles.trainingSubtitle, ...(isMobile ? { fontSize: '12px' } : {}) }}>{monthName}</p>
          </div>
        </div>

        {/* Stats row - 3 mini cards */}
        <div style={{ ...styles.calStatsRow, ...(isMobile ? { gap: '6px', marginBottom: '10px' } : {}) }}>
          <div style={{ ...styles.calStatCard, ...(isMobile ? { padding: '8px 4px', gap: '3px' } : {}) }}>
            <Dumbbell size={isMobile ? 14 : 16} color="var(--accent-primary)" />
            <span style={{ ...styles.calStatValue, ...(isMobile ? { fontSize: '16px' } : {}) }}>{completedThisMonth}/{plannedThisMonth}</span>
            <span style={{ ...styles.calStatLabel, ...(isMobile ? { fontSize: '9px' } : {}) }}>{t.clientDetail.sessions}</span>
          </div>
          <div style={{ ...styles.calStatCard, ...(isMobile ? { padding: '8px 4px', gap: '3px' } : {}) }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ marginTop: '-2px', marginBottom: '-2px' }}>
              <circle cx="22" cy="22" r={ringR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle
                cx="22" cy="22" r={ringR}
                fill="none"
                stroke={completionRate >= 80 ? '#20dba4' : completionRate >= 50 ? 'var(--accent-warm)' : '#e8637a'}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={ringC}
                strokeDashoffset={ringOff}
                transform="rotate(-90 22 22)"
              />
              <text x="22" y="23" textAnchor="middle" dominantBaseline="middle"
                fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                {completionRate}
              </text>
            </svg>
            <span style={{ ...styles.calStatLabel, ...(isMobile ? { fontSize: '9px' } : {}) }}>{t.clientDetail.completionPct}</span>
          </div>
          <div style={{ ...styles.calStatCard, ...(isMobile ? { padding: '8px 4px', gap: '3px' } : {}) }}>
            <Clock size={isMobile ? 14 : 16} color="var(--accent-warm)" />
            <span style={{ ...styles.calStatValue, ...(isMobile ? { fontSize: '16px' } : {}) }}>{avgDuration}</span>
            <span style={{ ...styles.calStatLabel, ...(isMobile ? { fontSize: '9px' } : {}) }}>{t.clientDetail.avgMin}</span>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div style={{ ...styles.calGrid, ...(isMobile ? { gap: '2px' } : {}) }}>
          {dayHeaders.map(d => (
            <div key={d} style={styles.calDayHeader}>{d}</div>
          ))}

          {/* Calendar cells */}
          {calendarCells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} style={styles.calCellEmpty} />;

            const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entries = logsByDate[dateKey];
            const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
            const isFuture = new Date(calYear, calMonth, day) > today;
            const cellDate = new Date(calYear, calMonth, day);
            const dow = (cellDate.getDay() + 6) % 7;
            const plannedDayId = clientSchedule[String(dow)];
            const isPlanned = !!plannedDayId;
            const clientProgram = programs.find(p => p.clientIds.includes(client.id));
            const plannedDayName = isPlanned && clientProgram
              ? clientProgram.days.find(d => d.id === plannedDayId)?.name ?? ''
              : '';

            const allCompleted = entries?.every(e => e.completed);
            const hasMissed = entries && !allCompleted;
            const shortType = entries?.[0]?.type
              .replace('Upper Body ', 'Upper ')
              .replace('Lower Body ', 'Lower ') ?? '';

            return (
              <div
                key={dateKey}
                title={entries ? entries.map(e => `${e.type} (${e.duration}min)`).join(', ') : dateKey}
                onClick={() => (entries || (isPlanned && !isFuture)) ? setSelectedCalDay(selectedCalDay === dateKey ? null : dateKey) : null}
                style={{
                  ...styles.calCell,
                  ...(isMobile ? { minHeight: '36px', padding: '0 1px 3px' } : {}),
                  ...((entries || (isPlanned && !isFuture)) ? { cursor: 'pointer' } : {}),
                  ...(selectedCalDay === dateKey ? { boxShadow: '0 0 0 2px var(--accent-primary)', border: '1px solid var(--accent-primary)' } : {}),
                  ...(entries && allCompleted ? {
                    background: isToday ? 'rgba(32,219,164,0.18)' : 'rgba(32,219,164,0.12)',
                    border: `1px solid ${isToday ? 'rgba(32,219,164,0.5)' : 'rgba(32,219,164,0.35)'}`,
                    boxShadow: isToday ? '0 0 8px rgba(32,219,164,0.15)' : 'none',
                  } : entries && !isFuture && hasMissed ? {
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                  } : isPlanned && !isFuture && !entries ? {
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                  } : isToday ? {
                    background: isPlanned ? 'rgba(59,130,246,0.1)' : 'rgba(0,229,200,0.08)',
                    border: `1px solid ${isPlanned ? 'rgba(59,130,246,0.3)' : 'rgba(0,229,200,0.25)'}`,
                    boxShadow: '0 0 8px rgba(0,229,200,0.1)',
                  } : isPlanned && isFuture ? {
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.25)',
                  } : isFuture ? {
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.02)',
                    opacity: 0.4,
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid transparent',
                  }),
                }}
              >
                {/* Status bar */}
                <div style={{
                  ...styles.calStatusBar,
                  background: entries && !isFuture && allCompleted ? '#20dba4'
                    : entries && !isFuture && hasMissed ? '#e8637a'
                    : isPlanned && !isFuture && !entries ? '#e8637a'
                    : isToday ? 'var(--accent-primary)'
                    : isPlanned && isFuture ? 'var(--accent-info)'
                    : 'transparent',
                }} />
                <span style={{
                  ...styles.calDayNum,
                  color: isToday ? 'var(--accent-primary)'
                    : entries && !isFuture && allCompleted ? '#20dba4'
                    : entries && !isFuture && hasMissed ? '#e8637a'
                    : 'var(--text-secondary)',
                  fontWeight: 700,
                }}>
                  {day}
                </span>
                {entries && !isFuture ? (
                  <span style={{
                    ...styles.calSessionType,
                    color: allCompleted ? '#20dba4' : '#e8637a',
                  }}>
                    {shortType}
                  </span>
                ) : isPlanned && plannedDayName ? (
                  <span style={{
                    ...styles.calSessionType,
                    color: isFuture ? 'var(--accent-info)' : '#e8637a',
                    fontSize: isMobile ? '6px' : '8px',
                  }}>
                    {plannedDayName.toUpperCase()}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ ...styles.calLegend, ...(isMobile ? { gap: '10px', marginTop: '8px' } : {}) }}>
          <div style={styles.calLegendItem}>
            <div style={{ ...styles.calLegendDot, background: '#20dba4' }} />
            <span>{t.clientDetail.completedLegend}</span>
          </div>
          <div style={styles.calLegendItem}>
            <div style={{ ...styles.calLegendDot, background: '#e8637a' }} />
            <span>{t.clientDetail.missedLegend}</span>
          </div>
          <div style={styles.calLegendItem}>
            <div style={{ ...styles.calLegendDot, background: 'var(--accent-info)' }} />
            <span>{t.clientDetail.plannedLegend}</span>
          </div>
          <div style={styles.calLegendItem}>
            <div style={{ ...styles.calLegendDot, background: 'var(--accent-primary)' }} />
            <span>{t.clientDetail.todayLegend}</span>
          </div>
        </div>

        {/* Selected day detail panel */}
        {selectedCalDay && (() => {
          const dayEntries = logsByDate[selectedCalDay];
          const dayDate = new Date(selectedCalDay);
          const dayLabel = dayDate.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
          const workoutType = dayEntries?.[0]?.type ?? '';

          const clientProg = programs.find(p => p.clientIds.includes(client.id));
          const programDay = clientProg?.days.find(d => d.name === workoutType);
          const programExerciseNames = programDay ? programDay.exercises.map(e => e.name) : [];

          const daySetLogs = setLogs
            .filter(l => l.clientId === client.id && l.date === selectedCalDay && l.completed)
            .filter(l => programExerciseNames.length === 0 || programExerciseNames.includes(l.exerciseName))
            .sort((a, b) => {
              const aIdx = programExerciseNames.indexOf(a.exerciseName);
              const bIdx = programExerciseNames.indexOf(b.exerciseName);
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx || a.setNumber - b.setNumber;
              return a.exerciseName.localeCompare(b.exerciseName) || a.setNumber - b.setNumber;
            });

          const exerciseGroups: [string, typeof daySetLogs][] = [];
          const seen = new Set<string>();
          for (const log of daySetLogs) {
            if (!seen.has(log.exerciseName)) {
              seen.add(log.exerciseName);
              exerciseGroups.push([log.exerciseName, daySetLogs.filter(l => l.exerciseName === log.exerciseName)]);
            }
          }

          const cleanGroups = exerciseGroups.filter(([name]) => name.length < 60);

          return (
            <div style={{
              marginTop: '12px', borderRadius: '12px',
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(0,229,200,0.04)',
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{dayLabel}</div>
                  {workoutType && (
                    <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '2px' }}>{workoutType}</div>
                  )}
                </div>
                <button onClick={() => setSelectedCalDay(null)} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px',
                  width: '28px', height: '28px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>

              {/* Exercise list */}
              {cleanGroups.length > 0 ? (
                <div style={{ padding: '8px 0' }}>
                  {cleanGroups.map(([name, sets], idx) => {
                    const hasSomeWeight = sets.some(s => s.weight && s.weight !== '0' && s.weight !== '-');
                    return (
                      <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 16px',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0,
                        }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {hasSomeWeight
                              ? sets.map(s => `${s.weight}kg ×${s.reps}`).join('  /  ')
                              : `${sets.length} sets × ${sets[0]?.reps ?? '-'} reps`
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '20px 16px', fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  {dayEntries ? t.clientDetail.noSetDetails : t.clientDetail.plannedWorkout}
                </div>
              )}
            </div>
          );
        })()}
      </GlassCard>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  chartTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  trainingSubtitle: {
    fontSize: '17px',
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
  calStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  calStatCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px 6px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
  },
  calStatValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  calStatLabel: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  calDayHeader: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const,
    padding: '2px 0 6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  calCellEmpty: {
    minHeight: '52px',
    borderRadius: '8px',
  },
  calCell: {
    minHeight: '52px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    cursor: 'default',
    transition: 'all 0.15s ease',
    border: '1px solid transparent',
    overflow: 'hidden',
    padding: '0 2px 5px',
  },
  calStatusBar: {
    width: '100%',
    height: '2.5px',
    borderRadius: '0 0 1px 1px',
    marginBottom: '4px',
    flexShrink: 0,
  },
  calDayNum: {
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  calSessionType: {
    fontSize: '9px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2px',
    lineHeight: 1.2,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginTop: '3px',
  },
  calLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
    justifyContent: 'center',
  },
  calLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  calLegendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '2px',
    flexShrink: 0,
  },
};
