import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, Plus,
  ChevronLeft, ChevronRight, Dumbbell, X,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { scheduleToday, clients, getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFullDate(date: Date): string {
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  return `${dayName}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function SchedulePage() {
  const isMobile = useIsMobile();
  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const diff = Math.floor((today.getTime() - getWeekStart(today).getTime()) / 86400000);
    return Math.min(Math.max(diff, 0), 6);
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ client: '', type: '', time: '09:00' });
  const [localSessions, setLocalSessions] = useState(scheduleToday);

  // Compute selected date
  const selectedDate = new Date(weekStart);
  selectedDate.setDate(selectedDate.getDate() + selectedDayIndex);

  // Check if selected date is today (for showing real session data)
  const isSelectedToday = selectedDate.getTime() === today.getTime();

  // Sessions to show — only show data for today (mock data day)
  const displaySessions = isSelectedToday ? localSessions : [];

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
    setLocalSessions(prev => [...prev, {
      time: newSession.time,
      client: newSession.client,
      type: newSession.type,
      status: 'upcoming' as const,
    }].sort((a, b) => a.time.localeCompare(b.time)));
    setNewSession({ client: '', type: '', time: '09:00' });
    setShowAddModal(false);
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

          <div style={styles.timeline}>
            {hours.map((hour) => {
              const timeStr = `${hour.toString().padStart(2, '0')}:00`;
              const session = displaySessions.find(s => s.time === timeStr);

              return (
                <div key={hour} style={styles.timeRow}>
                  <div style={{ ...styles.timeLabel, width: isMobile ? '48px' : '60px' }}>
                    <span style={styles.timeLabelText}>
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </span>
                  </div>
                  <div style={styles.timeLine}>
                    <div style={getTimeLineDotStyle(!!session, session?.status)} />
                    <div style={styles.timeLineBar} />
                  </div>
                  <div style={styles.timeSlot}>
                    {session ? (
                      <motion.div
                        style={{
                          ...styles.sessionCard,
                          borderLeftColor: session.status === 'completed' ? 'var(--accent-success)' :
                                          session.status === 'current' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                          opacity: session.status === 'completed' ? 0.6 : 1,
                        }}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: session.status === 'completed' ? 0.6 : 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
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
                              <div style={styles.sessionClient}>{session.client}</div>
                              <div style={styles.sessionType}>
                                <Dumbbell size={12} />
                                {session.type}
                              </div>
                            </div>
                          </div>
                          {session.status === 'completed' && <CheckCircle2 size={18} color="var(--accent-success)" />}
                          {session.status === 'current' && (
                            <span style={styles.liveBadge}>
                              <span style={styles.livePulse} />
                              IN SESSION
                            </span>
                          )}
                          {session.status === 'upcoming' && <Circle size={18} color="var(--text-tertiary)" />}
                        </div>
                      </motion.div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {!isSelectedToday && displaySessions.length === 0 && (
            <div style={styles.emptyDay}>
              <p style={styles.emptyText}>No sessions scheduled</p>
              <button style={styles.addSessionBtn} onClick={() => setShowAddModal(true)}>
                <Plus size={14} />
                Add Session
              </button>
            </div>
          )}
        </GlassCard>

        {/* Sidebar Stats */}
        <div style={styles.sideColumn}>
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
                <div style={{ ...styles.summaryIcon, background: 'rgba(255,255,255,0.05)' }}>
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

          <GlassCard delay={0.2}>
            <h3 style={styles.sectionTitle}>Upcoming Check-ins</h3>
            <div style={styles.checkinList}>
              {clients
                .filter(c => c.nextCheckIn !== '—')
                .sort((a, b) => a.nextCheckIn.localeCompare(b.nextCheckIn))
                .slice(0, 5)
                .map((client, i) => (
                  <motion.div
                    key={client.id}
                    style={styles.checkinItem}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                  >
                    <div style={{ ...styles.checkinAvatar, background: getAvatarColor(client.id) }}>
                      {getInitials(client.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.checkinName}>{client.name}</div>
                      <div style={styles.checkinDate}>{client.nextCheckIn}</div>
                    </div>
                    <div style={styles.checkinDays}>
                      {Math.max(0, Math.ceil((new Date(client.nextCheckIn).getTime() - Date.now()) / 86400000))}d
                    </div>
                  </motion.div>
                ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Session Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              style={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Add Session</h3>
                <button style={styles.closeBtn} onClick={() => setShowAddModal(false)}>
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

                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Time</label>
                  <select
                    value={newSession.time}
                    onChange={(e) => setNewSession(prev => ({ ...prev, time: e.target.value }))}
                    style={styles.modalSelect}
                  >
                    {hours.map(h => {
                      const val = `${h.toString().padStart(2, '0')}:00`;
                      const label = h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`;
                      return <option key={h} value={val}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.modalCancelBtn} onClick={() => setShowAddModal(false)}>
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function getTimeLineDotStyle(hasSession: boolean, status?: string): React.CSSProperties {
  return {
    width: hasSession ? '10px' : '6px',
    height: hasSession ? '10px' : '6px',
    borderRadius: '50%',
    background: hasSession
      ? (status === 'completed' ? 'var(--accent-success)' : status === 'current' ? 'var(--accent-primary)' : 'var(--text-tertiary)')
      : 'rgba(255,255,255,0.08)',
    boxShadow: status === 'current' ? '0 0 12px var(--accent-primary)' : 'none',
    flexShrink: 0,
    marginTop: '6px',
  };
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
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  dayDate: {
    fontSize: '18px',
    fontWeight: 700,
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
    fontSize: '15px',
    fontWeight: 600,
  },
  sectionSub: {
    fontSize: '12px',
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
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'flex-start',
    minHeight: '52px',
  },
  timeLabel: {
    width: '60px',
    flexShrink: 0,
    paddingTop: '2px',
  },
  timeLabelText: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  timeLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '20px',
    flexShrink: 0,
  },
  timeLineBar: {
    width: '1px',
    flex: 1,
    minHeight: '30px',
    background: 'rgba(255,255,255,0.06)',
  },
  timeSlot: {
    flex: 1,
    paddingLeft: '12px',
    paddingBottom: '4px',
  },
  sessionCard: {
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
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
    fontSize: '11px',
    fontWeight: 700,
    color: '#07090e',
  },
  sessionClient: {
    fontSize: '13px',
    fontWeight: 600,
  },
  sessionType: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
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
    background: 'rgba(255,255,255,0.02)',
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
    fontSize: '18px',
    fontWeight: 700,
  },
  summaryLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
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
  },
  checkinAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    color: '#07090e',
  },
  checkinName: {
    fontSize: '13px',
    fontWeight: 500,
  },
  checkinDate: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  checkinDays: {
    fontSize: '13px',
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
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    width: '400px',
    maxWidth: '90vw',
    zIndex: 101,
    boxShadow: 'var(--shadow-elevated)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '16px',
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
    fontSize: '12px',
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
    fontSize: '14px',
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
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  modalPrimaryBtn: {
    padding: '8px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
};
