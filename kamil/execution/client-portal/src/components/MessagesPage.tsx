import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Message } from '../types';

interface MessagesPageProps {
  messages: Message[];
  onSendMessage: (msg: Message) => void;
  coachName: string;
  clientId: string;
  clientName: string;
}

export default function MessagesPage({ messages, onSendMessage, coachName, clientId, clientName }: MessagesPageProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: `msg-client-${Date.now()}`,
      clientId,
      clientName,
      clientAvatar: '',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
      isFromCoach: false,
      channel: 'whatsapp',
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div style={styles.page}>
      {/* Chat Header */}
      <div style={styles.chatHeader}>
        <div style={styles.coachAvatar}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>
            {coachName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <div style={styles.coachName}>{coachName}</div>
          <div style={styles.onlineStatus}>
            <span style={styles.onlineDot} />
            Online
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
            {group.msgs.map((msg, i) => (
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
                  <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputWrap}>
        <input
          style={styles.input}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message your coach…"
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
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#07090e',
  },
  coachName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  onlineStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
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
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-elevated)',
    padding: '4px 12px',
    borderRadius: '10px',
  },
  msgRow: {
    display: 'flex',
    marginBottom: '4px',
  },
  msgBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
  },
  msgText: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  msgTime: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
    display: 'block',
    textAlign: 'right',
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
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
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
