import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown, ChevronUp, Send, RefreshCw, Loader2 } from 'lucide-react';
import GlassCard from './GlassCard';
import SmartCoachCard from './SmartCoachCard';
import SmartCoachModal from './SmartCoachModal';
import type { SmartCoachTrigger } from '../utils/smart-coach-engine';
import type { MessageDraft } from '../utils/autopilot-types';
import type { Client, Message, CheckIn, Invoice, WorkoutLog, WorkoutProgram } from '../types';

// ── Styles ─────────────────────────────────────────────────────

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary, #fff)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    background: `${color}20`,
    color,
  }),
  dot: (color: string) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
  }),
  expandBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-secondary, #94a3b8)',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '8px',
    width: '100%',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  sectionLabel: (color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color,
    marginTop: '16px',
    marginBottom: '8px',
  }),
  sectionLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-secondary, #94a3b8)',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    marginTop: '8px',
    marginBottom: '4px',
    borderRadius: '10px',
    background: 'rgba(0,229,200,0.06)',
    border: '1px solid rgba(0,229,200,0.12)',
  },
  actionBarInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary, #94a3b8)',
    flex: 1,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '7px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  actionBtnPrimary: {
    background: 'var(--accent, #00e5c8)',
    color: '#000',
  },
  actionBtnConfirm: {
    background: '#ef4444',
    color: '#fff',
  },
  actionBtnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-secondary, #94a3b8)',
  },
};

// ── Component ──────────────────────────────────────────────────

interface SmartCoachWidgetProps {
  clients: Client[];
  messages: Message[];
  checkIns: CheckIn[];
  invoices: Invoice[];
  workoutLogs: WorkoutLog[];
  programs: WorkoutProgram[];
  // Autopilot state (from useAutopilot hook)
  triggers: SmartCoachTrigger[];
  draftsMap: Map<string, MessageDraft>;
  drafts: MessageDraft[];
  draftsLoading: boolean;
  onDismissTrigger: (triggerId: string) => void;
  onEditDraft: (draftId: string, text: string) => void;
  onRegenerate: () => void;
  onApproveAll: () => void;
  // Messaging
  onSendMessage: (msg: Message) => void;
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  lang: 'en' | 'pl';
  isMobile?: boolean;
}

export default function SmartCoachWidget({
  clients,
  messages,
  checkIns,
  invoices,
  workoutLogs,
  triggers,
  draftsMap,
  drafts,
  draftsLoading,
  onDismissTrigger,
  onEditDraft,
  onRegenerate,
  onApproveAll,
  onSendMessage,
  onUpdateCheckIn,
  lang,
  isMobile = false,
}: SmartCoachWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalTrigger, setModalTrigger] = useState<SmartCoachTrigger | null>(null);
  const [confirmSendAll, setConfirmSendAll] = useState(false);

  // Counts
  const highCount = triggers.filter((t) => t.priority === 'high').length;
  const mediumCount = triggers.filter((t) => t.priority === 'medium').length;
  const totalCount = triggers.length;

  // Group by priority
  const highTriggers = triggers.filter((t) => t.priority === 'high');
  const mediumTriggers = triggers.filter((t) => t.priority === 'medium');
  const lowTriggers = triggers.filter((t) => t.priority === 'low');

  // Top 3 for collapsed view
  const top3 = triggers.filter((t) => t.type !== 'all-clear').slice(0, 3);

  // Is the only trigger "all-clear"?
  const isAllClear = triggers.length <= 1 && triggers[0]?.type === 'all-clear';

  // Count sendable drafts (medium + low priority)
  const sendableCount = drafts.filter(d => d.priority !== 'high').length;

  // ── Handlers ──

  const handleSend = useCallback((trigger: SmartCoachTrigger, text: string) => {
    if (!trigger.clientId) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      clientId: trigger.clientId,
      clientName: trigger.clientName || '',
      clientAvatar: '',
      text,
      timestamp: new Date().toISOString(),
      isRead: true,
      isFromCoach: true,
      deliveryStatus: 'sent',
    };
    onSendMessage(msg);
    onDismissTrigger(trigger.id);
  }, [onSendMessage, onDismissTrigger]);

  const handleOpenModal = useCallback((trigger: SmartCoachTrigger) => {
    if (trigger.type !== 'all-clear') {
      setModalTrigger(trigger);
    }
  }, []);

  const handleSendAll = useCallback(() => {
    if (!confirmSendAll) {
      setConfirmSendAll(true);
      setTimeout(() => setConfirmSendAll(false), 3000);
      return;
    }
    // Send all medium + low priority drafts
    drafts.filter(d => d.priority !== 'high').forEach(draft => {
      onSendMessage({
        id: crypto.randomUUID(),
        clientId: draft.clientId,
        clientName: draft.clientName,
        clientAvatar: '',
        text: draft.text,
        timestamp: new Date().toISOString(),
        isRead: false,
        isFromCoach: true,
      });
    });
    onApproveAll();
    setConfirmSendAll(false);
  }, [confirmSendAll, drafts, onSendMessage, onApproveAll]);

  const modalClient = modalTrigger?.clientId
    ? clients.find((c) => c.id === modalTrigger.clientId) || null
    : null;

  // ── i18n ──

  const labels = lang === 'pl' ? {
    title: 'Smart Coach',
    urgent: 'PILNE',
    thisWeek: 'TEN TYDZIEŃ',
    wins: 'WINS',
    showAll: (n: number) => `Pokaż wszystkie ${n}`,
    collapse: 'Zwiń',
    send: 'Wyślij',
    edit: 'Edytuj',
    dismiss: 'Odrzuć',
    cancel: 'Anuluj',
    open: 'Otwórz',
    replyInMessages: 'Odpowiedz w Wiadomościach',
    reviewCheckIn: 'Review check-in',
    nUrgent: (n: number) => `${n} piln${n === 1 ? 'e' : 'ych'}`,
    nThisWeek: (n: number) => `${n} na ten tydzień`,
    sendAll: (n: number) => `Wyślij wszystkie (${n})`,
    confirm: (n: number) => `Potwierdź (${n})`,
    regenerate: 'Odśwież',
    generating: 'Generuję AI drafty...',
    messagesReady: (n: number) => `${n} ${n === 1 ? 'wiadomość gotowa' : 'wiadomości gotowych'}`,
  } : {
    title: 'Smart Coach',
    urgent: 'URGENT',
    thisWeek: 'THIS WEEK',
    wins: 'WINS',
    showAll: (n: number) => `Show all ${n}`,
    collapse: 'Collapse',
    send: 'Send',
    edit: 'Edit',
    dismiss: 'Dismiss',
    cancel: 'Cancel',
    open: 'Open',
    replyInMessages: 'Reply in Messages',
    reviewCheckIn: 'Review check-in',
    nUrgent: (n: number) => `${n} urgent`,
    nThisWeek: (n: number) => `${n} this week`,
    sendAll: (n: number) => `Send All (${n})`,
    confirm: (n: number) => `Confirm (${n})`,
    regenerate: 'Regenerate',
    generating: 'Generating AI drafts...',
    messagesReady: (n: number) => `${n} ${n === 1 ? 'message' : 'messages'} ready`,
  };

  const cardTranslations = {
    send: labels.send,
    edit: labels.edit,
    dismiss: labels.dismiss,
    cancel: labels.cancel,
    open: labels.open,
    replyInMessages: labels.replyInMessages,
    reviewCheckIn: labels.reviewCheckIn,
  };

  // ── Render ──

  const renderSection = (
    sectionTriggers: SmartCoachTrigger[],
    label: string,
    color: string,
  ) => {
    if (sectionTriggers.length === 0) return null;
    return (
      <>
        <div style={styles.sectionLabel(color)}>
          <div style={styles.dot(color)} />
          {label}
          <span style={{ opacity: 0.5, fontWeight: 400 }}>({sectionTriggers.length})</span>
          <div style={styles.sectionLine} />
        </div>
        <div style={styles.cardList}>
          <AnimatePresence mode="popLayout">
            {sectionTriggers.map((trigger, i) => (
              <SmartCoachCard
                key={trigger.id}
                trigger={trigger}
                draft={draftsMap.get(trigger.id)}
                draftsLoading={draftsLoading}
                onSend={handleSend}
                onDismiss={onDismissTrigger}
                onOpenModal={handleOpenModal}
                onEditDraft={onEditDraft}
                index={i}
                t={cardTranslations}
              />
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  };

  const renderActionBar = () => {
    const hasDrafts = drafts.length > 0;
    if (!hasDrafts && !draftsLoading) return null;
    if (isAllClear) return null;

    return (
      <div style={styles.actionBar}>
        <div style={styles.actionBarInfo}>
          {draftsLoading ? (
            <>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent, #00e5c8)' }} />
              {labels.generating}
            </>
          ) : (
            <>
              <Send size={13} style={{ color: 'var(--accent, #00e5c8)' }} />
              {labels.messagesReady(drafts.length)}
            </>
          )}
        </div>
        {sendableCount > 0 && (
          <button
            onClick={handleSendAll}
            style={{
              ...styles.actionBtn,
              ...(confirmSendAll ? styles.actionBtnConfirm : styles.actionBtnPrimary),
            }}
          >
            <Send size={12} />
            {confirmSendAll ? labels.confirm(sendableCount) : labels.sendAll(sendableCount)}
          </button>
        )}
        <button
          onClick={onRegenerate}
          style={{ ...styles.actionBtn, ...styles.actionBtnSecondary }}
        >
          <RefreshCw size={12} />
          {labels.regenerate}
        </button>
      </div>
    );
  };

  return (
    <>
    <GlassCard delay={0.15} style={isMobile ? { padding: '16px' } : undefined}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>
            <Zap size={18} color="var(--accent, #00e5c8)" />
            {labels.title}
          </h3>
          {!isAllClear && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {highCount > 0 && (
                <span style={styles.badge('#ef4444')}>
                  {labels.nUrgent(highCount)}
                </span>
              )}
              {mediumCount > 0 && (
                <span style={styles.badge('#f59e0b')}>
                  {labels.nThisWeek(mediumCount)}
                </span>
              )}
            </div>
          )}
        </div>
        {!isAllClear && totalCount > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary, #64748b)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>

      {/* Action bar: Send All + Regenerate — always visible when drafts exist */}
      {renderActionBar()}

      {/* All clear state */}
      {isAllClear && (
        <div style={styles.emptyText}>
          {triggers[0]?.insightText ||
            (lang === 'pl'
              ? 'Wszystko ogarnięte — Twoi klienci są na dobrej drodze'
              : 'All caught up — your clients are on track')}
        </div>
      )}

      {/* Collapsed view: top 3 compact cards */}
      {!isAllClear && !isExpanded && (
        <>
          <div style={{ ...styles.cardList, marginTop: '8px' }}>
            {top3.map((trigger, i) => (
              <SmartCoachCard
                key={trigger.id}
                trigger={trigger}
                draft={draftsMap.get(trigger.id)}
                draftsLoading={draftsLoading}
                onSend={handleSend}
                onDismiss={onDismissTrigger}
                onOpenModal={handleOpenModal}
                onEditDraft={onEditDraft}
                compact
                index={i}
                t={cardTranslations}
              />
            ))}
          </div>
          {totalCount > 3 && (
            <button
              style={styles.expandBtn}
              onClick={() => setIsExpanded(true)}
            >
              {labels.showAll(totalCount)}
              <ChevronDown size={14} />
            </button>
          )}
        </>
      )}

      {/* Expanded view: full list grouped by priority */}
      {!isAllClear && isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {renderSection(highTriggers, labels.urgent, '#ef4444')}
          {renderSection(mediumTriggers, labels.thisWeek, '#f59e0b')}
          {renderSection(lowTriggers, labels.wins, '#22c55e')}

          <button
            style={styles.expandBtn}
            onClick={() => setIsExpanded(false)}
          >
            {labels.collapse}
            <ChevronUp size={14} />
          </button>
        </motion.div>
      )}

    </GlassCard>

      {/* Smart Coach Modal */}
      {modalTrigger && modalClient && (
        <SmartCoachModal
          trigger={modalTrigger}
          client={modalClient}
          messages={messages}
          checkIns={checkIns}
          invoices={invoices}
          workoutLogs={workoutLogs}
          onClose={() => setModalTrigger(null)}
          onSendMessage={onSendMessage}
          onUpdateCheckIn={onUpdateCheckIn}
          onDismiss={onDismissTrigger}
          lang={lang}
          isMobile={isMobile}
        />
      )}
    </>
  );
}
