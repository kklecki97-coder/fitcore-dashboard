import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Send, ClipboardCheck, ArrowRight, Check, X, MessageSquare, ChevronDown, Zap, CheckCircle2 } from 'lucide-react';
import GlassCard from './GlassCard';
import AnimatedNumber from './AnimatedNumber';
import StreakFlame from './StreakFlame';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { Client, WorkoutProgram, WorkoutLog, CheckIn, Message, ClientPage, WeeklySchedule } from '../types';
import { extractLabel } from '../utils/workout-labels';

// Same color palette as CalendarPage
const WORKOUT_COLORS = [
  { r: 59, g: 130, b: 246 },   // blue
  { r: 249, g: 115, b: 22 },   // orange
  { r: 168, g: 85, b: 247 },   // purple
  { r: 234, g: 179, b: 8 },    // yellow
  { r: 236, g: 72, b: 153 },   // pink
  { r: 20, g: 184, b: 166 },   // teal
];

interface HomePageProps {
  client: Client;
  program: WorkoutProgram | null;
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  messages: Message[];
  coachName: string;
  onNavigate: (page: ClientPage) => void;
  onFeedbackClick?: (checkInId: string) => void;
  weeklySchedule: WeeklySchedule | null;
  onUpdateSchedule: (assignments: Record<string, string>) => void;
}

// onUpdateSchedule is scaffolded for weekly schedule feature
export default function HomePage({ client, program, workoutLogs, checkIns, messages, coachName, onNavigate, onFeedbackClick, weeklySchedule, onUpdateSchedule: _onUpdateSchedule }: HomePageProps) {
  void _onUpdateSchedule; // scaffolded for inline schedule editing on home page
  const isMobile = useIsMobile();
  const { t, lang } = useLang();

  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [dismissedFeedbackIds, setDismissedFeedbackIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fitcore-dismissed-feedback') || '[]'); } catch { return []; }
  });

  // Find check-ins with new coach feedback that haven't been dismissed
  const newFeedback = checkIns.filter(ci => ci.coachFeedback && ci.reviewStatus === 'reviewed' && !dismissedFeedbackIds.includes(ci.id));
  const latestFeedback = newFeedback.length > 0 ? newFeedback.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

  const handleDismissFeedback = () => {
    if (!latestFeedback) return;
    const updated = [...dismissedFeedbackIds, latestFeedback.id];
    setDismissedFeedbackIds(updated);
    localStorage.setItem('fitcore-dismissed-feedback', JSON.stringify(updated));
    if (onFeedbackClick) {
      onFeedbackClick(latestFeedback.id);
    } else {
      onNavigate('check-in' as ClientPage);
    }
  };

  // Sync dismissed list on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fitcore-dismissed-feedback') || '[]');
      if (stored.length !== dismissedFeedbackIds.length) setDismissedFeedbackIds(stored);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Workout color map - same workout types share a color ──
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

  // ── Today's workout day (schedule-aware) ──
  const dayAssignments = weeklySchedule?.dayAssignments ?? {};
  const todayMondayBased = (() => {
    const dow = new Date().getDay();
    return dow === 0 ? 6 : dow - 1;
  })();
  const todayAssignedId = dayAssignments[String(todayMondayBased)];
  const todayWorkout = todayAssignedId && program
    ? program.days.find(d => d.id === todayAssignedId) ?? null
    : null;

  // ── Weight trend ──
  const weights = client.metrics.weight;
  const weightChange = weights.length >= 2 ? weights[weights.length - 1] - weights[weights.length - 2] : 0;

  // ── Quick action badges ──
  const daysUntilCheckIn = (() => {
    const next = checkIns.find(ci => ci.status === 'scheduled');
    if (!next) return null;
    return Math.ceil((new Date(next.date).getTime() - new Date().getTime()) / 86400000);
  })();
  const checkInDueNow = daysUntilCheckIn !== null && daysUntilCheckIn <= 1;

  // ── Weekly training calendar (Mon-Sun) ──
  const localDateStr = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const todayCompleted = todayWorkout
    ? workoutLogs.some(l => l.type === todayWorkout.name && l.date === todayStr && l.completed)
    : false;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = localDateStr(d);
    const log = workoutLogs.find(w => w.date === dateStr);
    const isToday = dateStr === todayStr;
    const isPast = d < today && !isToday;
    const assignedId = dayAssignments[String(i)];
    const assignedDay = assignedId && program ? program.days.find(dd => dd.id === assignedId) : null;
    const isTraining = !!assignedDay;
    const isRest = !isTraining && !log;

    // Short label for the workout
    const shortLabel = assignedDay ? extractLabel(assignedDay.name) : '';

    const colorIdx = assignedId ? (dayColorMap[assignedId] ?? -1) : -1;

    // Only count as missed if program has actually started
    const programStartDate = program ? new Date(program.createdAt) : null;
    const programStarted = programStartDate ? d >= programStartDate : false;
    const missed = isPast && isTraining && !log && programStarted;

    return { day: t.home.weekDays[i], date: d.getDate(), dateStr, log, isToday, isPast, isTraining, isRest, missed, dayIdx: i, shortLabel, colorIdx };
  });

  // ── This week's progress ──
  const totalTrainingDays = Object.keys(dayAssignments).length;
  const completedThisWeek = weekDays.filter(wd => wd.log?.completed).length;

  // ── Program progress ──
  const programWeeks = program?.durationWeeks ?? 0;
  const programStartTime = program ? new Date(program.createdAt).getTime() : 0;
  const msElapsed = Date.now() - programStartTime;
  const weeksElapsed = program && msElapsed > 0 ? Math.ceil(msElapsed / (7 * 86400000)) : 0;
  const currentWeek = Math.min(Math.max(weeksElapsed, 0), programWeeks);
  const progressPct = programWeeks > 0 && currentWeek > 0 ? Math.round((currentWeek / programWeeks) * 100) : 0;

  // ── Full program consistency (all weeks including future) ──
  const allProgramWeeks = Array.from({ length: programWeeks }, (_, i) => {
    const weekNum = i + 1;
    const isCurrent = weekNum === currentWeek;
    const isFuture = weekNum > currentWeek;
    const weeksAgo = currentWeek - weekNum;
    const weekMonday = new Date(monday);
    weekMonday.setDate(weekMonday.getDate() - weeksAgo * 7);
    const weekDates = Array.from({ length: 7 }, (_, j) => {
      const d = new Date(weekMonday);
      d.setDate(weekMonday.getDate() + j);
      return d.toISOString().split('T')[0];
    });
    const completed = isFuture ? 0 : workoutLogs.filter(l => weekDates.includes(l.date) && l.completed).length;
    return { completed, target: totalTrainingDays || 3, weekNum, isCurrent, isFuture };
  });
  const recentWeeks = allProgramWeeks.filter(w => !w.isFuture).slice(-4);

  // ── Smart motivational line ──
  const motiveLine = (() => {
    if (currentWeek === 0 && program) {
      const startDate = new Date(program.createdAt + 'T00:00:00');
      const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / 86400000);
      if (daysUntil <= 1) return t.home.motiveProgramStartsTomorrow;
      if (daysUntil <= 7) return t.home.motiveProgramStartsIn(daysUntil);
      return t.home.motiveNewProgramSoon;
    }
    const remaining = totalTrainingDays - completedThisWeek;
    const perfectWeeks = recentWeeks.filter(w => w.completed >= w.target).length;
    if (completedThisWeek >= totalTrainingDays && totalTrainingDays > 0) return t.home.motivePerfectWeek;
    if (remaining === 1) return t.home.motiveOneLeft;
    if (perfectWeeks >= 3) return t.home.motiveOnARoll(perfectWeeks);
    if (client.streak >= 10) return t.home.motiveStreak(client.streak);
    if (weightChange < 0) return t.home.motiveWeightDown(Math.abs(weightChange).toFixed(1));
    if (completedThisWeek > 0) return t.home.motiveAhead;
    return t.home.motiveNewWeek;
  })();

  // ── Latest coach message ──
  const lastCoachMsg = messages.filter(m => m.isFromCoach).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  // ── Dynamic time-based greeting ──
  const dynamicGreeting = (() => {
    const hour = new Date().getHours();
    const firstName = client.name.split(' ')[0];
    if (hour >= 5 && hour < 12) return t.home.greetingMorning(firstName);
    if (hour >= 12 && hour < 18) return t.home.greetingAfternoon(firstName);
    if (hour >= 18 && hour < 22) return t.home.greetingEvening(firstName);
    return t.home.greetingNight(firstName);
  })();

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 14px' : '24px', gap: isMobile ? '14px' : '20px' }}>
      {/* ── Greeting ── */}
      <div style={{ ...styles.welcome, marginBottom: isMobile ? '0px' : '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
          <h1 style={{ ...styles.greeting, fontSize: isMobile ? '26px' : '34px' }}>{dynamicGreeting}</h1>
          {client.streak >= 3 && <StreakFlame streak={client.streak} size={isMobile ? 22 : 28} />}
        </div>
        {client.streak >= 3 && (
          <div style={{ ...styles.streakBadge, fontSize: isMobile ? '12px' : '14px', padding: isMobile ? '3px 10px' : '4px 12px', marginTop: isMobile ? '4px' : '6px' }}>
            <AnimatedNumber value={client.streak} duration={1200} />
            <span style={{ marginLeft: '4px' }}>{t.home.dayStreak}</span>
          </div>
        )}
      </div>

      {/* ── New Coach Feedback Banner ── */}
      <AnimatePresence>
        {latestFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              onClick={handleDismissFeedback}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '10px' : '12px',
                padding: isMobile ? '10px 12px' : '12px 16px',
                borderRadius: isMobile ? '12px' : 'var(--radius-lg, 16px)',
                background: 'linear-gradient(135deg, rgba(0,229,200,0.1) 0%, rgba(99,102,241,0.08) 100%)',
                border: '1px solid rgba(0,229,200,0.2)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{
                width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', borderRadius: isMobile ? '8px' : '10px',
                background: 'var(--accent-primary-dim, rgba(0,229,200,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MessageSquare size={isMobile ? 15 : 18} color="var(--accent-primary, #00e5c8)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, color: 'var(--text-primary, #e0e0e0)' }}>
                  {lang === 'pl' ? 'Trener odpowiedział na Twój check-in' : 'Coach responded to your check-in'}
                </div>
                <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--text-secondary, #8b92a5)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {latestFeedback.coachFeedback}
                </div>
              </div>
              <ArrowRight size={16} color="var(--accent-primary, #00e5c8)" style={{ flexShrink: 0 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Today's Workout ── */}
      <GlassCard delay={0.05} style={styles.workoutCard}>
        <div style={{ ...styles.cardHeader, gap: isMobile ? '10px' : '12px', marginBottom: isMobile ? '10px' : '12px' }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <div style={{
              ...styles.cardIcon,
              width: isMobile ? '38px' : '44px',
              height: isMobile ? '38px' : '44px',
              animation: todayWorkout ? 'icon-pulse 2s ease-in-out infinite' : 'icon-pulse 4s ease-in-out infinite',
            }}><Dumbbell size={isMobile ? 17 : 20} /></div>
            {!todayWorkout && (
              <>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    position: 'absolute',
                    top: -4,
                    right: -6 + i * 8,
                    fontSize: [12, 15, 18][i],
                    fontWeight: 800,
                    color: 'var(--text-tertiary)',
                    animation: `zzz-float 2.4s ${i * 0.6}s ease-out infinite`,
                    pointerEvents: 'none',
                  }}>z</span>
                ))}
              </>
            )}
          </div>
          <div>
            <div style={{ ...styles.cardTitle, fontSize: isMobile ? '15px' : '18px' }}>{t.home.todaysWorkout}</div>
            <div style={{ ...styles.cardSub, fontSize: isMobile ? '13px' : '15px' }}>{todayWorkout?.name || t.home.restDay}</div>
          </div>
        </div>
        {todayWorkout ? (
          <>
            <div style={{ ...styles.workoutMeta, fontSize: isMobile ? '13px' : '15px', gap: isMobile ? '12px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
              <span>{todayWorkout.exercises.length} {t.home.exercises}</span>
              <span>{(() => {
                // Calculate approximate time: ~2 min per set + rest between sets
                const totalSets = todayWorkout.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
                const avgRestSec = todayWorkout.exercises.reduce((sum, ex) => sum + (ex.restSeconds ?? 60), 0) / (todayWorkout.exercises.length || 1);
                const approxMin = Math.round((totalSets * 2) + (totalSets * avgRestSec / 60));
                return t.home.approxTime(approxMin > 0 ? approxMin : 60);
              })()}</span>
            </div>
            {todayCompleted ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: isMobile ? '12px' : '14px', borderRadius: '12px', background: 'var(--accent-success-dim, rgba(34,197,94,0.15))', color: 'var(--accent-success, #22c55e)', fontSize: isMobile ? '14px' : '16px', fontWeight: 600 }}>
                <CheckCircle2 size={isMobile ? 18 : 20} />
                Workout Complete
              </div>
            ) : (
              <button style={{ ...styles.startBtn, padding: isMobile ? '12px' : '14px', fontSize: isMobile ? '14px' : '16px' }} onClick={() => onNavigate('program')}>
                {t.home.startWorkout} <ArrowRight size={isMobile ? 14 : 16} />
              </button>
            )}
          </>
        ) : (
          <p style={{ ...styles.restText, fontSize: isMobile ? '13px' : '15px' }}>{t.home.restText}</p>
        )}
      </GlassCard>

      {/* ── Quick Actions ── */}
      <div style={{ ...styles.quickActions, gap: isMobile ? '8px' : '12px' }}>
        <button style={{ ...styles.quickBtn, gap: isMobile ? '8px' : '12px', padding: isMobile ? '14px 6px' : '20px 8px' }} onClick={() => onNavigate('program')}>
          <div style={{ ...styles.quickIcon, background: 'var(--accent-warm-dim)', color: 'var(--accent-warm)', width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: isMobile ? '10px' : '12px' }}>
            <Zap size={isMobile ? 18 : 22} />
          </div>
          <span style={{ ...styles.quickLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.home.logWorkout}</span>
        </button>
        <button style={{ ...styles.quickBtn, gap: isMobile ? '8px' : '12px', padding: isMobile ? '14px 6px' : '20px 8px' }} onClick={() => onNavigate('check-in')}>
          <div style={styles.quickIconWrap}>
            <div style={{ ...styles.quickIcon, background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)', width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: isMobile ? '10px' : '12px' }}>
              <ClipboardCheck size={isMobile ? 18 : 22} />
            </div>
            {checkInDueNow && <div style={styles.quickBadge} />}
          </div>
          <span style={{ ...styles.quickLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.home.checkIn}</span>
        </button>
        <button style={{ ...styles.quickBtn, gap: isMobile ? '8px' : '12px', padding: isMobile ? '14px 6px' : '20px 8px' }} onClick={() => onNavigate('messages')}>
          <div style={{ ...styles.quickIcon, background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: isMobile ? '10px' : '12px' }}>
            <Send size={isMobile ? 18 : 22} />
          </div>
          <span style={{ ...styles.quickLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.home.message}</span>
        </button>
      </div>

      {/* ── This Week ── */}
      <GlassCard delay={0.1}>
        {/* Week progress header */}
        {totalTrainingDays > 0 && (
          <div style={{ ...styles.weekHeader, marginBottom: isMobile ? '10px' : '12px' }}>
            <span style={{ ...styles.weekHeaderLabel, fontSize: isMobile ? '13px' : '15px' }}>{t.home.thisWeek}</span>
            <span style={{ ...styles.weekHeaderProgress, fontSize: isMobile ? '12px' : '14px' }}>
              {completedThisWeek}/{totalTrainingDays} {t.home.workouts}
            </span>
          </div>
        )}
        {Object.keys(dayAssignments).length === 0 && program && (
          <div style={styles.planPrompt}>{t.home.planYourWeek}</div>
        )}
        <div style={{ ...styles.weekRow, gap: isMobile ? '4px' : '6px' }}>
          {weekDays.map(wd => {
            const completed = wd.log?.completed;
            const c = wd.colorIdx >= 0 ? WORKOUT_COLORS[wd.colorIdx] : null;
            const rgb = c ? `${c.r},${c.g},${c.b}` : '';

            let cellBg = 'var(--bg-subtle)';
            let cellBorder = '1px solid transparent';
            let cellShadow: string | undefined;
            let cellOpacity = 1;

            if (wd.isToday) {
              cellBg = 'rgba(0,229,200,0.08)';
              cellBorder = '1px solid rgba(0,229,200,0.25)';
              cellShadow = '0 0 12px rgba(0,229,200,0.1)';
            } else if (completed && c) {
              cellBg = `rgba(${rgb},0.12)`;
              cellBorder = `1px solid rgba(${rgb},0.2)`;
            } else if (completed) {
              cellBg = 'rgba(34,197,94,0.06)';
              cellBorder = '1px solid rgba(34,197,94,0.12)';
            } else if (wd.missed && c) {
              cellBg = `rgba(${rgb},0.08)`;
              cellBorder = `1px solid rgba(${rgb},0.15)`;
              cellOpacity = 0.45;
            } else if (wd.isTraining && c) {
              cellBg = `rgba(${rgb},0.06)`;
              cellBorder = `1px solid rgba(${rgb},0.12)`;
            } else if (wd.isTraining) {
              cellBg = 'rgba(59,130,246,0.06)';
              cellBorder = '1px solid rgba(59,130,246,0.12)';
            }

            if (wd.isRest && wd.isPast) cellOpacity = 0.3;
            else if (wd.isRest) cellOpacity = 0.5;

            const numColor = wd.isToday ? 'var(--accent-primary)' :
                             completed && c ? `rgb(${rgb})` :
                             completed ? 'var(--accent-success)' :
                             wd.missed ? 'var(--text-secondary)' :
                             wd.isTraining ? 'var(--text-primary)' :
                             'var(--text-tertiary)';

            return (
              <div
                key={wd.dateStr}
                style={{
                  ...styles.weekDay,
                  padding: isMobile ? '6px 2px 8px' : '8px 2px 10px',
                  borderRadius: isMobile ? '8px' : '10px',
                  background: cellBg,
                  border: cellBorder,
                  boxShadow: cellShadow,
                  opacity: cellOpacity,
                }}
              >
                <div style={{ ...styles.weekDayLabel, fontSize: isMobile ? '10px' : '12px' }}>{wd.day}</div>
                <div style={{
                  ...styles.weekDayNum,
                  fontSize: isMobile ? '15px' : '18px',
                  color: numColor,
                }}>
                  {wd.date}
                </div>
                <div style={{
                  ...styles.weekWorkoutTag,
                  color: completed && c ? `rgb(${rgb})` : completed ? 'var(--accent-success)' : wd.missed && c ? `rgba(${rgb},0.7)` : 'var(--text-tertiary)',
                }}>
                  {completed ? <Check size={12} /> : wd.missed ? <X size={10} /> : wd.isToday && wd.isTraining && wd.shortLabel ? <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{wd.shortLabel}</span> : ''}
                </div>
              </div>
            );
          })}
        </div>

      </GlassCard>


      {/* ── Program Progress ── */}
      {program && programWeeks > 0 && (
        <GlassCard delay={0.15}>
          <div style={{ ...styles.progressRow, gap: isMobile ? '12px' : '16px' }}>
            {/* SVG Ring */}
            <div style={{ ...styles.ringWrap, width: isMobile ? '60px' : '72px', height: isMobile ? '60px' : '72px' }}>
              <svg width={isMobile ? '60' : '72'} height={isMobile ? '60' : '72'} viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--glass-border)" strokeWidth="5" />
                <circle
                  cx="36" cy="36" r="30"
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - progressPct / 100)}`}
                  transform="rotate(-90 36 36)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={styles.ringLabel}>
                <span style={{ ...styles.ringPct, fontSize: isMobile ? '15px' : '18px' }}>{progressPct}%</span>
              </div>
            </div>

            {/* Text details */}
            <div style={styles.progressInfo}>
              <div style={{ ...styles.progressTitle, fontSize: isMobile ? '14px' : '16px' }}>{program.name}</div>
              <div style={{ ...styles.progressWeek, fontSize: isMobile ? '12px' : '14px', marginBottom: isMobile ? '8px' : '10px' }}>{currentWeek > 0 ? `${t.home.weekOf} ${currentWeek} ${t.home.of} ${programWeeks}` : `${t.home.starts} ${new Date(program.createdAt + 'T00:00:00').toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressBarFill, width: `${progressPct}%` }} />
              </div>
            </div>
          </div>

          {/* Motivational line */}
          <div style={{ ...styles.motiveLine, fontSize: isMobile ? '12px' : '14px', marginTop: isMobile ? '10px' : '14px', paddingTop: isMobile ? '10px' : '12px' }}>{motiveLine}</div>

          {/* Weekly consistency - collapsed: last 4 with dots, expanded: grid of squares */}
          {!showAllWeeks ? (
            <div style={{ ...styles.consistencyRow, marginTop: isMobile ? '10px' : '12px' }}>
              {recentWeeks.map((w) => {
                const isPerfect = w.completed >= w.target;
                return (
                  <div key={w.weekNum} style={{
                    ...styles.consistencyWeek,
                    ...(w.isCurrent ? styles.consistencyWeekCurrent : {}),
                  }}>
                    <div style={{ ...styles.consistencyDots, gap: isMobile ? '3px' : '4px' }}>
                      {Array.from({ length: w.target }, (_, j) => (
                        <div
                          key={j}
                          style={{
                            ...styles.consistencyDot,
                            width: isMobile ? '6px' : '8px',
                            height: isMobile ? '6px' : '8px',
                            background: j < w.completed ? 'var(--accent-success)' : 'rgba(255,255,255,0.15)',
                          }}
                        />
                      ))}
                    </div>
                    <span style={{
                      ...styles.consistencyFraction,
                      fontSize: isMobile ? '10px' : '11px',
                      color: isPerfect ? 'var(--accent-success)' : 'var(--text-tertiary)',
                    }}>
                      {w.completed}/{w.target}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...styles.weekGrid, gap: isMobile ? '6px' : '8px', marginTop: isMobile ? '10px' : '12px' }}>
              {allProgramWeeks.map((w) => {
                const isPerfect = !w.isFuture && w.completed >= w.target;
                const pct = w.isFuture ? 0 : w.target > 0 ? w.completed / w.target : 0;
                return (
                  <div
                    key={w.weekNum}
                    style={{
                      ...styles.weekSquare,
                      ...(w.isCurrent ? styles.weekSquareCurrent : {}),
                      background: w.isCurrent
                        ? 'rgba(0,229,200,0.1)'
                        : w.isFuture
                          ? 'rgba(255,255,255,0.03)'
                          : isPerfect
                            ? 'rgba(34,197,94,0.15)'
                            : pct > 0
                              ? 'rgba(34,197,94,0.07)'
                              : 'rgba(255,255,255,0.04)',
                      border: w.isCurrent
                        ? '2px solid var(--accent-primary)'
                        : '1px solid var(--glass-border)',
                      opacity: w.isFuture ? 0.4 : 1,
                    }}
                  >
                    <span style={{
                      ...styles.weekSquareNum,
                      fontSize: isMobile ? '13px' : '15px',
                      color: w.isCurrent ? 'var(--accent-primary)' : isPerfect ? 'var(--accent-success)' : 'var(--text-secondary)',
                    }}>
                      {w.weekNum}
                    </span>
                    <span style={{
                      ...styles.weekSquareSub,
                      fontSize: isMobile ? '9px' : '10px',
                      color: w.isFuture ? 'var(--text-tertiary)' : isPerfect ? 'var(--accent-success)' : w.isCurrent ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    }}>
                      {w.isFuture ? '-' : `${w.completed}/${w.target}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expand/collapse arrow */}
          <button
            style={styles.expandBtn}
            onClick={() => setShowAllWeeks(!showAllWeeks)}
          >
            <ChevronDown
              size={20}
              style={{
                transition: 'transform 0.2s',
                transform: showAllWeeks ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
        </GlassCard>
      )}

      {/* ── Latest from Coach ── */}
      {lastCoachMsg && (
        <GlassCard delay={0.2} hover onClick={() => onNavigate('messages')}>
          <div style={{ ...styles.coachRow, gap: isMobile ? '10px' : '12px' }}>
            <div style={{ ...styles.coachIcon, width: isMobile ? '38px' : '44px', height: isMobile ? '38px' : '44px' }}>
              <MessageSquare size={isMobile ? 15 : 18} />
            </div>
            <div style={styles.coachContent}>
              <div style={{ ...styles.coachName, fontSize: isMobile ? '11px' : '13px' }}>{coachName}</div>
              <p style={{ ...styles.coachText, fontSize: isMobile ? '13px' : '15px' }}>
                {lastCoachMsg.text.length > 80 ? lastCoachMsg.text.slice(0, 80) + '...' : lastCoachMsg.text}
              </p>
            </div>
            <ArrowRight size={isMobile ? 14 : 16} color="var(--text-tertiary)" />
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: '100%',
  },

  // ── Welcome ──
  welcome: { marginBottom: '2px' },
  greeting: {
    fontSize: '34px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    margin: 0,
  },
  streakBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: '6px',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: '#f97316',
    background: 'rgba(249,115,22,0.1)',
    border: '1px solid rgba(249,115,22,0.2)',
    borderRadius: '20px',
    padding: '4px 12px',
  },

  // ── Quick Actions ──
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  quickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.15s',
    color: 'var(--text-primary)',
  },
  quickIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconWrap: {
    position: 'relative',
    display: 'inline-flex',
  },
  quickBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-danger)',
    border: '2px solid var(--bg-card)',
  },
  quickLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },

  // ── Workout Card ──
  workoutCard: {},
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-warm-dim)',
    color: 'var(--accent-warm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardSub: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  workoutMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  },
  startBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
  restText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },

  // ── Weekly Calendar ──
  weekRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    textAlign: 'center',
    alignItems: 'center',
  },
  weekDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    padding: '8px 2px 10px',
    borderRadius: '10px',
    background: 'var(--bg-subtle)',
    border: '1px solid transparent',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s',
  },
  weekStatusBar: {
    width: '100%',
    height: '2px',
    borderRadius: '0 0 2px 2px',
    marginBottom: '2px',
  },
  weekDayLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  weekDayNum: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  weekHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  weekHeaderLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  weekHeaderProgress: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  weekWorkoutTag: {
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 1.2,
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
    minHeight: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  planPrompt: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    textAlign: 'center',
    marginBottom: '10px',
    opacity: 0.8,
  },

  // ── Weight Footer (inside Week card) ──
  weightFooter: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid var(--glass-border)',
  },
  weightValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  weightUnit: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  weightTrend: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    marginLeft: '2px',
  },

  // ── Program Progress ──
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  ringWrap: {
    position: 'relative',
    width: '72px',
    height: '72px',
    flexShrink: 0,
  },
  ringLabel: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  progressInfo: {
    flex: 1,
    minWidth: 0,
  },
  progressTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  progressWeek: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  progressBar: {
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    transition: 'width 1s ease',
  },

  // ── Motivational + Consistency ──
  motiveLine: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid var(--glass-border)',
  },
  consistencyRow: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: '12px',
  },
  consistencyWeek: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 2px',
    borderRadius: '8px',
  },
  consistencyWeekCurrent: {
    background: 'rgba(0,229,200,0.08)',
    border: '1px solid rgba(0,229,200,0.2)',
    padding: '8px 10px',
    borderRadius: '10px',
    boxShadow: '0 0 12px rgba(0,229,200,0.12)',
  },
  consistencyDots: {
    display: 'flex',
    gap: '4px',
  },
  consistencyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  consistencyFraction: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '12px',
  },
  weekSquare: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1.2',
    borderRadius: '10px',
    gap: '2px',
  },
  weekSquareCurrent: {
    boxShadow: '0 0 12px rgba(0,229,200,0.15)',
  },
  weekSquareNum: {
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  weekSquareSub: {
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  expandBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '8px 0 0',
    marginTop: '10px',
    border: 'none',
    borderTop: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
  },

  // ── Coach Preview ──
  coachRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  coachIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coachContent: {
    flex: 1,
    minWidth: 0,
  },
  coachName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '3px',
  },
  coachText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
};
