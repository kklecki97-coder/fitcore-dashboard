import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft } from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import type { Client, Message } from '../types';

interface MessagesPageProps {
  isMobile?: boolean;
  clients: Client[];
  messages: Message[];
  onSendMessage: (msg: Message) => void;
}

export default function MessagesPage({ isMobile = false, clients, messages, onSendMessage }: MessagesPageProps) {
  const [selectedClient, setSelectedClient] = useState<string>('c1');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeConversation = messages.filter(m => m.clientId === selectedClient);
  const activeClient = clients.find(c => c.id === selectedClient);

  // Scroll on conversation switch or new message
  useEffect(() => {
    scrollToBottom();
  }, [selectedClient, messages]);

  // Group messages by client
  const clientIds = [...new Set(messages.map(m => m.clientId))];
  const conversationClients = clientIds.map(id => {
    const client = clients.find(c => c.id === id)!;
    const clientMessages = messages.filter(m => m.clientId === id);
    const lastMsg = clientMessages[clientMessages.length - 1];
    const unread = clientMessages.filter(m => !m.isRead && !m.isFromCoach).length;
    return { ...client, lastMessage: lastMsg, unreadCount: unread };
  });

  const filteredConversations = conversationClients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleSend = () => {
    if (!newMessage.trim() || !activeClient) return;
    const msg: Message = {
      id: `m-${Date.now()}`,
      clientId: selectedClient,
      clientName: activeClient.name,
      clientAvatar: '',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      isFromCoach: true,
    };
    onSendMessage(msg);
    setNewMessage('');
  };

  const handleSelectConversation = (id: string) => {
    setSelectedClient(id);
    if (isMobile) setShowChat(true);
  };

  return (
    <div style={styles.page}>
      {/* Conversations List */}
      {(!isMobile || !showChat) && (
        <GlassCard delay={0} style={{ ...styles.sidebar, width: isMobile ? '100%' : '340px' }}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Conversations</h3>
            <span style={styles.convCount}>{clientIds.length}</span>
          </div>

          <div style={styles.searchBox}>
            <Search size={15} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.convList}>
            {filteredConversations.map((conv, i) => (
              <motion.button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                style={{
                  ...styles.convItem,
                  background: selectedClient === conv.id ? 'var(--accent-primary-dim)' : 'transparent',
                  borderColor: selectedClient === conv.id ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ background: selectedClient === conv.id ? 'var(--accent-primary-dim)' : 'rgba(255,255,255,0.03)' }}
              >
                <div style={{ ...styles.convAvatar, background: getAvatarColor(conv.id) }}>
                  {getInitials(conv.name)}
                </div>
                <div style={styles.convInfo}>
                  <div style={styles.convName}>{conv.name}</div>
                  <div style={styles.convPreview}>
                    {conv.lastMessage.isFromCoach && <span style={{ color: 'var(--accent-primary)' }}>You: </span>}
                    {conv.lastMessage.text}
                  </div>
                </div>
                <div style={styles.convRight}>
                  <span style={styles.convTime}>{formatTime(conv.lastMessage.timestamp)}</span>
                  {conv.unreadCount > 0 && (
                    <span style={styles.unreadBadge}>{conv.unreadCount}</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Chat Area */}
      {(!isMobile || showChat) && (
      <div style={styles.chatArea}>
        {/* Chat Header */}
        <div style={styles.chatHeader}>
          <div style={styles.chatHeaderLeft}>
            {isMobile && (
              <button onClick={() => setShowChat(false)} style={styles.backBtn}>
                <ArrowLeft size={18} />
              </button>
            )}
            <div style={{ ...styles.chatAvatar, background: getAvatarColor(selectedClient) }}>
              {activeClient && getInitials(activeClient.name)}
            </div>
            <div>
              <div style={styles.chatName}>{activeClient?.name}</div>
              <div style={styles.chatStatus}>
                <span style={styles.onlineDot} />
                {activeClient?.lastActive}
              </div>
            </div>
          </div>
          <div style={styles.chatHeaderRight}>
            <span style={{ ...styles.planBadge, color: activeClient?.plan === 'Elite' ? 'var(--accent-warm)' : 'var(--accent-secondary)' }}>
              {activeClient?.plan}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={styles.messagesArea}>
          {activeConversation.map((msg: Message, i: number) => (
            <motion.div
              key={msg.id}
              style={{
                ...styles.message,
                alignSelf: msg.isFromCoach ? 'flex-end' : 'flex-start',
                flexDirection: msg.isFromCoach ? 'row-reverse' : 'row',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {!msg.isFromCoach && (
                <div style={{ ...styles.msgAvatar, background: getAvatarColor(msg.clientId) }}>
                  {getInitials(msg.clientName)}
                </div>
              )}
              <div style={{
                ...styles.msgBubble,
                background: msg.isFromCoach ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
                borderColor: msg.isFromCoach ? 'rgba(0,229,200,0.15)' : 'var(--glass-border)',
              }}>
                <p style={styles.msgText}>{msg.text}</p>
                <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          <div style={styles.templateRow}>
            {[
              'Great session today!',
              'How are you feeling?',
              'Don\'t forget to log your meals',
              'Rest day reminder',
            ].map((tpl) => (
              <button
                key={tpl}
                onClick={() => setNewMessage(tpl)}
                style={styles.templateBtn}
              >
                {tpl}
              </button>
            ))}
          </div>
          <div style={styles.inputRow}>
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={styles.messageInput}
            />
            <button
              onClick={handleSend}
              style={{
                ...styles.sendBtn,
                opacity: newMessage.trim() ? 1 : 0.4,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    gap: '0',
    height: 'calc(100vh - var(--header-height))',
    overflow: 'hidden',
  },
  sidebar: {
    width: '340px',
    borderRadius: '0',
    borderRight: '1px solid var(--glass-border)',
    borderTop: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    flexShrink: 0,
    overflow: 'hidden',
    boxShadow: 'none',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    marginBottom: '16px',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 600,
  },
  convCount: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    margin: '0 16px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    flex: 1,
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 8px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    transition: 'background 0.15s',
  },
  convAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#07090e',
    flexShrink: 0,
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
  },
  convName: {
    fontSize: '13px',
    fontWeight: 600,
  },
  convPreview: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '2px',
  },
  convRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  convTime: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  unreadBadge: {
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '10px',
    fontWeight: 700,
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--glass-border)',
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  chatAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: '#07090e',
  },
  chatName: {
    fontSize: '15px',
    fontWeight: 600,
  },
  chatStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-success)',
  },
  chatHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  planBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.05)',
    letterSpacing: '0.5px',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  message: {
    display: 'flex',
    gap: '10px',
    maxWidth: '70%',
  },
  msgAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#07090e',
    flexShrink: 0,
    marginTop: '4px',
  },
  msgBubble: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
  },
  msgText: {
    fontSize: '13px',
    lineHeight: 1.5,
    margin: 0,
  },
  msgTime: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
    display: 'block',
  },
  inputArea: {
    padding: '16px 24px',
    borderTop: '1px solid var(--glass-border)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
  },
  messageInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
  },
  sendBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'var(--accent-primary)',
    border: 'none',
    color: '#07090e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  templateRow: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '8px',
    flexWrap: 'nowrap',
  },
  templateBtn: {
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s, color 0.15s',
    flexShrink: 0,
  },
};
