import { useState, useRef, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft, X, MessageSquare, Check } from 'lucide-react';
import GlassCard from './GlassCard';
import { ChannelIcon, CHANNEL_COLORS, CHANNEL_LABELS } from './ChannelIcons';
import { getInitials, getAvatarColor } from '../data';
import type { Client, Message, MessageChannel } from '../types';

// ── Delivery status checkmarks ──
const DeliveryCheck = ({ status, channelColor }: { status?: Message['deliveryStatus']; channelColor?: string }) => {
  if (!status || status === 'sending') {
    return <span style={{ display: 'flex', alignItems: 'center', opacity: 0.4 }}><Check size={12} /></span>;
  }
  if (status === 'sent') {
    return <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}><Check size={12} /></span>;
  }
  const color = status === 'read' ? (channelColor || 'var(--accent-primary)') : 'var(--text-tertiary)';
  return (
    <span style={{ display: 'flex', alignItems: 'center', color, marginLeft: '-4px' }}>
      <Check size={12} style={{ marginRight: '-6px' }} />
      <Check size={12} />
    </span>
  );
};

// ── Typing indicator ──
const TypingIndicator = () => (
  <motion.div
    style={styles.typingBubble}
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div style={styles.typingDots}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={styles.typingDot}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
    <span style={styles.typingText}>typing...</span>
  </motion.div>
);

// ── Message templates ──
interface MessageTemplate {
  text: string;
  category: 'motivation' | 'checkin' | 'reminder' | 'onboarding';
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { text: 'Great session today! Keep it up!', category: 'motivation' },
  { text: "That's a new PR! Celebrate that win.", category: 'motivation' },
  { text: 'Consistency is paying off. Proud of you!', category: 'motivation' },
  { text: 'How are you feeling today?', category: 'checkin' },
  { text: 'How did the session go? Any pain?', category: 'checkin' },
  { text: "How's nutrition been this week?", category: 'checkin' },
  { text: "Don't forget to log your meals today", category: 'reminder' },
  { text: 'Rest day — recovery is part of the process', category: 'reminder' },
  { text: 'Check-in is due this week. Please submit.', category: 'reminder' },
  { text: 'Welcome to FitCore! Ready to start?', category: 'onboarding' },
  { text: "I've set up your first program. Check it out!", category: 'onboarding' },
];

const TEMPLATE_CATEGORIES: { key: 'all' | MessageTemplate['category']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'onboarding', label: 'Onboarding' },
];

// ── Helpers ──
function getConversationChannel(msgs: Message[]): MessageChannel {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (!msgs[i].isFromCoach && msgs[i].channel) return msgs[i].channel!;
  }
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].channel) return msgs[i].channel!;
  }
  return 'telegram';
}

function formatRelativeTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getSuggestedTemplate(lastMsg: string): MessageTemplate | null {
  const lower = lastMsg.toLowerCase();
  if (lower.includes('pr') || lower.includes('record') || lower.includes('personal best')) {
    return MESSAGE_TEMPLATES.find(t => t.text.includes('PR')) || null;
  }
  if (lower.includes('pain') || lower.includes('hurt') || lower.includes('sore')) {
    return MESSAGE_TEMPLATES.find(t => t.text.includes('pain')) || null;
  }
  if (lower.includes('missed') || lower.includes('skip')) {
    return MESSAGE_TEMPLATES.find(t => t.text.includes('Consistency')) || null;
  }
  return null;
}

// ── Component ──
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
  const [replyChannel, setReplyChannel] = useState<MessageChannel>('telegram');
  const [templateCategory, setTemplateCategory] = useState<'all' | MessageTemplate['category']>('all');
  const [isClientTyping, setIsClientTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeConversation = messages.filter(m => m.clientId === selectedClient);
  const activeClient = clients.find(c => c.id === selectedClient);
  const activeChannel = getConversationChannel(activeConversation);

  // Sync reply channel when switching conversations
  useEffect(() => {
    setReplyChannel(activeChannel);
  }, [selectedClient, activeChannel]);

  // Auto-scroll on conversation switch or new message
  useEffect(() => {
    scrollToBottom();
  }, [selectedClient, messages]);

  // Mock typing indicator — show briefly when switching to conversations with unread
  useEffect(() => {
    setIsClientTyping(false);
    const clientMsgs = messages.filter(m => m.clientId === selectedClient);
    const hasUnread = clientMsgs.some(m => !m.isRead && !m.isFromCoach);
    if (hasUnread) {
      const timer = setTimeout(() => setIsClientTyping(true), 500);
      const hideTimer = setTimeout(() => setIsClientTyping(false), 3500);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, [selectedClient, messages]);

  // Group messages by client, sorted by most recent
  const clientIds = [...new Set(messages.map(m => m.clientId))];
  const conversationClients = clientIds.map(id => {
    const client = clients.find(c => c.id === id)!;
    const clientMessages = messages.filter(m => m.clientId === id);
    const lastMsg = clientMessages[clientMessages.length - 1];
    const unread = clientMessages.filter(m => !m.isRead && !m.isFromCoach).length;
    const channel = getConversationChannel(clientMessages);
    return { ...client, lastMessage: lastMsg, unreadCount: unread, channel };
  }).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

  const filteredConversations = conversationClients
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(c => channelFilter === 'all' || c.channel === channelFilter);

  // Channel counts for filter tabs
  const channelCounts: Record<string, number> = { all: conversationClients.length };
  for (const conv of conversationClients) {
    channelCounts[conv.channel] = (channelCounts[conv.channel] || 0) + 1;
  }

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
      channel: replyChannel,
      deliveryStatus: 'sent',
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

  // Online status
  const isRecentlyActive = activeClient?.lastActive?.includes('hour') ||
    activeClient?.lastActive?.includes('minute') ||
    activeClient?.lastActive?.includes('just');

  // Template filtering
  const visibleTemplates = templateCategory === 'all'
    ? MESSAGE_TEMPLATES
    : MESSAGE_TEMPLATES.filter(t => t.category === templateCategory);

  // Contextual suggestion
  const lastClientMsg = [...activeConversation].reverse().find(m => !m.isFromCoach);
  const suggestedTemplate = lastClientMsg ? getSuggestedTemplate(lastClientMsg.text) : null;

  // Date separators helper
  let lastDateLabel = '';

  return (
    <div style={styles.page}>
      {/* ── Conversations List ── */}
      {(!isMobile || !showChat) && (
        <GlassCard delay={0} style={{ ...styles.sidebar, width: isMobile ? '100%' : '340px' }}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Inbox</h3>
            <span style={styles.convCount}>{filteredConversations.length}</span>
          </div>

          {/* Channel Filter Tabs */}
          <div style={styles.filterRow}>
            {filterTabs.map(tab => {
              const isActive = channelFilter === tab.key;
              const count = channelCounts[tab.key] || 0;
              const tabColor = tab.key !== 'all' ? CHANNEL_COLORS[tab.key] : undefined;
              return (
                <button
                  key={tab.key}
                  onClick={() => setChannelFilter(tab.key)}
                  style={{
                    ...styles.filterTab,
                    background: isActive ? (tabColor ? `${tabColor}15` : 'var(--accent-primary-dim)') : 'transparent',
                    color: isActive ? (tabColor || 'var(--accent-primary)') : 'var(--text-tertiary)',
                    borderColor: isActive ? (tabColor ? `${tabColor}30` : 'rgba(0,229,200,0.15)') : 'transparent',
                  }}
                >
                  {tab.key !== 'all' && <ChannelIcon channel={tab.key} size={11} />}
                  {tab.label}
                  <span style={{ fontSize: '12px', opacity: 0.6 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={styles.searchBox}>
            <Search size={15} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Conversation List */}
          <div style={styles.convList}>
            {filteredConversations.length === 0 ? (
              <div style={styles.emptyState}>
                <Search size={28} color="var(--text-tertiary)" />
                <div style={styles.emptyTitle}>No conversations found</div>
                <div style={styles.emptySub}>Try a different search or channel filter</div>
              </div>
            ) : (
              filteredConversations.map((conv, i) => {
                const isUnread = conv.unreadCount > 0;
                const isSelected = selectedClient === conv.id;
                return (
                  <motion.button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      ...styles.convItem,
                      background: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                      borderColor: isSelected ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                      borderLeft: isUnread && !isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ background: isSelected ? 'var(--accent-primary-dim)' : 'var(--bg-subtle)' }}
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
                        <span style={{ ...styles.convName, fontWeight: isUnread ? 700 : 600 }}>{conv.name}</span>
                        {conv.channel && (
                          <span style={{ ...styles.channelBadge, color: CHANNEL_COLORS[conv.channel], background: `${CHANNEL_COLORS[conv.channel]}15` }}>
                            {CHANNEL_LABELS[conv.channel]}
                          </span>
                        )}
                      </div>
                      <div style={{ ...styles.convPreview, color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isUnread ? 500 : 400 }}>
                        {conv.lastMessage.isFromCoach && <span style={{ color: 'var(--accent-primary)' }}>You: </span>}
                        {conv.lastMessage.text}
                      </div>
                    </div>
                    <div style={styles.convRight}>
                      <span style={{ ...styles.convTime, color: isUnread ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                        {formatRelativeTime(conv.lastMessage.timestamp)}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span style={styles.unreadBadge}>{conv.unreadCount}</span>
                      )}
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </GlassCard>
      )}

      {/* ── Chat Area ── */}
      {(!isMobile || showChat) && activeClient ? (
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
              {getInitials(activeClient.name)}
            </div>
            <div>
              <div style={styles.chatName}>{activeClient.name}</div>
              <div style={styles.chatStatus}>
                <motion.span
                  style={{
                    ...styles.onlineDot,
                    background: isRecentlyActive ? 'var(--accent-success)' : 'var(--text-tertiary)',
                  }}
                  animate={isRecentlyActive ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {isRecentlyActive ? activeClient.lastActive : `Last seen ${activeClient.lastActive}`}
              </div>
            </div>
          </div>
          <div style={styles.chatHeaderRight}>
            <span style={{ ...styles.planBadge, color: activeClient.plan === 'Elite' ? 'var(--accent-warm)' : 'var(--accent-secondary)' }}>
              {activeClient.plan}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={styles.messagesArea}>
          {activeConversation.length === 0 ? (
            <div style={styles.emptyState}>
              <Send size={32} color="var(--text-tertiary)" />
              <div style={styles.emptyTitle}>Start the conversation</div>
              <div style={styles.emptySub}>Send the first message to {activeClient.name}</div>
            </div>
          ) : (
            <>
              {activeConversation.map((msg: Message, i: number) => {
                const msgDate = formatDateLabel(msg.timestamp);
                const showSeparator = msgDate !== lastDateLabel;
                lastDateLabel = msgDate;
                const msgChannel = msg.channel;

                return (
                  <Fragment key={msg.id}>
                    {showSeparator && (
                      <div style={styles.dateSeparator}>
                        <div style={styles.dateLine} />
                        <span style={styles.dateLabel}>{msgDate}</span>
                        <div style={styles.dateLine} />
                      </div>
                    )}
                    <motion.div
                      style={{
                        ...styles.message,
                        alignSelf: msg.isFromCoach ? 'flex-end' : 'flex-start',
                        flexDirection: msg.isFromCoach ? 'row-reverse' : 'row',
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
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
                          {msg.isFromCoach && (
                            <DeliveryCheck status={msg.deliveryStatus} channelColor={msgChannel ? CHANNEL_COLORS[msgChannel] : undefined} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Fragment>
                );
              })}
              {isClientTyping && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          {/* Channel Switcher */}
          <div style={styles.channelSwitcher}>
            <div style={styles.channelSwitchRow}>
              {(['telegram', 'whatsapp', 'email', 'instagram'] as MessageChannel[]).map(ch => {
                const isActive = replyChannel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setReplyChannel(ch)}
                    style={{
                      ...styles.channelSwitchBtn,
                      background: isActive ? `${CHANNEL_COLORS[ch]}15` : 'transparent',
                      borderColor: isActive ? `${CHANNEL_COLORS[ch]}40` : 'var(--glass-border)',
                    }}
                    title={`Reply via ${CHANNEL_LABELS[ch]}`}
                  >
                    <ChannelIcon channel={ch} size={14} />
                  </button>
                );
              })}
            </div>
            <span style={{ ...styles.replyHint, color: CHANNEL_COLORS[replyChannel] }}>
              Replying via {CHANNEL_LABELS[replyChannel]}
            </span>
          </div>

          {/* Suggested template */}
          {suggestedTemplate && (
            <motion.div
              style={styles.suggestedRow}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span style={styles.suggestedLabel}>Suggested:</span>
              <button
                onClick={() => setNewMessage(suggestedTemplate.text)}
                style={styles.suggestedBtn}
              >
                {suggestedTemplate.text}
              </button>
            </motion.div>
          )}

          {/* Template category tabs */}
          <div style={styles.templateCatRow}>
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setTemplateCategory(cat.key)}
                style={{
                  ...styles.templateCatBtn,
                  color: templateCategory === cat.key ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  borderBottomColor: templateCategory === cat.key ? 'var(--accent-primary)' : 'transparent',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Template pills */}
          <div style={styles.templateRow}>
            {visibleTemplates.map(tpl => (
              <motion.button
                key={tpl.text}
                onClick={() => setNewMessage(tpl.text)}
                style={styles.templateBtn}
                whileTap={{ scale: 0.95 }}
              >
                {tpl.text}
              </motion.button>
            ))}
          </div>

          {/* Input */}
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
      ) : (!isMobile || showChat) ? (
        <div style={styles.chatArea}>
          <div style={styles.emptyState}>
            <MessageSquare size={48} color="var(--text-tertiary)" />
            <div style={styles.emptyTitle}>Select a conversation</div>
            <div style={styles.emptySub}>Choose a client from the left to start messaging</div>
            <div style={styles.emptyChannelRow}>
              {(['telegram', 'whatsapp', 'email', 'instagram'] as MessageChannel[]).map(ch => (
                <span key={ch} style={{ ...styles.emptyChannelIcon, color: CHANNEL_COLORS[ch] }}>
                  <ChannelIcon channel={ch} size={16} />
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
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
    fontSize: '22px',
    fontWeight: 600,
  },
  convCount: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-subtle-hover)',
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
    fontSize: '14px',
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
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    flex: 1,
  },
  searchClearBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
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
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
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
    fontSize: '18px',
    fontWeight: 600,
  },
  channelBadge: {
    fontSize: '13px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '8px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase' as const,
  },
  convPreview: {
    fontSize: '17px',
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
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  unreadBadge: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontSize: '14px',
    fontWeight: 700,
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Chat Area ──
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
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  chatName: {
    fontSize: '21px',
    fontWeight: 600,
  },
  chatStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  onlineDot: {
    display: 'inline-block',
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
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'var(--bg-subtle-hover)',
    letterSpacing: '0.5px',
  },
  // ── Messages Area ──
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  dateSeparator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    alignSelf: 'center',
    width: '100%',
  },
  dateLine: {
    flex: 1,
    height: '1px',
    background: 'var(--glass-border)',
  },
  dateLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
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
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    flexShrink: 0,
    marginTop: '4px',
  },
  msgBubble: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
  },
  msgText: {
    fontSize: '18px',
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
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
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  // ── Typing Indicator ──
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    alignSelf: 'flex-start',
    maxWidth: '120px',
  },
  typingDots: {
    display: 'flex',
    gap: '3px',
    alignItems: 'center',
  },
  typingDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--text-secondary)',
  },
  typingText: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  // ── Input Area ──
  inputArea: {
    padding: '12px 24px 16px',
    borderTop: '1px solid var(--glass-border)',
  },
  channelSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  channelSwitchRow: {
    display: 'flex',
    gap: '4px',
  },
  channelSwitchBtn: {
    width: '32px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  replyHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  suggestedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
    padding: '4px 0',
  },
  suggestedLabel: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    flexShrink: 0,
  },
  suggestedBtn: {
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  templateCatRow: {
    display: 'flex',
    gap: '2px',
    marginBottom: '4px',
    overflowX: 'auto',
  },
  templateCatBtn: {
    padding: '2px 8px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
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
    background: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s, color 0.15s',
    flexShrink: 0,
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
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
  },
  sendBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
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
  // ── Empty States ──
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '10px',
    padding: '40px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  emptySub: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: 1.5,
  },
  emptyChannelRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  emptyChannelIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
  },
};
