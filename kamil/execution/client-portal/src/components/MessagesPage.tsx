import { useState, useRef, useEffect } from 'react';
import { Send, CheckCheck, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../i18n';
import type { Message } from '../types';

interface MessagesPageProps {
  messages: Message[];
  onSendMessage: (msg: Message) => void;
  coachName: string;
  clientId: string;
  clientName: string;
  coachTyping?: boolean;
}

export default function MessagesPage({ messages, onSendMessage, coachName, clientId, clientName, coachTyping = false }: MessagesPageProps) {
  const { t, lang } = useLang();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      clientId,
      clientName,
      clientAvatar: '',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
      isFromCoach: false,
    };
    onSendMessage(msg);
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  sorted.forEach(msg => {
    const date = msg.timestamp.split('T')[0];
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date, msgs: [msg] });
    }
  });

  const locale = lang === 'pl' ? 'pl-PL' : 'en-US';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return t.messages.today;
    if (isYesterday) return t.messages.yesterday;
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div style={styles.page}>
      {/* Chat Header */}
      <div style={styles.chatHeader}>
        <div style={styles.coachAvatar}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>
            {coachName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <div style={styles.coachName}>{coachName}</div>
          <div style={styles.onlineStatus}>
            <span style={styles.onlineDot} />
            {t.messages.online}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesList}>
        {grouped.map(group => (
          <div key={group.date}>
            <div style={styles.dateDivider}>
              <span style={styles.datePill}>{formatDate(group.date)}</span>
            </div>
            {group.msgs.map((msg, i) => {
              // Workout completion notification
              if (msg.type === 'workout-complete' && msg.workoutSummary) {
                const s = msg.workoutSummary;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, type: 'spring', stiffness: 260, damping: 22 }}
                    style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}
                  >
                    <div style={workoutNotifStyles.card}>
                      {/* Trophy + Title centered */}
                      <div style={workoutNotifStyles.topSection}>
                        <div style={workoutNotifStyles.iconWrap}>
                          <Trophy size={22} color="#07090e" />
                        </div>
                        <div style={workoutNotifStyles.title}>{t.program.workoutComplete}</div>
                        <div style={workoutNotifStyles.dayName}>{s.dayName}</div>
                      </div>

                      {/* 2x2 stat grid */}
                      <div style={workoutNotifStyles.statsGrid}>
                        <div style={workoutNotifStyles.statCell}>
                          <span style={workoutNotifStyles.statValue}>{s.duration}</span>
                          <span style={workoutNotifStyles.statLabel}>{t.program.duration}</span>
                        </div>
                        <div style={workoutNotifStyles.statCell}>
                          <span style={workoutNotifStyles.statValue}>{s.exercises}</span>
                          <span style={workoutNotifStyles.statLabel}>{t.program.exercises}</span>
                        </div>
                        <div style={workoutNotifStyles.statCell}>
                          <span style={workoutNotifStyles.statValue}>{s.sets}</span>
                          <span style={workoutNotifStyles.statLabel}>{t.program.sets}</span>
                        </div>
                        {s.volume && (
                          <div style={workoutNotifStyles.statCell}>
                            <span style={{ ...workoutNotifStyles.statValue, color: 'var(--accent-primary)' }}>{s.volume} kg</span>
                            <span style={workoutNotifStyles.statLabel}>{t.program.volume}</span>
                          </div>
                        )}
                      </div>

                      <div style={workoutNotifStyles.time}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </motion.div>
                );
              }

              // Regular text message
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    ...styles.msgRow,
                    justifyContent: msg.isFromCoach ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div style={{
                    ...styles.msgBubble,
                    background: msg.isFromCoach ? 'var(--bg-elevated)' : 'var(--accent-primary-dim)',
                    borderColor: msg.isFromCoach ? 'var(--glass-border)' : 'rgba(0,229,200,0.2)',
                  }}>
                    <p style={styles.msgText}>{msg.text}</p>
                    <div style={styles.msgMeta}>
                      <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                      {!msg.isFromCoach && msg.isRead && (
                        <CheckCheck size={13} color="var(--accent-primary)" style={{ marginLeft: '4px', flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
        {/* Typing indicator */}
        {coachTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}
          >
            <div style={{
              ...styles.msgBubble,
              background: 'var(--bg-elevated)',
              borderColor: 'var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
            }}>
              <div style={styles.typingDots}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    style={styles.typingDot}
                  />
                ))}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                {t.messages.coachTyping}
              </span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputWrap}>
        <input
          style={styles.input}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.messages.placeholder}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: newMessage.trim() ? 1 : 0.4,
          }}
          onClick={handleSend}
          disabled={!newMessage.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
  coachAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#07090e',
  },
  coachName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  onlineStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--accent-success)',
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-success)',
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dateDivider: {
    textAlign: 'center',
    margin: '12px 0',
  },
  datePill: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-elevated)',
    padding: '5px 14px',
    borderRadius: '10px',
  },
  msgRow: {
    display: 'flex',
    marginBottom: '4px',
  },
  msgBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
  },
  msgText: {
    fontSize: '15px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  msgMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: '4px',
    gap: '2px',
  },
  msgTime: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  typingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '16px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
    animation: 'typingBounce 0.6s ease-in-out infinite alternate',
  },
  inputWrap: {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))',
    borderTop: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  sendBtn: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};

const workoutNotifStyles: Record<string, React.CSSProperties> = {
  card: {
    width: '80%',
    maxWidth: '300px',
    background: 'rgba(0,229,200,0.04)',
    border: '1px solid rgba(0,229,200,0.15)',
    borderRadius: '16px',
    padding: '20px 16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  topSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  dayName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    width: '100%',
  },
  statCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '10px 0',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
  },
  statValue: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
  },
  time: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
};
