import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft, Mail } from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import type { Client, Message, MessageChannel } from '../types';

// ── Inline SVG channel icons ──
const TelegramIcon = ({ size = 12, color = '#29ABE2' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
);

const WhatsAppIcon = ({ size = 12, color = '#25D366' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M17.47 14.38c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.14 4.98 4.41.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.08 1.72-.7 1.96-1.38.25-.68.25-1.26.17-1.38-.07-.12-.27-.2-.56-.34zM12.05 21.5c-1.8 0-3.56-.49-5.1-1.41l-.36-.22-3.78 1 1.02-3.7-.24-.38A9.43 9.43 0 012.5 12.05c0-5.24 4.27-9.5 9.52-9.5 2.54 0 4.93.99 6.72 2.78a9.46 9.46 0 012.78 6.73c0 5.25-4.27 9.52-9.52 9.52l.05-.08zM12.05.5C5.68.5.5 5.68.5 12.05c0 2.04.53 4.02 1.54 5.77L.5 23.5l5.85-1.53a11.47 11.47 0 005.7 1.53c6.37 0 11.55-5.18 11.55-11.55C23.6 5.58 18.42.5 12.05.5z"/>
  </svg>
);

const EmailIcon = ({ size = 12, color = '#EA4335' }: { size?: number; color?: string }) => (
  <Mail size={size} color={color} style={{ flexShrink: 0 }} />
);

const InstagramIcon = ({ size = 12, color = '#E1306C' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const CHANNEL_COLORS: Record<MessageChannel, string> = {
  telegram: '#29ABE2',
  whatsapp: '#25D366',
  email: '#EA4335',
  instagram: '#E1306C',
};

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagram: 'Instagram',
};

function ChannelIcon({ channel, size = 12 }: { channel: MessageChannel; size?: number }) {
  if (channel === 'telegram') return <TelegramIcon size={size} />;
  if (channel === 'whatsapp') return <WhatsAppIcon size={size} />;
  if (channel === 'email') return <EmailIcon size={size} />;
  if (channel === 'instagram') return <InstagramIcon size={size} />;
  return null;
}

function getConversationChannel(msgs: Message[]): MessageChannel {
  // Use the most recent non-coach message's channel, or fallback to last message
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (!msgs[i].isFromCoach && msgs[i].channel) return msgs[i].channel!;
  }
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].channel) return msgs[i].channel!;
  }
  return 'telegram';
}

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
  const [channelFilter, setChannelFilter] = useState<'all' | MessageChannel>('all');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeConversation = messages.filter(m => m.clientId === selectedClient);
  const activeClient = clients.find(c => c.id === selectedClient);
  const activeChannel = getConversationChannel(activeConversation);

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
    const channel = getConversationChannel(clientMessages);
    return { ...client, lastMessage: lastMsg, unreadCount: unread, channel };
  });

  const filteredConversations = conversationClients
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(c => channelFilter === 'all' || c.channel === channelFilter);

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
      channel: activeChannel,
    };
    onSendMessage(msg);
    setNewMessage('');
  };

  const handleSelectConversation = (id: string) => {
    setSelectedClient(id);
    if (isMobile) setShowChat(true);
  };

  const filterTabs: { key: 'all' | MessageChannel; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'telegram', label: 'Telegram' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'instagram', label: 'Instagram' },
  ];

  return (
    <div style={styles.page}>
      {/* Conversations List */}
      {(!isMobile || !showChat) && (
        <GlassCard delay={0} style={{ ...styles.sidebar, width: isMobile ? '100%' : '340px' }}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Conversations</h3>
            <span style={styles.convCount}>{filteredConversations.length}</span>
          </div>

          {/* Channel Filter Tabs */}
          <div style={styles.filterRow}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setChannelFilter(tab.key)}
                style={{
                  ...styles.filterTab,
                  background: channelFilter === tab.key ? 'var(--accent-primary-dim)' : 'transparent',
                  color: channelFilter === tab.key ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  borderColor: channelFilter === tab.key ? 'rgba(0,229,200,0.15)' : 'transparent',
                }}
              >
                {tab.key !== 'all' && (
                  <ChannelIcon channel={tab.key} size={11} />
                )}
                {tab.label}
              </button>
            ))}
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
                <div style={{ position: 'relative' }}>
                  <div style={{ ...styles.convAvatar, background: getAvatarColor(conv.id) }}>
                    {getInitials(conv.name)}
                  </div>
                  {conv.channel && (
                    <div style={{
                      ...styles.channelDot,
                      background: CHANNEL_COLORS[conv.channel],
                      boxShadow: `0 0 6px ${CHANNEL_COLORS[conv.channel]}40`,
                    }}>
                      <ChannelIcon channel={conv.channel} size={10} />
                    </div>
                  )}
                </div>
                <div style={styles.convInfo}>
                  <div style={styles.convNameRow}>
                    <span style={styles.convName}>{conv.name}</span>
                    {conv.channel && (
                      <span style={{ ...styles.channelBadge, color: CHANNEL_COLORS[conv.channel], background: `${CHANNEL_COLORS[conv.channel]}15` }}>
                        {CHANNEL_LABELS[conv.channel]}
                      </span>
                    )}
                  </div>
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
            {activeChannel && (
              <span style={{
                ...styles.channelHeaderBadge,
                color: CHANNEL_COLORS[activeChannel],
                background: `${CHANNEL_COLORS[activeChannel]}15`,
                borderColor: `${CHANNEL_COLORS[activeChannel]}30`,
              }}>
                <ChannelIcon channel={activeChannel} size={13} />
                {CHANNEL_LABELS[activeChannel]}
              </span>
            )}
            <span style={{ ...styles.planBadge, color: activeClient?.plan === 'Elite' ? 'var(--accent-warm)' : 'var(--accent-secondary)' }}>
              {activeClient?.plan}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={styles.messagesArea}>
          {activeConversation.map((msg: Message, i: number) => {
            const msgChannel = msg.channel;
            return (
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
                  <div style={styles.msgMeta}>
                    {msgChannel && (
                      <span style={{ ...styles.msgChannelTag, color: CHANNEL_COLORS[msgChannel] }}>
                        <ChannelIcon channel={msgChannel} size={10} />
                      </span>
                    )}
                    <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          {/* Reply channel hint */}
          {activeChannel && (
            <div style={{
              ...styles.replyHint,
              color: CHANNEL_COLORS[activeChannel],
            }}>
              <ChannelIcon channel={activeChannel} size={12} />
              <span>Replying via {CHANNEL_LABELS[activeChannel]}</span>
            </div>
          )}
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
    marginBottom: '12px',
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
  filterRow: {
    display: 'flex',
    gap: '4px',
    padding: '0 16px',
    marginBottom: '12px',
    overflowX: 'auto',
  },
  filterTab: {
    padding: '4px 10px',
    borderRadius: '16px',
    border: '1px solid transparent',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
  channelDot: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg-card)',
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
  },
  convNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  convName: {
    fontSize: '13px',
    fontWeight: 600,
  },
  channelBadge: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '8px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase' as const,
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
  channelHeaderBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid',
    letterSpacing: '0.3px',
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
  msgMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '4px',
  },
  msgChannelTag: {
    display: 'flex',
    alignItems: 'center',
  },
  msgTime: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
  },
  inputArea: {
    padding: '16px 24px',
    borderTop: '1px solid var(--glass-border)',
  },
  replyHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 500,
    marginBottom: '8px',
    opacity: 0.8,
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
