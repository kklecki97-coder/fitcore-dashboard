import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Save, Edit3, Calendar, Check, Flag, Star,
  Smile, Frown, Meh, SmilePlus, Angry,
} from 'lucide-react';
import { getInitials, getAvatarColor } from '../data';
import { getLocale } from '../lib/locale';
import { formatCurrency } from '../lib/locale';
import { useLang } from '../i18n';
import type { Client, WorkoutProgram, CheckIn, CoachingPlan } from '../types';

type ModalType = 'message' | 'editPlan' | 'notes' | 'logMetrics' | 'assignProgram' | 'checkIn' | 'viewCheckIn' | null;

interface ClientDetailModalsProps {
  client: Client;
  programs: WorkoutProgram[];
  plans: CoachingPlan[];
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  selectedCheckIn: CheckIn | null;
  setSelectedCheckIn: (ci: CheckIn | null) => void;
  isMobile: boolean;
  onSendMessage: (text: string) => void;
  onSavePlan: (plan: string, status: 'active' | 'paused' | 'pending') => void;
  onSaveNotes: (text: string) => void;
  onToggleKeyNote: (index: number) => void;
  onToggleProgram: (programId: string) => void;
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  flashSaved: (label: string) => void;
}

export default function ClientDetailModals({
  client,
  programs,
  plans,
  activeModal,
  setActiveModal,
  selectedCheckIn,
  setSelectedCheckIn,
  isMobile,
  onSendMessage,
  onSavePlan,
  onSaveNotes,
  onToggleKeyNote,
  onToggleProgram,
  onUpdateCheckIn,
  flashSaved,
}: ClientDetailModalsProps) {
  const { lang, t } = useLang();
  const dateLocale = getLocale(lang);

  const [messageText, setMessageText] = useState('');
  const [editPlan, setEditPlan] = useState<string>(client.plan);
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'pending'>(client.status);
  const [editNotes, setEditNotes] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const statusLabelMap: Record<string, string> = {
    active: t.clients.active,
    paused: t.clients.paused,
    pending: t.clients.pending,
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    onSendMessage(messageText.trim());
    setMessageText('');
    setActiveModal(null);
  };

  const handleSavePlan = () => {
    onSavePlan(editPlan, editStatus);
    setActiveModal(null);
  };

  const handleSaveNotes = () => {
    if (!editNotes.trim()) return;
    onSaveNotes(editNotes.trim());
    setEditNotes('');
    setShowNoteInput(false);
  };

  // Reset state when modal opens
  // (editPlan/editStatus sync with client when modal opens externally)

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveModal(null)}
          style={styles.overlayCenter}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            style={{ ...styles.modalCentered, width: isMobile ? 'calc(100% - 32px)' : '480px' }}
          >
            {/* Modal Header */}
            <div style={{ ...styles.modalHeader, ...(isMobile ? { padding: '14px 16px 12px' } : {}) }}>
              <h3 style={{ ...styles.modalTitle, ...(isMobile ? { fontSize: '16px' } : {}) }}>
                {activeModal === 'message' && t.clientDetail.sendMessage}
                {activeModal === 'editPlan' && t.clientDetail.editPlanStatus}
                {activeModal === 'notes' && t.clientDetail.notes}
                {activeModal === 'assignProgram' && t.clientDetail.assignProgram}
                {activeModal === 'viewCheckIn' && t.clientDetail.checkInDetails}
              </h3>
              <button onClick={() => setActiveModal(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Message Modal */}
            {activeModal === 'message' && (
              <div style={{ ...styles.modalBody, ...(isMobile ? { padding: '14px 16px 16px', gap: '12px' } : {}) }}>
                <div style={styles.modalRecipient}>
                  <span style={styles.modalLabel}>{t.clientDetail.toLabel}</span>
                  <div style={styles.recipientChip}>
                    <div style={{ ...styles.miniAvatar, background: getAvatarColor(client.id) }}>
                      {getInitials(client.name)}
                    </div>
                    {client.name}
                  </div>
                </div>
                <textarea
                  placeholder={t.clientDetail.newMessage}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={styles.modalTextarea}
                  rows={5}
                  autoFocus
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>{t.clientDetail.cancel}</button>
                  <button
                    onClick={handleSendMessage}
                    style={{ ...styles.modalPrimaryBtn, opacity: messageText.trim() ? 1 : 0.5 }}
                  >
                    <Send size={14} />
                    {t.clientDetail.send}
                  </button>
                </div>
              </div>
            )}

            {/* Edit Plan Modal */}
            {activeModal === 'editPlan' && (
              <div style={{ ...styles.modalBody, ...(isMobile ? { padding: '14px 16px 16px', gap: '12px' } : {}) }}>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.clientDetail.plan}</span>
                  <div style={styles.modalPlanPicker}>
                    {(plans.filter(p => p.isActive).length > 0
                      ? plans.filter(p => p.isActive).map(p => {
                          const isActive = editPlan === p.name;
                          const cycleSuffix = p.billingCycle === 'monthly' ? '/mo' : p.billingCycle === 'weekly' ? '/wk' : '';
                          return (
                            <button
                              key={p.id}
                              onClick={() => setEditPlan(p.name as Client['plan'])}
                              style={{
                                ...styles.modalPlanOption,
                                ...(isActive ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'var(--bg-subtle)' } : {}),
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: '16px' }}>{p.name}</div>
                              <div style={{ fontSize: '14px', opacity: 0.7 }}>{formatCurrency(p.price, lang)}{cycleSuffix}</div>
                            </button>
                          );
                        })
                      : <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '10px 12px', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', width: '100%' }}>
                          {t.clientDetail.createPlansHint}
                        </div>
                    )}
                  </div>
                </div>

                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.clientDetail.status}</span>
                  <div style={styles.modalStatusPicker}>
                    {(['active', 'paused'] as const).map((s) => {
                      const isActive = editStatus === s;
                      const colorMap: Record<string, string> = { active: 'var(--accent-success)', paused: 'var(--accent-warm)' };
                      return (
                        <button
                          key={s}
                          onClick={() => setEditStatus(s)}
                          style={{
                            ...styles.modalStatusOption,
                            ...(isActive ? { borderColor: colorMap[s], color: colorMap[s], background: 'var(--bg-subtle)' } : {}),
                          }}
                        >
                          {statusLabelMap[s]}
                        </button>
                      );
                    })}
                    {editStatus === 'paused' && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                        {t.clientDetail.pausedNoInvoices}
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>{t.clientDetail.cancel}</button>
                  <button onClick={handleSavePlan} style={styles.modalPrimaryBtn}>
                    <Save size={14} />
                    {t.clientDetail.save}
                  </button>
                </div>
              </div>
            )}

            {/* Notes Modal */}
            {activeModal === 'notes' && (
              <div style={{ ...styles.modalBody, ...(isMobile ? { padding: '14px 16px 16px', gap: '12px' } : {}) }}>
                {/* Add Note toggle */}
                {!showNoteInput ? (
                  <button
                    onClick={() => setShowNoteInput(true)}
                    style={styles.addNoteBtn}
                  >
                    <Edit3 size={14} />
                    {t.clientDetail.addNote}
                  </button>
                ) : (
                  <div style={styles.modalField}>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      style={styles.modalTextarea}
                      rows={4}
                      placeholder={t.clientDetail.writeNotePlaceholder}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setShowNoteInput(false); setEditNotes(''); }}
                        style={styles.modalCancelBtn}
                      >
                        {t.clientDetail.cancel}
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        style={{ ...styles.modalPrimaryBtn, opacity: editNotes.trim() ? 1 : 0.5 }}
                      >
                        <Save size={14} />
                        {t.clientDetail.save}
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes History */}
                {client.notesHistory && client.notesHistory.length > 0 ? (
                  <div style={styles.notesHistorySection}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ ...styles.modalLabel, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t.clientDetail.historyCount(client.notesHistory.length)}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <Star size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                        {client.notesHistory.filter(n => n.isKey).length}/2 {t.clientDetail.keyNote.toLowerCase()}
                      </span>
                    </div>
                    <div style={styles.notesHistoryList}>
                      {client.notesHistory.map((nh, i) => {
                        const keyCount = client.notesHistory.filter(n => n.isKey).length;
                        return (
                          <div key={i} style={{
                            ...styles.notesHistoryItem,
                            ...(nh.isKey ? { borderColor: 'var(--accent-warm)', background: 'rgba(245, 158, 11, 0.04)' } : {}),
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={styles.notesHistoryDate}>
                                  {new Date(nh.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {nh.isKey && (
                                  <span style={styles.keyBadge}>
                                    <Star size={9} /> {t.clientDetail.keyBadge}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => onToggleKeyNote(i)}
                                style={{
                                  ...styles.keyToggleBtn,
                                  ...(nh.isKey
                                    ? { color: 'var(--accent-warm)', borderColor: 'var(--accent-warm)' }
                                    : keyCount >= 2
                                      ? { opacity: 0.3, cursor: 'not-allowed' }
                                      : {}
                                  ),
                                }}
                                title={nh.isKey ? t.clientDetail.removeKeyNote : keyCount >= 2 ? t.clientDetail.maxKeyNotes : t.clientDetail.markAsKeyNote}
                              >
                                <Star size={12} fill={nh.isKey ? 'var(--accent-warm)' : 'none'} />
                              </button>
                            </div>
                            <div style={styles.notesHistoryText}>{nh.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '18px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
                    {t.clientDetail.noNotesYet}
                  </p>
                )}
              </div>
            )}

            {/* Assign Program Modal */}
            {activeModal === 'assignProgram' && (
              <div style={{ ...styles.modalBody, ...(isMobile ? { padding: '14px 16px 16px', gap: '12px' } : {}) }}>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: 0 }}>
                  {t.clientDetail.selectPrograms(client.name)}
                </p>
                <div style={styles.programList}>
                  {programs.filter(p => !p.isTemplate).length === 0 ? (
                    <p style={{ fontSize: '18px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
                      {t.clientDetail.noProgramsAvailable}
                    </p>
                  ) : (
                    programs.filter(p => !p.isTemplate).map(prog => {
                      const isAssigned = prog.clientIds.includes(client.id);
                      return (
                        <button
                          key={prog.id}
                          onClick={() => onToggleProgram(prog.id)}
                          style={{
                            ...styles.programRow,
                            background: isAssigned ? 'var(--accent-primary-dim)' : 'transparent',
                            borderColor: isAssigned ? 'rgba(0, 229, 200, 0.15)' : 'var(--glass-border)',
                          }}
                        >
                          <div style={styles.programRowInfo}>
                            <div style={styles.programRowName}>{prog.name}</div>
                            <div style={styles.programRowMeta}>
                              <span style={{ ...styles.programStatusDot, background: prog.status === 'active' ? 'var(--accent-success)' : prog.status === 'draft' ? 'var(--accent-warm)' : 'var(--text-tertiary)' }} />
                              {t.clientDetail.programStatusMap[prog.status] || prog.status} &middot; {t.clientDetail.programDays(prog.days.length)} &middot; {prog.durationWeeks}w
                            </div>
                          </div>
                          {isAssigned && (
                            <div style={styles.checkCircle}><Check size={12} /></div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <div style={styles.modalActions}>
                  <button onClick={() => { setActiveModal(null); flashSaved(t.clientDetail.programAssigned); }} style={styles.modalPrimaryBtn}>
                    {t.clientDetail.doneBtn}
                  </button>
                </div>
              </div>
            )}

            {/* View Check-In Detail Modal */}
            {activeModal === 'viewCheckIn' && selectedCheckIn && (() => {
              const ciMoodIcons: Record<number, { icon: typeof Smile; color: string }> = {
                1: { icon: Angry, color: 'var(--accent-danger)' },
                2: { icon: Frown, color: 'var(--accent-warm)' },
                3: { icon: Meh, color: 'var(--text-secondary)' },
                4: { icon: Smile, color: 'var(--accent-success)' },
                5: { icon: SmilePlus, color: 'var(--accent-primary)' },
              };
              const ciMoodIcon = selectedCheckIn.mood ? ciMoodIcons[selectedCheckIn.mood] : null;
              const textStyle = { fontSize: isMobile ? '13px' : '18px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, padding: isMobile ? '8px 10px' : '10px 12px', borderRadius: 'var(--radius-sm)' };
              const labelStyle = { ...styles.modalLabel, fontSize: isMobile ? '12px' : '17px' };
              return (
              <div style={{ ...styles.modalBody, ...(isMobile ? { padding: '14px 16px 16px', gap: '10px' } : {}), maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Date header with mood */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: isMobile ? '8px' : '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={isMobile ? 14 : 16} color="var(--accent-primary)" />
                    <span style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date(selectedCheckIn.date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  {ciMoodIcon && <ciMoodIcon.icon size={isMobile ? 18 : 22} color={ciMoodIcon.color} />}
                </div>

                {/* Metrics grid — compact 3-col */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '6px' : '10px' }}>
                  {selectedCheckIn.weight != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.weight}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedCheckIn.weight} <span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>kg</span></span>
                    </div>
                  )}
                  {selectedCheckIn.bodyFat != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.bodyFat}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedCheckIn.bodyFat}<span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>%</span></span>
                    </div>
                  )}
                  {selectedCheckIn.energy != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.energyLabel}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: selectedCheckIn.energy >= 7 ? 'var(--accent-success)' : selectedCheckIn.energy >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>{selectedCheckIn.energy}<span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>/10</span></span>
                    </div>
                  )}
                  {selectedCheckIn.stress != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.stressLabel}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: selectedCheckIn.stress >= 7 ? 'var(--accent-danger)' : selectedCheckIn.stress >= 5 ? 'var(--accent-warm)' : 'var(--accent-success)' }}>{selectedCheckIn.stress}<span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>/10</span></span>
                    </div>
                  )}
                  {selectedCheckIn.sleepHours != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.sleepLabel}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedCheckIn.sleepHours}<span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>h</span></span>
                    </div>
                  )}
                  {selectedCheckIn.steps != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.stepsLabel}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: (selectedCheckIn.steps || 0) >= 8000 ? 'var(--accent-success)' : (selectedCheckIn.steps || 0) >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>{(selectedCheckIn.steps || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedCheckIn.nutritionScore != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.nutritionLabel}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedCheckIn.nutritionScore}<span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>/10</span></span>
                    </div>
                  )}
                  {selectedCheckIn.mood != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: isMobile ? '8px' : '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>{t.clientDetail.moodLabel}</span>
                      <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: ciMoodIcon?.color || 'var(--text-primary)' }}>{selectedCheckIn.mood}<span style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.5 }}>/5</span></span>
                    </div>
                  )}
                </div>

                {/* Notes sections */}
                {selectedCheckIn.notes && (
                  <div style={{ ...styles.modalField, gap: isMobile ? '4px' : '8px' }}>
                    <span style={labelStyle}>{t.clientDetail.clientNotes}</span>
                    <p style={{ ...textStyle, background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>{selectedCheckIn.notes}</p>
                  </div>
                )}
                {selectedCheckIn.wins && (
                  <div style={{ ...styles.modalField, gap: isMobile ? '4px' : '8px' }}>
                    <span style={{ ...labelStyle, color: 'var(--accent-success)' }}>{t.clientDetail.winsLabel}</span>
                    <p style={{ ...textStyle, background: 'var(--accent-success-dim)', border: '1px solid rgba(34,197,94,0.1)' }}>{selectedCheckIn.wins}</p>
                  </div>
                )}
                {selectedCheckIn.challenges && (
                  <div style={{ ...styles.modalField, gap: isMobile ? '4px' : '8px' }}>
                    <span style={{ ...labelStyle, color: 'var(--accent-warm)' }}>{t.clientDetail.challengesLabel}</span>
                    <p style={{ ...textStyle, background: 'var(--accent-warm-dim)', border: '1px solid rgba(245,158,11,0.1)' }}>{selectedCheckIn.challenges}</p>
                  </div>
                )}

                {/* Coach Feedback */}
                {selectedCheckIn.reviewStatus === 'reviewed' ? (
                  selectedCheckIn.coachFeedback ? (
                    <div style={{ ...styles.modalField, gap: isMobile ? '4px' : '8px' }}>
                      <span style={{ ...labelStyle, color: 'var(--accent-primary)' }}>{t.clientDetail.coachFeedbackLabel}</span>
                      <p style={{ ...textStyle, background: 'rgba(0,229,200,0.04)', border: '1px solid rgba(0,229,200,0.1)' }}>{selectedCheckIn.coachFeedback}</p>
                    </div>
                  ) : null
                ) : (
                  <div style={{ ...styles.modalField, gap: isMobile ? '4px' : '8px' }}>
                    <span style={{ ...labelStyle, color: 'var(--accent-primary)' }}>{t.clientDetail.coachFeedbackLabel}</span>
                    <textarea
                      defaultValue={selectedCheckIn.coachFeedback}
                      onChange={(e) => setSelectedCheckIn(selectedCheckIn ? { ...selectedCheckIn, coachFeedback: e.target.value } : null)}
                      placeholder={t.clientDetail.feedbackPlaceholder}
                      style={{ ...styles.modalTextarea, fontSize: isMobile ? '13px' : '20px', padding: isMobile ? '8px 10px' : '12px 14px', minHeight: isMobile ? '60px' : '80px' }}
                      rows={2}
                    />
                    <span style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Send size={isMobile ? 8 : 9} /> {lang === 'pl' ? 'Widoczne dla klienta' : 'Visible to client'}
                    </span>
                  </div>
                )}

                {/* Flag reason */}
                {selectedCheckIn.reviewStatus === 'flagged' && selectedCheckIn.flagReason && (
                  <div style={{ ...styles.modalField, gap: isMobile ? '4px' : '8px' }}>
                    <span style={{ ...labelStyle, color: 'var(--accent-danger)' }}>{t.clientDetail.flaggedLabel}</span>
                    <p style={{ ...textStyle, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>{selectedCheckIn.flagReason}</p>
                  </div>
                )}

                {/* Actions */}
                {selectedCheckIn.reviewStatus === 'reviewed' ? (
                  <div style={{ ...styles.modalActions, justifyContent: 'center' }}>
                    <button onClick={() => { setActiveModal(null); setSelectedCheckIn(null); }} style={{ ...styles.modalCancelBtn, fontSize: isMobile ? '13px' : '18px', padding: isMobile ? '8px 24px' : '8px 16px' }}>
                      {lang === 'pl' ? 'Zamknij' : 'Close'}
                    </button>
                  </div>
                ) : (
                <div style={{ ...styles.modalActions, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '6px' : '8px' }}>
                  {isMobile ? (
                    <>
                      <button
                        onClick={() => {
                          onUpdateCheckIn(selectedCheckIn.id, { coachFeedback: selectedCheckIn.coachFeedback, reviewStatus: 'reviewed' });
                          setActiveModal(null); setSelectedCheckIn(null);
                          flashSaved(t.clientDetail.checkInReviewedFlash);
                        }}
                        style={{ ...styles.modalPrimaryBtn, width: '100%', justifyContent: 'center', fontSize: '13px', padding: '10px 16px' }}
                      >
                        <Save size={13} />
                        {t.clientDetail.markReviewedBtn}
                      </button>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setActiveModal(null); setSelectedCheckIn(null); }} style={{ ...styles.modalCancelBtn, flex: 1, textAlign: 'center', fontSize: '12px', padding: '7px 10px' }}>
                          {t.clientDetail.cancel}
                        </button>
                        {selectedCheckIn.reviewStatus !== 'flagged' && (
                          <button
                            onClick={() => {
                              const reason = window.prompt(t.clientDetail.flagReasonPrompt);
                              if (reason) {
                                onUpdateCheckIn(selectedCheckIn.id, { coachFeedback: selectedCheckIn.coachFeedback, reviewStatus: 'flagged', flagReason: reason });
                                setActiveModal(null); setSelectedCheckIn(null);
                                flashSaved(t.clientDetail.checkInFlaggedFlash);
                              }
                            }}
                            style={{ ...styles.modalCancelBtn, flex: 1, textAlign: 'center', fontSize: '12px', padding: '7px 10px', color: 'var(--accent-danger)', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Flag size={11} /> {t.clientDetail.flagBtn}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setActiveModal(null); setSelectedCheckIn(null); }} style={styles.modalCancelBtn}>
                        {t.clientDetail.cancel}
                      </button>
                      {selectedCheckIn.reviewStatus !== 'flagged' && (
                        <button
                          onClick={() => {
                            const reason = window.prompt(t.clientDetail.flagReasonPrompt);
                            if (reason) {
                              onUpdateCheckIn(selectedCheckIn.id, { coachFeedback: selectedCheckIn.coachFeedback, reviewStatus: 'flagged', flagReason: reason });
                              setActiveModal(null); setSelectedCheckIn(null);
                              flashSaved(t.clientDetail.checkInFlaggedFlash);
                            }
                          }}
                          style={{ ...styles.modalCancelBtn, color: 'var(--accent-danger)', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Flag size={14} /> {t.clientDetail.flagBtn}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onUpdateCheckIn(selectedCheckIn.id, { coachFeedback: selectedCheckIn.coachFeedback, reviewStatus: 'reviewed' });
                          setActiveModal(null); setSelectedCheckIn(null);
                          flashSaved(t.clientDetail.checkInReviewedFlash);
                        }}
                        style={styles.modalPrimaryBtn}
                      >
                        <Save size={14} /> {t.clientDetail.markReviewedBtn}
                      </button>
                    </>
                  )}
                </div>
                )}
              </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlayCenter: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCentered: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 101,
    maxHeight: '85vh',
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--glass-border)',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
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
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalRecipient: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  modalLabel: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
  },
  recipientChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px 4px 4px',
    borderRadius: '20px',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  miniAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  modalTextarea: {
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.2s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '4px',
  },
  modalCancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  modalPrimaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
    transition: 'transform 0.15s',
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modalPlanPicker: {
    display: 'flex',
    gap: '8px',
  },
  modalPlanOption: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
  modalStatusPicker: {
    display: 'flex',
    gap: '8px',
  },
  modalStatusOption: {
    flex: 1,
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
  programList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  programRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    transition: 'background 0.15s',
    textAlign: 'left',
  },
  programRowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  programRowName: {
    fontSize: '18px',
    fontWeight: 600,
  },
  programRowMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '15px',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
  programStatusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  checkCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-on-accent)',
    flexShrink: 0,
  },
  addNoteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--glass-border)',
    background: 'transparent',
    color: 'var(--accent-primary)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    width: '100%',
    justifyContent: 'center',
  },
  notesHistorySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '16px',
  },
  notesHistoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  notesHistoryItem: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
  },
  notesHistoryDate: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  notesHistoryText: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  keyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '2px 6px',
    borderRadius: '10px',
    color: 'var(--accent-warm)',
    background: 'var(--accent-warm-dim)',
  },
  keyToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
};
