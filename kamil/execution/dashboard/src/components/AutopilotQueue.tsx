import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, Send, RefreshCw, Loader2 } from 'lucide-react';
import GlassCard from './GlassCard';
import AutopilotDraftCard from './AutopilotDraftCard';
import { useLang } from '../i18n';
import type { MessageDraft } from '../utils/autopilot-types';
import type { Message } from '../types';

interface AutopilotQueueProps {
  drafts: MessageDraft[];
  loading: boolean;
  onApprove: (draftId: string) => void;
  onSkip: (draftId: string) => void;
  onEdit: (draftId: string, text: string) => void;
  onSendMessage: (msg: Message) => void;
  onApproveAll: () => void;
  onRegenerate: () => void;
  isMobile: boolean;
}

export default function AutopilotQueue({
  drafts, loading, onApprove, onSkip, onEdit, onSendMessage,
  onApproveAll, onRegenerate, isMobile,
}: AutopilotQueueProps) {
  const { lang } = useLang();
  const [expanded, setExpanded] = useState(true);
  const [confirmSendAll, setConfirmSendAll] = useState(false);

  if (drafts.length === 0 && !loading) return null;

  const highPriority = drafts.filter(d => d.priority === 'high');
  const mediumPriority = drafts.filter(d => d.priority === 'medium');
  const lowPriority = drafts.filter(d => d.priority === 'low');
  const sendableCount = mediumPriority.length + lowPriority.length;

  const handleApproveAndSend = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;

    // Send the message
    const msg: Message = {
      id: crypto.randomUUID(),
      clientId: draft.clientId,
      clientName: draft.clientName,
      clientAvatar: '',
      text: draft.text,
      timestamp: new Date().toISOString(),
      isRead: false,
      isFromCoach: true,
    };
    onSendMessage(msg);
    onApprove(draftId);
  };

  const handleSendAll = () => {
    if (!confirmSendAll) {
      setConfirmSendAll(true);
      setTimeout(() => setConfirmSendAll(false), 3000);
      return;
    }
    // Send all medium + low
    [...mediumPriority, ...lowPriority].forEach(draft => {
      const msg: Message = {
        id: crypto.randomUUID(),
        clientId: draft.clientId,
        clientName: draft.clientName,
        clientAvatar: '',
        text: draft.text,
        timestamp: new Date().toISOString(),
        isRead: false,
        isFromCoach: true,
      };
      onSendMessage(msg);
    });
    onApproveAll();
    setConfirmSendAll(false);
  };

  const renderSection = (title: string, sectionDrafts: MessageDraft[]) => {
    if (sectionDrafts.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={styles.sectionLabel}>{title}</div>
        <AnimatePresence>
          {sectionDrafts.map(draft => (
            <AutopilotDraftCard
              key={draft.id}
              draft={draft}
              onApprove={handleApproveAndSend}
              onSkip={onSkip}
              onEdit={onEdit}
              isMobile={isMobile}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <GlassCard delay={0.1}>
      {/* Header */}
      <div
        style={styles.header}
        onClick={() => setExpanded(e => !e)}
        role="button"
        tabIndex={0}
      >
        <div style={styles.headerLeft}>
          <div style={styles.iconWrap}>
            {loading ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} /> : <Bot size={18} style={{ color: 'var(--accent-primary)' }} />}
          </div>
          <div>
            <div style={styles.title}>
              {lang === 'pl' ? 'Autopilot' : 'Autopilot'}
            </div>
            <div style={styles.subtitle}>
              {loading
                ? (lang === 'pl' ? 'Generuję wiadomości...' : 'Generating messages...')
                : (lang === 'pl'
                    ? `${drafts.length} ${drafts.length === 1 ? 'wiadomość' : 'wiadomości'} do wysłania`
                    : `${drafts.length} ${drafts.length === 1 ? 'message' : 'messages'} ready`
                  )
              }
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {!loading && drafts.length > 0 && (
            <span style={styles.badge}>{drafts.length}</span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} />
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={styles.body}>
              {renderSection(
                lang === 'pl' ? 'PILNE' : 'HIGH PRIORITY',
                highPriority,
              )}
              {renderSection(
                lang === 'pl' ? 'ŚREDNIE' : 'MEDIUM',
                mediumPriority,
              )}
              {renderSection(
                lang === 'pl' ? 'NISKIE' : 'LOW',
                lowPriority,
              )}

              {/* Footer actions */}
              {drafts.length > 0 && (
                <div style={styles.footer}>
                  {sendableCount > 0 && (
                    <button
                      onClick={handleSendAll}
                      style={{
                        ...styles.footerBtn,
                        ...(confirmSendAll ? styles.footerBtnConfirm : styles.footerBtnPrimary),
                      }}
                    >
                      <Send size={14} />
                      {confirmSendAll
                        ? (lang === 'pl' ? `Potwierdź (${sendableCount})` : `Confirm (${sendableCount})`)
                        : (lang === 'pl' ? `Wyślij wszystkie (${sendableCount})` : `Send All (${sendableCount})`)
                      }
                    </button>
                  )}
                  <button onClick={onRegenerate} style={{ ...styles.footerBtn, ...styles.footerBtnSecondary }}>
                    <RefreshCw size={14} />
                    {lang === 'pl' ? 'Odśwież' : 'Regenerate'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--accent-primary)15',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginTop: '1px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    background: 'var(--accent-primary)',
    color: '#000',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '2px 8px',
    minWidth: '20px',
    textAlign: 'center',
  },
  body: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
  },
  footer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-primary)',
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s ease',
  },
  footerBtnPrimary: {
    background: 'var(--accent-primary)',
    color: '#000',
  },
  footerBtnConfirm: {
    background: '#ef4444',
    color: '#fff',
  },
  footerBtnSecondary: {
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
  },
};
