import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, Plus,
  ChevronLeft, ChevronRight, Dumbbell, X,
  XCircle,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { scheduleToday, getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram } from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFullDate(date: Date): string {
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  return `${dayName}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

interface SchedulePageProps {
  clients: Client[];
  programs: WorkoutProgram[];
  sessionsByDate: Record<string, typeof scheduleToday>;
  onSessionsChange: (sessions: Record<string, typeof scheduleToday>) => void;
  onViewClient: (id: string) => void;
}

export default function SchedulePage({ clients, programs, sessionsByDate, onSessionsChange, onViewClient }: SchedulePageProps) {
  const isMobile = useIsMobile();

  // All half-hour slots for the add-session modal picker
  const allTimeSlots: string[] = [];
  for (let h = 6; h <= 19; h++) {
    allTimeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    allTimeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const diff = Math.floor((today.getTime() - getWeekStart(today).getTime()) / 86400000);
    return Math.min(Math.max(diff, 0), 6);
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAtTime, setAddAtTime] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({ client: '', type: '', time: '09:00', duration: 60 });

  const todayKey = today.toISOString().split('T')[0];

  // Compute selected date
  const selectedDate = new Date(weekStart);
  selectedDate.setDate(selectedDate.getDate() + selectedDayIndex);

  const selectedKey = selectedDate.toISOString().split('T')[0];
  const isSelectedToday = selectedKey === todayKey;

  // Sessions to show for selected day
  const displaySessions = sessionsByDate[selectedKey] || [];

  // ── Week summary ──
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDays.push(d.toISOString().split('T')[0]);
  }
  const weekSessions = weekDays.flatMap(key => sessionsByDate[key] || []);
  const weekTotal = weekSessions.length;
  const weekCompleted = weekSessions.filter(s => s.status === 'completed').length;
  const weekUpcoming = weekSessions.filter(s => s.status === 'upcoming').length;

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setSelectedDayIndex(0);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setSelectedDayIndex(0);
  };

  const handleAddSession = () => {
    if (!newSession.client || !newSession.type) return;
    const existing = sessionsByDate[selectedKey] || [];
    const updated = [...existing, {
      time: newSession.time,
      client: newSession.client,
      type: newSession.type,
      status: 'upcoming' as const,
      duration: newSession.duration,
    }].sort((a, b) => a.time.localeCompare(b.time));
    onSessionsChange({ ...sessionsByDate, [selectedKey]: updated });
    setNewSession({ client: '', type: '', time: '09:00', duration: 60 });
    setShowAddModal(false);
    setAddAtTime(null);
  };

  const handleMarkCompleted = (dateKey: string, time: string) => {
    const sessions = sessionsByDate[dateKey] || [];
    const updated = sessions.map(s =>
      s.time === time ? { ...s, status: 'completed' as const } : s
    );
    onSessionsChange({ ...sessionsByDate, [dateKey]: updated });
  };

  const handleCancelSession = (dateKey: string, time: string) => {
    const sessions = sessionsByDate[dateKey] || [];
    const updated = sessions.filter(s => s.time !== time);
    onSessionsChange({ ...sessionsByDate, [dateKey]: updated });
  };

  const formatTimeLabel = (slot: string) => {
    const [hStr, mStr] = slot.split(':');
    const h = parseInt(hStr);
    const m = mStr;
    if (h > 12) return `${h - 12}:${m} PM`;
    if (h === 12) return `12:${m} PM`;
    return `${h}:${m} AM`;
  };

  // Get session card background based on status
  const getSessionCardStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = { ...styles.sessionCard };

    if (status === 'completed') {
      return {
        ...base,
        borderLeftColor: 'var(--accent-success)',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, var(--bg-elevated) 100%)',
        opacity: 0.7,
      };
    }
    if (status === 'current') {
      return {
        ...base,
        borderLeftColor: 'var(--accent-primary)',
        background: 'linear-gradient(135deg, rgba(0,229,200,0.08) 0%, var(--bg-elevated) 100%)',
        boxShadow: '0 0 20px rgba(0,229,200,0.1), inset 0 0 20px rgba(0,229,200,0.03)',
      };
    }
    // upcoming
    return {
      ...base,
      borderLeftColor: 'var(--text-tertiary)',
      background: 'var(--bg-elevated)',
    };
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Week Navigation */}
      <GlassCard delay={0}>
        <div style={styles.weekNav}>
          <button style={styles.navBtn} onClick={prevWeek}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ ...styles.weekDays, overflowX: isMobile ? 'auto' : undefined, justifyContent: isMobile ? 'flex-start' : 'center' }}>
            {DAY_NAMES.map((day, i) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + i);
              const date = dayDate.getDate();
              const dayKey = dayDate.toISOString().split('T')[0];
              const daySessionCount = (sessionsByDate[dayKey] || []).length;
              const isSelected = i === selectedDayIndex;
              const isToday = dayDate.getTime() === today.getTime();
              return (
                <motion.button
                  key={day + date}
                  onClick={() => setSelectedDayIndex(i)}
                  style={{
                    ...styles.dayBtn,
                    ...(isSelected ? styles.dayBtnActive : {}),
                    padding: isMobile ? '8px 12px' : '10px 20px',
                    flexShrink: 0,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span style={styles.dayName}>{day}</span>
                  <span style={{
                    ...styles.dayDate,
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: isMobile ? '15px' : '18px',
                  }}>
                    {date}
                  </span>
                  {daySessionCount > 0 && (
                    <span style={styles.daySessionCount}>{daySessionCount}</span>
                  )}
                  {isToday && <span style={styles.todayDot} />}
                </motion.button>
              );
            })}
          </div>
          <button style={styles.navBtn} onClick={nextWeek}>
            <ChevronRight size={18} />
          </button>
        </div>
      </GlassCard>

      <div style={{ ...styles.mainContent, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Timeline */}
        <GlassCard delay={0.1} style={{ flex: 2 }}>
          <div style={styles.timelineHeader}>
            <div>
              <h3 style={styles.sectionTitle}>
                {isSelectedToday ? "Today's Timeline" : formatFullDate(selectedDate).split(',')[0] + "'s Timeline"}
              </h3>
              <p style={styles.sectionSub}>{formatFullDate(selectedDate)}</p>
            </div>
            <button style={styles.addSessionBtn} onClick={() => setShowAddModal(true)}>
              <Plus size={14} />
              Add Session
            </button>
          </div>

          {/* Vertical Time Grid */}
          {(() => {
            // Build hourly slots from 6 AM to 7 PM
            const hours: number[] = [];
            for (let h = 6; h <= 19; h++) hours.push(h);

            // Map sessions to their hour
            const sessionsByHour: Record<number, typeof displaySessions> = {};
            displaySessions.forEach(s => {
              const h = parseInt(s.time.split(':')[0]);
              if (!sessionsByHour[h]) sessionsByHour[h] = [];
              sessionsByHour[h].push(s);
            });

            return (
              <div style={styles.timeGrid}>
                {hours.map((hour, hi) => {
                  const hourSessions = sessionsByHour[hour] || [];
                  const hasSession = hourSessions.length > 0;
                  const label = hour === 0 ? '12 AM'
                    : hour < 12 ? `${hour} AM`
                    : hour === 12 ? '12 PM'
                    : `${hour - 12} PM`;
                  const isLast = hi === hours.length - 1;

                  // Dot color for this hour slot
                  const getDotColor = () => {
                    if (!hasSession) return 'var(--text-tertiary)';
                    const s = hourSessions[0];
                    if (s.status === 'completed') return 'var(--accent-success)';
                    if (s.status === 'current') return 'var(--accent-primary)';
                    return 'var(--text-tertiary)';
                  };
                  const dotColor = getDotColor();
                  const dotGlow = hasSession && (hourSessions[0].status === 'completed' || hourSessions[0].status === 'current');

                  return (
                    <div key={hour} style={styles.timeRow}>
                      {/* Time label */}
                      <div style={styles.timeLabel}>{label}</div>

                      {/* Track: dot + line */}
                      <div style={styles.trackColumn}>
                        <div style={{
                          ...styles.trackDot,
                          width: hasSession ? '10px' : '6px',
                          height: hasSession ? '10px' : '6px',
                          background: dotColor,
                          boxShadow: dotGlow ? `0 0 8px ${dotColor}` : 'none',
                        }} />
                        {!isLast && <div style={styles.trackLine} />}
                      </div>

                      {/* Session card or empty space */}
                      <div style={styles.timeSlotContent}>
                        {hourSessions.map((session, si) => {
                          const cardStyle = getSessionCardStyle(session.status);
                          return (
                            <motion.div
                              key={`${hour}-${si}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.06 + hi * 0.03 }}
                            >
                              <div style={cardStyle}>
                                <div style={styles.sessionTop}>
                                  <div style={styles.sessionInfo}>
                                    <div style={{
                                      ...styles.sessionAvatar,
                                      background: getAvatarColor(
                                        clients.find(c => c.name === session.client)?.id || 'c1'
                                      ),
                                    }}>
                                      {getInitials(session.client)}
                                    </div>
                                    <div>
                                      <div
                                        style={styles.sessionClientLink}
                                        onClick={() => {
                                          const c = clients.find(cl => cl.name === session.client);
                                          if (c) onViewClient(c.id);
                                        }}
                                      >
                                        {session.client}
                                      </div>
                                      <div style={styles.sessionMeta}>
                                        <span style={styles.sessionType}>
                                          <Dumbbell size={12} />
                                          {session.type}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div style={styles.sessionActions}>
                                    {session.status === 'completed' && <CheckCircle2 size={18} color="var(--accent-success)" />}
                                    {session.status === 'current' && (
                                      <span style={styles.liveBadge}>
                                        <span style={styles.livePulse} />
                                        IN SESSION
                                      </span>
                                    )}
                                    {(session.status === 'upcoming' || session.status === 'current') && (
                                      <>
                                        <button
                                          style={styles.sessionActionBtn}
                                          onClick={() => handleMarkCompleted(selectedKey, session.time)}
                                          title="Mark completed"
                                        >
                                          <CheckCircle2 size={15} color="var(--accent-success)" />
                                        </button>
                                        <button
                                          style={styles.sessionActionBtn}
                                          onClick={() => handleCancelSession(selectedKey, session.time)}
                                          title="Cancel session"
                                        >
                                          <XCircle size={15} color="var(--accent-danger)" />
                                        </button>
                                      </>
                                    )}
                                    {session.status === 'upcoming' && !isMobile && (
                                      <Circle size={16} color="var(--text-tertiary)" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </GlassCard>

        {/* Sidebar Stats */}
        <div style={styles.sideColumn}>
          {/* Day Summary */}
          <GlassCard delay={0.15}>
            <h3 style={styles.sectionTitle}>Day Summary</h3>
            <div style={styles.summaryStats}>
              <div style={styles.summaryItem}>
                <div style={{ ...styles.summaryIcon, background: 'var(--accent-success-dim)' }}>
                  <CheckCircle2 size={16} color="var(--accent-success)" />
                </div>
                <div>
                  <div style={styles.summaryValue}>
                    {displaySessions.filter(s => s.status === 'completed').length}
                  </div>
                  <div style={styles.summaryLabel}>Completed</div>
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={{ ...styles.summaryIcon, background: 'var(--accent-primary-dim)' }}>
                  <Clock size={16} color="var(--accent-primary)" />
                </div>
                <div>
                  <div style={styles.summaryValue}>
                    {displaySessions.filter(s => s.status === 'current').length}
                  </div>
                  <div style={styles.summaryLabel}>In Progress</div>
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={{ ...styles.summaryIcon, background: 'var(--bg-subtle-hover)' }}>
                  <Circle size={16} color="var(--text-tertiary)" />
                </div>
                <div>
                  <div style={styles.summaryValue}>
                    {displaySessions.filter(s => s.status === 'upcoming').length}
                  </div>
                  <div style={styles.summaryLabel}>Upcoming</div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Week Summary */}
          <GlassCard delay={0.18}>
            <h3 style={styles.sectionTitle}>Week Overview</h3>
            <div style={styles.weekSummary}>
              <div style={styles.weekStatRow}>
                <span style={styles.weekStatLabel}>Total Sessions</span>
                <span style={styles.weekStatValue}>{weekTotal}</span>
              </div>
              <div style={styles.weekStatRow}>
                <span style={styles.weekStatLabel}>Completed</span>
                <span style={{ ...styles.weekStatValue, color: 'var(--accent-success)' }}>{weekCompleted}</span>
              </div>
              <div style={styles.weekStatRow}>
                <span style={styles.weekStatLabel}>Remaining</span>
                <span style={{ ...styles.weekStatValue, color: 'var(--accent-primary)' }}>{weekUpcoming}</span>
              </div>
              {weekTotal > 0 && (
                <div style={styles.weekProgress}>
                  <div style={styles.weekProgressBar}>
                    <div style={{ ...styles.weekProgressFill, width: `${Math.round((weekCompleted / weekTotal) * 100)}%` }} />
                  </div>
                  <span style={styles.weekProgressLabel}>{Math.round((weekCompleted / weekTotal) * 100)}%</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Upcoming Check-ins */}
          <GlassCard delay={0.22}>
            <h3 style={styles.sectionTitle}>Upcoming Check-ins</h3>
            <div style={styles.checkinList}>
              {(() => {
                const nowMs = new Date().getTime();
                const fiveDaysMs = 5 * 86400000;
                return clients
                  .filter(c => {
                    if (!c.nextCheckIn || c.nextCheckIn === '—') return false;
                    const diff = new Date(c.nextCheckIn).getTime() - nowMs;
                    return diff > 0 && diff <= fiveDaysMs;
                  })
                  .sort((a, b) => a.nextCheckIn.localeCompare(b.nextCheckIn))
                  .map((client, i) => {
                    const daysLeft = Math.ceil((new Date(client.nextCheckIn).getTime() - nowMs) / 86400000);
                    return (
                      <motion.div
                        key={client.id}
                        style={styles.checkinItem}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.04 }}
                        onClick={() => onViewClient(client.id)}
                      >
                        <div style={{ ...styles.checkinAvatar, background: getAvatarColor(client.id) }}>
                          {getInitials(client.name)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={styles.checkinNameLink}>{client.name}</div>
                          <div style={styles.checkinDate}>{new Date(client.nextCheckIn + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        </div>
                        <div style={styles.checkinDays}>
                          {daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                        </div>
                      </motion.div>
                    );
                  });
              })()}
            </div>
          </GlassCard>

        </div>
      </div>

      {/* Add Session Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowAddModal(false); setAddAtTime(null); }}
          >
            <motion.div
              style={{ ...styles.modal, width: isMobile ? 'calc(100% - 32px)' : '400px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  {addAtTime ? `Add Session at ${formatTimeLabel(addAtTime)}` : 'Add Session'}
                </h3>
                <button style={styles.closeBtn} onClick={() => { setShowAddModal(false); setAddAtTime(null); }}>
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Client</label>
                  <select
                    value={newSession.client}
                    onChange={(e) => setNewSession(prev => ({ ...prev, client: e.target.value }))}
                    style={styles.modalSelect}
                  >
                    <option value="">Select a client...</option>
                    {clients.filter(c => c.status !== 'paused').map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Session Type</label>
                  <select
                    value={newSession.type}
                    onChange={(e) => setNewSession(prev => ({ ...prev, type: e.target.value }))}
                    style={styles.modalSelect}
                  >
                    <option value="">Select type...</option>
                    {(() => {
                      const selectedClient = clients.find(c => c.name === newSession.client);
                      const clientPrograms = selectedClient
                        ? programs.filter(p => p.clientIds.includes(selectedClient.id) && p.status === 'active')
                        : [];
                      return clientPrograms.length > 0 ? (
                        <>
                          {clientPrograms.flatMap(p =>
                            p.days.map(d => (
                              <option key={`${p.id}-${d.id}`} value={`${p.name} — ${d.name}`}>
                                {p.name} — {d.name}
                              </option>
                            ))
                          )}
                          <option disabled>──────────</option>
                        </>
                      ) : null;
                    })()}
                    <option value="Upper Body">Upper Body</option>
                    <option value="Lower Body">Lower Body</option>
                    <option value="Full Body">Full Body</option>
                    <option value="Push Day">Push Day</option>
                    <option value="Pull Day">Pull Day</option>
                    <option value="Leg Day">Leg Day</option>
                    <option value="Squat Day">Squat Day</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Recovery">Recovery</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ ...styles.modalField, flex: 1 }}>
                    <label style={styles.modalLabel}>Time</label>
                    <select
                      value={newSession.time}
                      onChange={(e) => setNewSession(prev => ({ ...prev, time: e.target.value }))}
                      style={styles.modalSelect}
                    >
                      {allTimeSlots.map(slot => (
                        <option key={slot} value={slot}>{formatTimeLabel(slot)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...styles.modalField, flex: 1 }}>
                    <label style={styles.modalLabel}>Duration</label>
                    <select
                      value={newSession.duration}
                      onChange={(e) => setNewSession(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      style={styles.modalSelect}
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={75}>1h 15m</option>
                      <option value={90}>1h 30m</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.modalCancelBtn} onClick={() => { setShowAddModal(false); setAddAtTime(null); }}>
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.modalPrimaryBtn,
                    opacity: newSession.client && newSession.type ? 1 : 0.4,
                  }}
                  onClick={handleAddSession}
                >
                  Add Session
                </button>
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
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navBtn: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDays: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    justifyContent: 'center',
  },
  dayBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    position: 'relative',
  },
  dayBtnActive: {
    background: 'var(--accent-primary-dim)',
    border: '1px solid rgba(0,229,200,0.15)',
  },
  dayName: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  dayDate: {
    fontSize: '25px',
    fontWeight: 700,
  },
  daySessionCount: {
    fontSize: '11px',
    fontWeight: 700,
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    borderRadius: '10px',
    padding: '0 5px',
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: '16px',
  },
  todayDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    position: 'absolute',
    bottom: '6px',
  },
  mainContent: {
    display: 'flex',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  sectionSub: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  addSessionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary-dim)',
    border: '1px solid rgba(0,229,200,0.15)',
    color: 'var(--accent-primary)',
    fontSize: '17px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  // ── Vertical Time Grid ──
  timeGrid: {
    display: 'flex',
    flexDirection: 'column',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'flex-start',
    minHeight: '56px',
  },
  timeLabel: {
    width: '60px',
    flexShrink: 0,
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    paddingTop: '2px',
    textAlign: 'right',
    paddingRight: '14px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  trackColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '20px',
    flexShrink: 0,
  },
  trackDot: {
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '5px',
  },
  trackLine: {
    width: '1px',
    flex: 1,
    minHeight: '40px',
    background: 'var(--bg-subtle-hover)',
    marginTop: '4px',
  },
  timeSlotContent: {
    flex: 1,
    paddingLeft: '14px',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  // ── Session cards ──
  sessionCard: {
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  sessionTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sessionAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  sessionClientLink: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  sessionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '2px',
  },
  sessionType: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  sessionTime: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  sessionDuration: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  sessionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sessionActionBtn: {
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  livePulse: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    boxShadow: '0 0 6px var(--accent-primary)',
  },
  sideColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summaryStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
  },
  summaryIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: '25px',
    fontWeight: 700,
  },
  summaryLabel: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  weekSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px',
  },
  weekStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  weekStatLabel: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  weekStatValue: {
    fontSize: '21px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
  },
  weekProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
  },
  weekProgressBar: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    background: 'var(--bg-subtle-hover)',
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'var(--accent-primary)',
    transition: 'width 0.4s ease',
  },
  weekProgressLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    fontFamily: 'var(--font-mono)',
    minWidth: '36px',
    textAlign: 'right',
  },
  checkinList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '16px',
  },
  checkinItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  checkinAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  checkinNameLink: {
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    cursor: 'pointer',
  },
  checkinDate: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  checkinDays: {
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
  },
  emptyDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '32px 0',
  },
  emptyText: {
    fontSize: '20px',
    color: 'var(--text-tertiary)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    maxWidth: '90vw',
    boxShadow: 'var(--shadow-elevated)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalLabel: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modalSelect: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  modalCancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  modalPrimaryBtn: {
    padding: '8px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
};
