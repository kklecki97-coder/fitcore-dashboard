import { Flame, Calendar, TrendingDown, Dumbbell, MessageSquare, ArrowRight } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram, WorkoutLog, CheckIn, ClientPage } from '../types';

interface HomePageProps {
  client: Client;
  program: WorkoutProgram | null;
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  coachName: string;
  onNavigate: (page: ClientPage) => void;
}

export default function HomePage({ client, program, workoutLogs, checkIns, coachName, onNavigate }: HomePageProps) {
  const isMobile = useIsMobile();
  // Today's workout day — rotate through program days based on completed workouts
  const completedCount = workoutLogs.filter(w => w.completed).length;
  const todayDayIndex = program ? completedCount % program.days.length : 0;
  const todayWorkout = program?.days[todayDayIndex];

  // Next check-in
  const nextCheckIn = checkIns.find(ci => ci.status === 'scheduled');
  const daysUntilCheckIn = nextCheckIn
    ? Math.ceil((new Date(nextCheckIn.date).getTime() - new Date().getTime()) / 86400000)
    : null;

  // Latest coach feedback
  const latestReviewed = checkIns
    .filter(ci => ci.reviewStatus === 'reviewed' && ci.coachFeedback)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  // Weight trend
  const weights = client.metrics.weight;
  const weightChange = weights.length >= 2 ? weights[weights.length - 1] - weights[weights.length - 2] : 0;

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 12px' : '24px' }}>
      {/* Welcome */}
      <div style={styles.welcome}>
        <h1 style={styles.greeting}>Hey {client.name.split(' ')[0]}</h1>
        <p style={styles.motivational}>Keep pushing — consistency beats perfection.</p>
      </div>

      {/* Today's Workout */}
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

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <GlassCard delay={0.1} style={styles.statCard}>
          <div style={styles.statIcon}><TrendingDown size={16} color="var(--accent-success)" /></div>
          <div style={styles.statValue}>{weights[weights.length - 1]} <span style={styles.statUnit}>kg</span></div>
          <div style={{
            ...styles.statLabel,
            color: weightChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
          }}>
            {weightChange <= 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)}kg
          </div>
        </GlassCard>

        <GlassCard delay={0.15} style={styles.statCard}>
          <div style={styles.statIcon}><Flame size={16} color="var(--accent-warm)" /></div>
          <div style={styles.statValue}>{client.streak}</div>
          <div style={styles.statLabel}>day streak</div>
        </GlassCard>

        <GlassCard delay={0.2} style={styles.statCard}>
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

      {/* Next Check-In */}
      {nextCheckIn && (
        <GlassCard delay={0.25} hover onClick={() => onNavigate('check-in')}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIcon, background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)' }}>
              <Calendar size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.cardTitle}>Next Check-In</div>
              <div style={styles.cardSub}>
                {daysUntilCheckIn !== null && daysUntilCheckIn <= 0
                  ? 'Due today!'
                  : `Due in ${daysUntilCheckIn} day${daysUntilCheckIn === 1 ? '' : 's'}`}
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-tertiary)" />
          </div>
        </GlassCard>
      )}

      {/* Coach Feedback */}
      {latestReviewed && (
        <GlassCard delay={0.3} hover onClick={() => onNavigate('check-in')}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIcon, background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
              <MessageSquare size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.cardTitle}>Latest from {coachName}</div>
              <div style={styles.cardSub}>{latestReviewed.date}</div>
            </div>
          </div>
          <p style={styles.feedbackText}>{latestReviewed.coachFeedback}</p>
        </GlassCard>
      )}
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
  welcome: { marginBottom: '4px' },
  greeting: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  motivational: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
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
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '1px',
  },
  workoutMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
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
    fontSize: '14px',
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
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statCard: {
    padding: '16px',
    textAlign: 'center',
  },
  statIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  statUnit: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    marginTop: '2px',
  },
  feedbackText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    borderLeft: '2px solid var(--accent-primary)',
    paddingLeft: '12px',
    marginTop: '4px',
  },
};
