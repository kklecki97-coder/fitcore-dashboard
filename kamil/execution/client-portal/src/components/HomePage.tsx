import { Flame, Calendar, TrendingDown, Dumbbell, MessageSquare, ArrowRight, Send, ClipboardCheck, Target } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram, WorkoutLog, CheckIn, Message, ClientPage } from '../types';

interface HomePageProps {
  client: Client;
  program: WorkoutProgram | null;
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  messages: Message[];
  coachName: string;
  onNavigate: (page: ClientPage) => void;
}

export default function HomePage({ client, program, workoutLogs, checkIns, messages, coachName, onNavigate }: HomePageProps) {
  const isMobile = useIsMobile();

  // ── Today's workout day ──
  const completedCount = workoutLogs.filter(w => w.completed).length;
  const todayDayIndex = program ? completedCount % program.days.length : 0;
  const todayWorkout = program?.days[todayDayIndex];

  // ── Next check-in ──
  const nextCheckIn = checkIns.find(ci => ci.status === 'scheduled');
  const daysUntilCheckIn = nextCheckIn
    ? Math.ceil((new Date(nextCheckIn.date).getTime() - new Date().getTime()) / 86400000)
    : null;
  // Progress ring for check-in (7-day cycle)
  const checkInProgress = daysUntilCheckIn !== null
    ? Math.max(0, Math.min(1, 1 - daysUntilCheckIn / 7))
    : 0;

  // ── Latest coach feedback ──
  const latestReviewed = checkIns
    .filter(ci => ci.reviewStatus === 'reviewed' && ci.coachFeedback)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  // ── Weight trend ──
  const weights = client.metrics.weight;
  const weightChange = weights.length >= 2 ? weights[weights.length - 1] - weights[weights.length - 2] : 0;

  // ── Weekly training calendar (Mon–Sun) ──
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun,1=Mon...6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // Build a schedule preview: for today & future, show the next workout name
  const todayStr = today.toISOString().split('T')[0];
  let upcomingDayIdx = todayDayIndex;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const log = workoutLogs.find(w => w.date === dateStr);
    const isToday = dateStr === todayStr;
    const isPast = d < today && !isToday;
    const isFuture = d > today;

    // Show scheduled workout name for today and future days
    let scheduledName = '';
    if ((isToday || isFuture) && program && program.days.length > 0 && !log) {
      scheduledName = program.days[upcomingDayIdx % program.days.length].name
        .replace('Upper Body ', 'Upper ')
        .replace('Lower Body ', 'Lower ');
      upcomingDayIdx++;
    } else if (log) {
      // If there's already a log for today, advance the index
      if (isToday || isFuture) upcomingDayIdx++;
    }

    return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], date: d.getDate(), dateStr, log, isToday, isPast, isFuture, scheduledName };
  });

  // ── Goal progress (parse from goal strings) ──
  const goalProgress = client.goals.map(goal => {
    if (goal.toLowerCase().includes('80kg') || goal.toLowerCase().includes('weight')) {
      const start = weights[0];
      const current = weights[weights.length - 1];
      const target = 80;
      const pct = Math.min(100, Math.round(((start - current) / (start - target)) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg → ${target}kg` };
    }
    if (goal.toLowerCase().includes('bench') && goal.toLowerCase().includes('100')) {
      const presses = client.metrics.benchPress;
      const current = presses[presses.length - 1];
      const target = 100;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}kg / ${target}kg` };
    }
    if (goal.toLowerCase().includes('sleep')) {
      const latestCI = checkIns.filter(ci => ci.sleepHours !== null).sort((a, b) => b.date.localeCompare(a.date))[0];
      const current = latestCI?.sleepHours ?? 0;
      const target = 7;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { goal, progress: Math.max(0, pct), label: `${current}h / ${target}h` };
    }
    // Default fallback
    return { goal, progress: Math.round(client.progress * 0.7), label: 'In progress' };
  });

  // ── Last coach message ──
  const lastCoachMsg = messages.filter(m => m.isFromCoach).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  // ── Quick action badges ──
  const checkInDueNow = daysUntilCheckIn !== null && daysUntilCheckIn <= 1;
  const unreadMessages = messages.filter(m => m.isFromCoach && !m.isRead).length;

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 12px' : '24px' }}>
      {/* ── Welcome ── */}
      <div style={styles.welcome}>
        <h1 style={styles.greeting}>Hey {client.name.split(' ')[0]}</h1>
        <p style={styles.motivational}>Keep pushing — consistency beats perfection.</p>
      </div>

      {/* ── Stats Row ── */}
      <div style={styles.statsRow}>
        <GlassCard delay={0.05} style={styles.statCard}>
          <div style={styles.statIcon}><TrendingDown size={16} color="var(--accent-success)" /></div>
          <div style={styles.statValue}>{weights[weights.length - 1]} <span style={styles.statUnit}>kg</span></div>
          <div style={{
            ...styles.statLabel,
            color: weightChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
          }}>
            {weightChange <= 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)}kg
          </div>
        </GlassCard>

        <GlassCard delay={0.08} style={styles.statCard}>
          <div style={styles.statIcon}><Flame size={16} color="var(--accent-warm)" /></div>
          <div style={styles.statValue}>{client.streak}</div>
          <div style={styles.statLabel}>day streak</div>
        </GlassCard>

        <GlassCard delay={0.1} style={styles.statCard}>
          <div style={styles.statIcon}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              background: `conic-gradient(var(--accent-primary) ${client.progress * 3.6}deg, var(--glass-border) 0deg)`,
            }} />
          </div>
          <div style={styles.statValue}>{client.progress}<span style={styles.statUnit}>%</span></div>
          <div style={styles.statLabel}>progress</div>
        </GlassCard>
      </div>

      {/* ── Today's Workout ── */}
      <GlassCard delay={0.05} style={styles.workoutCard}>
        <div style={styles.cardHeader}>
          <div style={styles.cardIcon}><Dumbbell size={18} /></div>
          <div>
            <div style={styles.cardTitle}>Today's Workout</div>
            <div style={styles.cardSub}>{todayWorkout?.name || 'Rest Day'}</div>
          </div>
        </div>
        {todayWorkout ? (
          <>
            <div style={styles.workoutMeta}>
              <span>{todayWorkout.exercises.length} exercises</span>
              <span>~60 min</span>
            </div>
            <button style={styles.startBtn} onClick={() => onNavigate('program')}>
              Start Workout <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <p style={styles.restText}>Rest day — recover and come back stronger tomorrow.</p>
        )}
      </GlassCard>

      {/* ── Quick Actions ── */}
      <div style={styles.quickActions}>
        <button style={styles.quickBtn} onClick={() => onNavigate('program')}>
          <div style={{ ...styles.quickIcon, background: 'var(--accent-warm-dim)', color: 'var(--accent-warm)' }}>
            <Dumbbell size={18} />
          </div>
          <span style={styles.quickLabel}>Log Workout</span>
        </button>
        <button style={styles.quickBtn} onClick={() => onNavigate('check-in')}>
          <div style={{ ...styles.quickIconWrap }}>
            <div style={{ ...styles.quickIcon, background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)' }}>
              <ClipboardCheck size={18} />
            </div>
            {checkInDueNow && <div style={styles.quickBadge} />}
          </div>
          <span style={styles.quickLabel}>Check-In</span>
        </button>
        <button style={styles.quickBtn} onClick={() => onNavigate('messages')}>
          <div style={{ ...styles.quickIconWrap }}>
            <div style={{ ...styles.quickIcon, background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
              <Send size={18} />
            </div>
            {unreadMessages > 0 && <div style={styles.quickBadge} />}
          </div>
          <span style={styles.quickLabel}>Message</span>
        </button>
      </div>

      {/* ── Weekly Training Calendar ── */}
      <GlassCard delay={0.1}>
        <div style={styles.weekRow}>
          {weekDays.map(wd => {
            const completed = wd.log?.completed;
            const missed = wd.log && !wd.log.completed;
            const workoutLabel = wd.scheduledName || (wd.log ? wd.log.type.replace('Upper Body ', 'Upper ').replace('Lower Body ', 'Lower ') : '');

            return (
              <div key={wd.dateStr} style={{
                ...styles.weekDay,
                ...(wd.isToday ? styles.weekDayToday : {}),
                ...(completed ? styles.weekDayDone : {}),
                ...(missed ? styles.weekDayFail : {}),
                opacity: wd.isPast && !wd.log ? 0.4 : 1,
              }}>
                {/* Status bar top edge */}
                <div style={{
                  ...styles.weekStatusBar,
                  background: completed ? 'var(--accent-success)' :
                              missed ? 'var(--accent-danger)' :
                              wd.isToday ? 'var(--accent-primary)' : 'transparent',
                }} />

                <div style={styles.weekDayLabel}>{wd.day}</div>

                <div style={{
                  ...styles.weekDayNum,
                  color: wd.isToday ? 'var(--accent-primary)' :
                         completed ? 'var(--accent-success)' :
                         missed ? 'var(--accent-danger)' :
                         'var(--text-secondary)',
                }}>
                  {wd.date}
                </div>

                {/* Workout name tag */}
                {workoutLabel && (
                  <div style={{
                    ...styles.weekWorkoutTag,
                    color: completed ? 'var(--accent-success)' :
                           wd.isToday ? 'var(--accent-primary)' :
                           'var(--text-tertiary)',
                  }}>
                    {workoutLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Goal Progress ── */}
      <GlassCard delay={0.2}>
        <div style={{ ...styles.cardHeader, marginBottom: '16px' }}>
          <div style={{ ...styles.cardIcon, background: 'var(--accent-success-dim, rgba(34,197,94,0.1))', color: 'var(--accent-success)' }}>
            <Target size={18} />
          </div>
          <div style={styles.cardTitle}>Goals</div>
        </div>
        <div style={styles.goalsList}>
          {goalProgress.map((g, i) => (
            <div key={i} style={styles.goalItem}>
              <div style={styles.goalTop}>
                <div style={styles.goalName}>{g.goal}</div>
                <div style={styles.goalPct}>{g.progress}%</div>
              </div>
              <div style={styles.goalBarBg}>
                <div style={{
                  ...styles.goalBarFill,
                  width: `${g.progress}%`,
                  background: g.progress >= 90 ? 'var(--accent-success)' : g.progress >= 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
                }} />
              </div>
              <div style={styles.goalLabel}>{g.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── Next Check-In (prominent with progress ring) ── */}
      {nextCheckIn && (
        <GlassCard delay={0.3} hover onClick={() => onNavigate('check-in')}>
          <div style={styles.checkInRow}>
            <div style={styles.checkInRing}>
              <svg width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r="22" fill="none" stroke="var(--glass-border)" strokeWidth="3" />
                <circle cx="27" cy="27" r="22" fill="none" stroke="var(--accent-secondary)" strokeWidth="3"
                  strokeDasharray={`${checkInProgress * 138.2} 138.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 27 27)"
                />
              </svg>
              <div style={styles.checkInRingIcon}>
                <Calendar size={18} color="var(--accent-secondary)" />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.cardTitle}>Next Check-In</div>
              <div style={styles.checkInDue}>
                {daysUntilCheckIn !== null && daysUntilCheckIn <= 0
                  ? 'Due today — submit now!'
                  : daysUntilCheckIn === 1
                    ? 'Due tomorrow'
                    : `Due in ${daysUntilCheckIn} days`}
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-tertiary)" />
          </div>
        </GlassCard>
      )}

      {/* ── From Your Coach (merged message + feedback) ── */}
      {(lastCoachMsg || latestReviewed) && (
        <GlassCard delay={0.4}>
          <div style={{ ...styles.cardHeader, marginBottom: '14px' }}>
            <div style={{ ...styles.cardIcon, background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
              <MessageSquare size={18} />
            </div>
            <div style={styles.cardTitle}>From {coachName}</div>
          </div>

          {/* Latest message */}
          {lastCoachMsg && (
            <div style={styles.coachSection} onClick={() => onNavigate('messages')}>
              <div style={styles.coachSectionLabel}>Latest Message</div>
              <p style={styles.coachMsgText}>
                {lastCoachMsg.text.length > 120 ? lastCoachMsg.text.slice(0, 120) + '…' : lastCoachMsg.text}
              </p>
              <div style={styles.coachSectionTime}>{formatRelative(new Date(lastCoachMsg.timestamp))}</div>
            </div>
          )}

          {/* Check-in feedback */}
          {latestReviewed && (
            <div style={{ ...styles.coachSection, ...(lastCoachMsg ? { marginTop: '14px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px' } : {}) }} onClick={() => onNavigate('check-in')}>
              <div style={styles.coachSectionLabel}>Check-In Feedback</div>
              <p style={styles.feedbackText}>{latestReviewed.coachFeedback}</p>
              <div style={styles.coachSectionTime}>
                {new Date(latestReviewed.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          )}
        </GlassCard>
      )}

    </div>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    minHeight: '100%',
  },
  welcome: { marginBottom: '4px' },
  greeting: {
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  motivational: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },

  // ── Quick Actions ──
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  quickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.15s',
    color: 'var(--text-primary)',
  },
  quickIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
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
    fontSize: '13px',
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
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-warm-dim)',
    color: 'var(--accent-warm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardSub: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '1px',
  },
  workoutMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  },
  startBtn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '15px',
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
    fontSize: '14px',
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
    gap: '2px',
    padding: '0 2px 8px',
    borderRadius: '8px',
    background: 'var(--bg-subtle)',
    border: '1px solid transparent',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s',
  },
  weekDayToday: {
    background: 'rgba(0,229,200,0.08)',
    border: '1px solid rgba(0,229,200,0.25)',
    boxShadow: '0 0 12px rgba(0,229,200,0.1)',
  },
  weekDayDone: {
    background: 'rgba(34,197,94,0.06)',
    border: '1px solid rgba(34,197,94,0.12)',
  },
  weekDayFail: {
    background: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.1)',
  },
  weekStatusBar: {
    width: '100%',
    height: '2px',
    borderRadius: '0 0 2px 2px',
    marginBottom: '4px',
  },
  weekDayLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  weekDayNum: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  weekWorkoutTag: {
    fontSize: '9px',
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 1.2,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '0.2px',
    textTransform: 'uppercase',
  },

  // ── Stats Row ──
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    padding: '18px',
    textAlign: 'center',
  },
  statIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  statUnit: {
    fontSize: '15px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginTop: '2px',
  },

  // ── Check-In (prominent) ──
  checkInRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  checkInRing: {
    position: 'relative',
    width: '54px',
    height: '54px',
    flexShrink: 0,
  },
  checkInRingIcon: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInDue: {
    fontSize: '14px',
    color: 'var(--accent-secondary)',
    fontWeight: 500,
    marginTop: '2px',
  },

  // ── Goals ──
  goalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  goalItem: {},
  goalTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  goalName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  goalPct: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  goalBarBg: {
    height: '5px',
    borderRadius: '2px',
    background: 'var(--glass-border)',
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease',
  },
  goalLabel: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
  },

  // ── From Your Coach ──
  coachSection: {
    cursor: 'pointer',
  },
  coachSectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  coachMsgText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    borderLeft: '2px solid var(--accent-primary)',
    paddingLeft: '12px',
  },
  coachSectionTime: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    marginTop: '6px',
  },

  // ── Feedback ──
  feedbackText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    borderLeft: '2px solid var(--accent-primary)',
    paddingLeft: '12px',
    marginTop: '4px',
  },
};
