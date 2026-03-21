import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Droplets, Moon, Pill, Footprints, Brain,
  StretchHorizontal, Beef, Flame,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { useLang } from '../i18n';
import useIsMobile from '../hooks/useIsMobile';
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

interface ClientHabitsPageProps {
  habits: Habit[];
  habitAssignments: HabitAssignment[];
  habitLogs: HabitLog[];
  onLogHabit: (log: HabitLog) => void;
  clientId: string;
}

function getStreak(assignmentId: string, logs: HabitLog[]): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const log = logs.find(l => l.habitAssignmentId === assignmentId && l.logDate === dateStr);
    if (log?.completed) streak++;
    else break;
  }
  return streak;
}

function getAdherencePct(assignmentId: string, logs: HabitLog[], days: number): number {
  const today = new Date();
  let total = 0;
  let completed = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    total++;
    const log = logs.find(l => l.habitAssignmentId === assignmentId && l.logDate === dateStr);
    if (log?.completed) completed++;
  }
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export default function ClientHabitsPage({
  habits, habitAssignments, habitLogs, clientId,
}: ClientHabitsPageProps) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const getHabitName = (habit: Habit) => {
    const key = presetNameKeys[habit.id];
    return key ? t.habits[key] : habit.name;
  };

  const activeAssignments = useMemo(() =>
    habitAssignments.filter(a => a.clientId === clientId && a.isActive),
  [habitAssignments, clientId]);

  // Generate heatmap data (last 12 weeks / 84 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const days: { date: string; ratio: number; dayOfWeek: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      let total = 0;
      let completed = 0;
      for (const a of activeAssignments) {
        total++;
        const log = habitLogs.find(l => l.habitAssignmentId === a.id && l.logDate === dateStr);
        if (log?.completed) completed++;
      }
      days.push({
        date: dateStr,
        ratio: total > 0 ? completed / total : 0,
        dayOfWeek: d.getDay(),
      });
    }
    return days;
  }, [activeAssignments, habitLogs]);

  // Overall adherence
  const overall7 = useMemo(() => {
    if (activeAssignments.length === 0) return 0;
    let total = 0;
    let completed = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      for (const a of activeAssignments) {
        total++;
        const log = habitLogs.find(l => l.habitAssignmentId === a.id && l.logDate === dateStr);
        if (log?.completed) completed++;
      }
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [activeAssignments, habitLogs]);

  if (activeAssignments.length === 0) {
    return (
      <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: 700 }}>
        <GlassCard>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
            <Heart size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 15 }}>{t.habits.noHabits}</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: 700 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20 }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={24} style={{ color: 'var(--accent-primary)' }} />
          {t.habits.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 14 }}>{t.habits.subtitle}</p>
      </motion.div>

      {/* Overall adherence */}
      <GlassCard delay={0.04}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t.habits.last7Days}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: overall7 >= 80 ? 'var(--accent-success)' : overall7 >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)',
            }}>
              {overall7}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${overall7}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 3,
              background: overall7 >= 80 ? 'var(--accent-success)' : overall7 >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)',
            }}
          />
        </div>
      </GlassCard>

      {/* Heatmap */}
      <GlassCard delay={0.08}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {t.habits.habitHistory}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(12, 1fr)`,
          gridTemplateRows: 'repeat(7, 1fr)',
          gap: 3,
          gridAutoFlow: 'column',
        }}>
          {heatmapData.map((day, i) => (
            <div
              key={i}
              title={`${day.date}: ${Math.round(day.ratio * 100)}%`}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 3,
                background: day.ratio === 0
                  ? 'rgba(255,255,255,0.04)'
                  : day.ratio < 0.5
                    ? 'rgba(0,229,200,0.15)'
                    : day.ratio < 1
                      ? 'rgba(0,229,200,0.35)'
                      : 'rgba(0,229,200,0.6)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Less</span>
          {[0.04, 0.15, 0.35, 0.6].map((opacity, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 2,
              background: i === 0 ? 'rgba(255,255,255,0.04)' : `rgba(0,229,200,${opacity})`,
            }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>More</span>
        </div>
      </GlassCard>

      {/* Per-habit details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
        {activeAssignments.map((assignment, i) => {
          const habit = habits.find(h => h.id === assignment.habitId);
          if (!habit) return null;
          const Icon = iconMap[habit.icon] || Heart;
          const streak = getStreak(assignment.id, habitLogs);
          const adherence7 = getAdherencePct(assignment.id, habitLogs, 7);

          // Last 7 days dots
          const today = new Date();
          const dots = Array.from({ length: 7 }, (_, di) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - di));
            const dateStr = d.toISOString().split('T')[0];
            const log = habitLogs.find(l => l.habitAssignmentId === assignment.id && l.logDate === dateStr);
            return log?.completed ? 'completed' : log ? 'missed' : 'none';
          });

          return (
            <GlassCard key={assignment.id} delay={0.12 + i * 0.04}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(0,229,200,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} style={{ color: 'var(--accent-primary)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{getHabitName(habit)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {assignment.targetValue != null && `${t.habits.adherence}: `}
                    <span style={{
                      fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: adherence7 >= 80 ? 'var(--accent-success)' : adherence7 >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                    }}>
                      {adherence7}%
                    </span>
                    <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
                    {t.habits.last7Days}
                  </div>
                </div>

                {/* Streak */}
                {streak > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 12,
                    background: streak >= 7 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                  }}>
                    <Flame size={14} style={{ color: 'var(--accent-warm)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-warm)' }}>
                      {streak}
                    </span>
                  </div>
                )}
              </div>

              {/* 7-day dots row */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'space-between' }}>
                {dots.map((status, di) => {
                  const d = new Date(today);
                  d.setDate(d.getDate() - (6 - di));
                  const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                  return (
                    <div key={di} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{dayLabel}</span>
                      <div style={{
                        width: '100%', height: 6, borderRadius: 3,
                        background: status === 'completed' ? 'var(--accent-success)'
                          : status === 'missed' ? 'var(--accent-danger)'
                          : 'rgba(255,255,255,0.06)',
                      }} />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
