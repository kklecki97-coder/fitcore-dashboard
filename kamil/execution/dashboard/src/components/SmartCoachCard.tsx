import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck, Moon, MessageCircleWarning, TrendingDown, AlertTriangle,
  Calendar, Dumbbell, Clock, Receipt, UserPlus, PauseCircle,
  Trophy, Flame, Target, CheckCircle2, HeartPulse,
  Send, Pencil, X, ExternalLink,
} from 'lucide-react';
import { getInitials, getAvatarColor } from '../data';
import type { SmartCoachTrigger } from '../utils/smart-coach-engine';

// ── Icon map ───────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ size?: number; color?: string }>> = {
  CalendarCheck, Moon, MessageCircleWarning, TrendingDown, AlertTriangle,
  Calendar, Dumbbell, Clock, Receipt, UserPlus, PauseCircle,
  Trophy, Flame, Target, CheckCircle2, HeartPulse,
};

// ── Styles ─────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const styles = {
  card: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  colorBar: (priority: string) => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    background: priorityColors[priority] || '#666',
    borderRadius: '3px 0 0 3px',
  }),
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    background: 'rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary, #fff)',
    cursor: 'pointer',
  },
  insightText: {
    fontSize: '13px',
    color: 'var(--text-secondary, #94a3b8)',
    marginTop: '2px',
    lineHeight: 1.4,
  },
  draftBlock: {
    marginTop: '8px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.06)',
    fontSize: '13px',
    color: 'var(--text-secondary, #94a3b8)',
    lineHeight: 1.5,
    fontStyle: 'italic' as const,
  },
  textarea: {
    width: '100%',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid var(--accent, #00e5c8)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: 'var(--text-primary, #fff)',
    lineHeight: 1.5,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    minHeight: '60px',
    marginTop: '8px',
  },
  actions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    justifyContent: 'flex-end' as const,
  },
  btn: (variant: 'send' | 'edit' | 'dismiss' | 'link') => ({
    display: 'inline-flex',
    alignItems: 'center' as const,
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
    background:
      variant === 'send' ? 'var(--accent, #00e5c8)' :
      variant === 'link' ? 'rgba(0,229,200,0.15)' :
      'rgba(255,255,255,0.06)',
    color:
      variant === 'send' ? '#000' :
      variant === 'link' ? 'var(--accent, #00e5c8)' :
      variant === 'dismiss' ? '#ef4444' :
      'var(--text-secondary, #94a3b8)',
  }),
};

// ── Component ──────────────────────────────────────────────────

interface SmartCoachCardProps {
  trigger: SmartCoachTrigger;
  onSend: (trigger: SmartCoachTrigger, text: string) => void;
  onDismiss: (triggerId: string) => void;
  onOpenModal: (trigger: SmartCoachTrigger) => void;
  compact?: boolean;
  index?: number;
  t: {
    send: string;
    edit: string;
    dismiss: string;
    cancel?: string;
    replyInMessages: string;
    reviewCheckIn: string;
    open: string;
  };
}

export default function SmartCoachCard({
  trigger,
  onSend,
  onDismiss,
  onOpenModal,
  compact = false,
  index = 0,
  t,
}: SmartCoachCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(trigger.draftText || '');
  const IconComp = ICON_MAP[trigger.icon];

  const handleSend = () => {
    const text = isEditing ? editText : trigger.draftText;
    if (text) {
      onSend(trigger, text);
    }
  };

  const handleEdit = () => {
    setEditText(trigger.draftText || '');
    setIsEditing(true);
  };

  // ── Compact mode (collapsed widget) ──
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 + index * 0.04 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.02)',
          cursor: trigger.clientId ? 'pointer' : 'default',
        }}
        onClick={() => onOpenModal(trigger)}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: priorityColors[trigger.priority],
            flexShrink: 0,
          }}
        />
        {trigger.clientId && (
          <div
            style={{
              ...styles.avatar,
              width: '24px',
              height: '24px',
              fontSize: '10px',
              background: getAvatarColor(trigger.clientId),
            }}
          >
            {getInitials(trigger.clientName || '')}
          </div>
        )}
        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary, #94a3b8)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <strong style={{ color: 'var(--text-primary, #fff)', fontWeight: 500 }}>
            {trigger.clientName}
          </strong>
          {trigger.clientName ? ' — ' : ''}
          {trigger.clientName
            ? trigger.insightText.replace(`${trigger.clientName} `, '').replace(`${trigger.clientName}'s `, '').replace(`${trigger.clientName}: `, '').replace(`${trigger.clientName} —`, '').replace(`${trigger.clientName},`, '').trim()
            : trigger.insightText}
        </span>
      </motion.div>
    );
  }

  // ── Full mode (expanded widget) ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
      transition={{ delay: 0.05 + index * 0.03 }}
      style={styles.card}
    >
      <div style={styles.colorBar(trigger.priority)} />

      {trigger.clientId ? (
        <div
          style={{
            ...styles.avatar,
            background: getAvatarColor(trigger.clientId),
            cursor: 'pointer',
          }}
          onClick={() => onOpenModal(trigger)}
        >
          {getInitials(trigger.clientName || '')}
        </div>
      ) : (
        <div style={styles.iconWrap}>
          {IconComp && <IconComp size={18} color="var(--accent, #00e5c8)" />}
        </div>
      )}

      <div style={styles.body}>
        {trigger.clientName && (
          <div
            style={styles.clientName}
            onClick={() => onOpenModal(trigger)}
          >
            {trigger.clientName}
          </div>
        )}
        <div style={styles.insightText}>
          {trigger.clientName
            ? trigger.insightText
                .replace(`${trigger.clientName} — `, '')
                .replace(`${trigger.clientName}'s `, '')
                .replace(`${trigger.clientName}: `, '')
                .replace(`${trigger.clientName} `, '')
                .replace(`${trigger.clientName},`, '')
                .trim()
            : trigger.insightText}
        </div>

        {/* Draft block */}
        {trigger.draftText && !isEditing && (
          <div style={styles.draftBlock}>"{trigger.draftText}"</div>
        )}

        {/* Edit textarea */}
        {isEditing && (
          <textarea
            style={styles.textarea}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
        )}

        {/* Action buttons */}
        <div style={styles.actions}>
          {trigger.actionType === 'review' && (
            <button
              style={styles.btn('link')}
              onClick={() => onOpenModal(trigger)}
            >
              <CalendarCheck size={12} />
              {t.reviewCheckIn}
            </button>
          )}

          {trigger.actionType === 'message' && !trigger.draftText && (
            <button
              style={styles.btn('link')}
              onClick={() => onOpenModal(trigger)}
            >
              <ExternalLink size={12} />
              {t.replyInMessages}
            </button>
          )}

          {/* Open modal button for triggers without draft */}
          {trigger.actionType === 'view' && (
            <button
              style={styles.btn('link')}
              onClick={() => onOpenModal(trigger)}
            >
              <ExternalLink size={12} />
              {t.open}
            </button>
          )}

          {trigger.draftText && (
            <>
              {!isEditing && (
                <button style={styles.btn('edit')} onClick={handleEdit}>
                  <Pencil size={12} />
                  {t.edit}
                </button>
              )}
              {isEditing && (
                <button style={styles.btn('edit')} onClick={() => setIsEditing(false)}>
                  <X size={12} />
                  {t.cancel || 'Cancel'}
                </button>
              )}
              <button style={styles.btn('send')} onClick={handleSend}>
                <Send size={12} />
                {t.send}
              </button>
            </>
          )}

          <button style={styles.btn('dismiss')} onClick={() => onDismiss(trigger.id)}>
            <X size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
