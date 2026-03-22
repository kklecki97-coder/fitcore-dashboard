import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Edit3, Send, User } from 'lucide-react';
import { getInitials, getAvatarColor } from '../data';
import type { MessageDraft } from '../utils/autopilot-types';

interface AutopilotDraftCardProps {
  draft: MessageDraft;
  onApprove: (draftId: string) => void;
  onSkip: (draftId: string) => void;
  onEdit: (draftId: string, text: string) => void;
  isMobile: boolean;
}

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const priorityLabels: Record<string, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export default function AutopilotDraftCard({ draft, onApprove, onSkip, onEdit, isMobile }: AutopilotDraftCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(draft.text);

  const handleSaveEdit = () => {
    onEdit(draft.id, editText);
    setEditing(false);
  };

  const handleApprove = () => {
    if (editing) {
      onEdit(draft.id, editText);
    }
    onApprove(draft.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
      style={styles.card}
    >
      {/* Header: avatar + name + trigger context + priority badge */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{
            ...styles.avatar,
            background: getAvatarColor(draft.clientName),
          }}>
            {getInitials(draft.clientName) || <User size={14} />}
          </div>
          <div>
            <div style={styles.clientName}>{draft.clientName}</div>
            <div style={styles.context}>{draft.context}</div>
          </div>
        </div>
        <div style={{
          ...styles.priorityBadge,
          background: priorityColors[draft.priority] + '20',
          color: priorityColors[draft.priority],
          borderColor: priorityColors[draft.priority] + '40',
        }}>
          {priorityLabels[draft.priority]}
        </div>
      </div>

      {/* Draft text */}
      {editing ? (
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          style={styles.textarea}
          rows={3}
          autoFocus
        />
      ) : (
        <div style={styles.draftText}>"{draft.text}"</div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        {editing ? (
          <>
            <button onClick={handleSaveEdit} style={{ ...styles.btn, ...styles.btnApprove }}>
              <Check size={14} /> Save
            </button>
            <button onClick={() => { setEditing(false); setEditText(draft.text); }} style={{ ...styles.btn, ...styles.btnSkip }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={handleApprove} style={{ ...styles.btn, ...styles.btnApprove }}>
              <Send size={14} /> {isMobile ? '' : 'Send'}
            </button>
            <button onClick={() => setEditing(true)} style={{ ...styles.btn, ...styles.btnEdit }}>
              <Edit3 size={14} /> {isMobile ? '' : 'Edit'}
            </button>
            <button onClick={() => onSkip(draft.id)} style={{ ...styles.btn, ...styles.btnSkip }}>
              <X size={14} /> {isMobile ? '' : 'Skip'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
  clientName: {
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  context: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  priorityBadge: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid',
    flexShrink: 0,
  },
  draftText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    lineHeight: '1.5',
    padding: '8px 10px',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-end',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s ease',
  },
  btnApprove: {
    background: 'var(--accent-primary)',
    color: '#000',
  },
  btnEdit: {
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
  },
  btnSkip: {
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-tertiary)',
  },
};
