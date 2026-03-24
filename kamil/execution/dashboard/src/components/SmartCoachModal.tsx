import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  X, Send, CheckCircle2, AlertTriangle, Clock,
  Dumbbell, Flame, Target, RefreshCw, Sparkles, Loader2,
} from 'lucide-react';
import { getInitials, getAvatarColor } from '../data';
import { getAllDraftVariants } from '../utils/smart-coach-drafts';
import { useAIDraft } from '../hooks/useAIDraft';
import type { SmartCoachTrigger } from '../utils/smart-coach-engine';
import type { Client, Message, CheckIn, Invoice, WorkoutLog } from '../types';

// ── Styles ─────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: (isMobile: boolean) => ({
    background: 'var(--bg-card, #0f1219)',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
    borderRadius: '16px',
    width: isMobile ? '95%' : '560px',
    maxHeight: isMobile ? '90vh' : '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  }),
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: (id: string) => ({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    background: getAvatarColor(id),
  }),
  clientName: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary, #fff)',
  },
  triggerLabel: {
    fontSize: '12px',
    color: 'var(--text-tertiary, #64748b)',
    marginTop: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary, #64748b)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary, #64748b)',
    marginBottom: '10px',
  },
  metricRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  metricCard: {
    flex: '1 1 30%',
    padding: '14px 16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  metricLabel: {
    fontSize: '11px',
    color: 'var(--text-tertiary, #64748b)',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary, #fff)',
  },
  metricDelta: (positive: boolean) => ({
    fontSize: '12px',
    fontWeight: 600,
    color: positive ? 'var(--accent-success, #22c55e)' : 'var(--accent-danger, #ef4444)',
    marginLeft: '6px',
  }),
  msgThread: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  msgBubble: (isCoach: boolean) => ({
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    lineHeight: 1.5,
    maxWidth: '85%',
    alignSelf: isCoach ? 'flex-end' as const : 'flex-start' as const,
    background: isCoach ? 'rgba(0,229,200,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${isCoach ? 'rgba(0,229,200,0.15)' : 'rgba(255,255,255,0.06)'}`,
    color: 'var(--text-primary, #fff)',
    wordBreak: 'break-word' as const,
  }),
  msgTime: {
    fontSize: '11px',
    color: 'var(--text-tertiary, #64748b)',
    marginTop: '4px',
  },
  textarea: {
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '14px',
    color: 'var(--text-primary, #fff)',
    lineHeight: 1.5,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    minHeight: '80px',
    boxSizing: 'border-box' as const,
  },
  footer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  btn: (variant: 'primary' | 'secondary' | 'danger') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    ...(variant === 'primary' ? {
      background: 'var(--accent-primary, #00e5c8)',
      color: '#000',
    } : variant === 'danger' ? {
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.2)',
      color: '#ef4444',
    } : {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'var(--text-secondary, #94a3b8)',
    }),
  }),
  invoiceCard: {
    padding: '14px 16px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: (status: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    ...(status === 'overdue' ? {
      background: 'rgba(239,68,68,0.1)',
      color: '#ef4444',
    } : status === 'pending' ? {
      background: 'rgba(245,158,11,0.1)',
      color: '#f59e0b',
    } : {
      background: 'rgba(34,197,94,0.1)',
      color: '#22c55e',
    }),
  }),
  wellnessBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  wellnessLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary, #94a3b8)',
    width: '70px',
    flexShrink: 0,
  },
  wellnessTrack: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  wellnessFill: (value: number, max: number) => ({
    height: '100%',
    borderRadius: '3px',
    width: `${(value / max) * 100}%`,
    background: value / max > 0.6 ? '#22c55e' : value / max > 0.3 ? '#f59e0b' : '#ef4444',
    transition: 'width 0.3s',
  }),
  wellnessValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary, #fff)',
    width: '30px',
    textAlign: 'right' as const,
  },
  emptyMsg: {
    fontSize: '13px',
    color: 'var(--text-tertiary, #64748b)',
    textAlign: 'center' as const,
    padding: '16px 0',
  },
  checkInNotes: {
    fontSize: '13px',
    color: 'var(--text-secondary, #94a3b8)',
    lineHeight: 1.6,
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
};

// Inject spinner keyframe once
if (typeof document !== 'undefined' && !document.getElementById('sc-spin')) {
  const style = document.createElement('style');
  style.id = 'sc-spin';
  style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
}

// ── Trigger label map ──────────────────────────────────────────

const triggerLabels: Record<string, Record<'en' | 'pl', string>> = {
  'checkin-overdue': { en: 'Check-in pending review', pl: 'Check-in czeka na review' },
  inactive: { en: 'Client inactive', pl: 'Klient nieaktywny' },
  'msg-unanswered': { en: 'Unanswered message', pl: 'Wiadomość bez odpowiedzi' },
  'wellness-decline': { en: 'Wellness declining', pl: 'Spadek samopoczucia' },
  'invoice-overdue': { en: 'Overdue invoice', pl: 'Zaległa faktura' },
  'program-ending': { en: 'Program ending soon', pl: 'Program kończy się' },
  'missed-workout': { en: 'Missed workout', pl: 'Pominięty trening' },
  stale: { en: 'No recent check-in', pl: 'Brak check-inu' },
  'invoice-due': { en: 'Invoice due soon', pl: 'Faktura do zapłaty' },
  'new-client': { en: 'New client', pl: 'Nowy klient' },
  'paused-long': { en: 'Paused client', pl: 'Klient na pauzie' },
  pr: { en: 'Personal record!', pl: 'Rekord osobisty!' },
  streak: { en: 'Streak milestone', pl: 'Milestone streak' },
  'progress-milestone': { en: 'Progress milestone', pl: 'Milestone postępu' },
  'wellness-up': { en: 'Wellness improving', pl: 'Poprawa samopoczucia' },
  'all-clear': { en: 'All caught up', pl: 'Wszystko ogarnięte' },
};

// ── Component ──────────────────────────────────────────────────

interface SmartCoachModalProps {
  trigger: SmartCoachTrigger;
  client: Client | null;
  messages: Message[];
  checkIns: CheckIn[];
  invoices: Invoice[];
  workoutLogs: WorkoutLog[];
  onClose: () => void;
  onSendMessage: (msg: Message) => void;
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  onDismiss: (triggerId: string) => void;
  lang: 'en' | 'pl';
  isMobile?: boolean;
}

export default function SmartCoachModal({
  trigger,
  client,
  messages,
  checkIns,
  invoices,
  workoutLogs,
  onClose,
  onSendMessage,
  onUpdateCheckIn,
  onDismiss,
  lang,
  isMobile = false,
}: SmartCoachModalProps) {
  const focusTrapRef = useFocusTrap(onClose);
  const [draftText, setDraftText] = useState(trigger.draftText || '');
  const [feedbackText, setFeedbackText] = useState('');
  const [sent, setSent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);
  const [isAiDraft, setIsAiDraft] = useState(false);

  // AI Draft generation
  const { aiDraft, loading: aiLoading, error: aiError, generate: generateAI } = useAIDraft(
    trigger, client, messages, checkIns, workoutLogs, lang,
  );

  // When AI draft arrives, update textarea
  useEffect(() => {
    if (aiDraft) {
      setDraftText(aiDraft);
      setIsAiDraft(true);
    }
  }, [aiDraft]);

  // All draft variants for shuffle
  const allVariants = trigger.draftText ? getAllDraftVariants(trigger, lang) : [];
  const hasMultipleVariants = allVariants.length > 1;

  const handleShuffle = () => {
    const nextIndex = (variantIndex + 1) % allVariants.length;
    setVariantIndex(nextIndex);
    setDraftText(allVariants[nextIndex]);
  };

  if (!client) return null;

  // ── Data for this client ──
  const clientMessages = messages
    .filter((m) => m.clientId === client.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-8); // last 8 messages

  const clientCheckIns = checkIns
    .filter((ci) => ci.clientId === client.id && ci.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestCheckIn = clientCheckIns[0] || null;

  const pendingCheckIn = checkIns.find(
    (ci) => ci.clientId === client.id && ci.reviewStatus === 'pending',
  );

  const clientInvoices = invoices
    .filter((inv) => inv.clientId === client.id)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const clientWorkouts = workoutLogs
    .filter((w) => w.clientId === client.id && w.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastWorkout = clientWorkouts[0] || null;

  // ── i18n ──
  const t = lang === 'pl' ? {
    recentMessages: 'Ostatnie wiadomości',
    noMessages: 'Brak wiadomości z tym klientem',
    yourMessage: 'Twoja wiadomość',
    send: 'Wyślij',
    sent: 'Wysłano!',
    close: 'Zamknij',
    dismiss: 'Odrzuć',
    checkInReview: 'Review check-inu',
    wellness: 'Samopoczucie',
    mood: 'Nastrój',
    energy: 'Energia',
    stress: 'Stres',
    sleep: 'Sen',
    nutrition: 'Dieta',
    steps: 'Kroki',
    weight: 'Waga',
    bodyFat: '% tłuszczu',
    clientNotes: 'Notatki klienta',
    wins: 'Sukcesy',
    challenges: 'Wyzwania',
    coachFeedback: 'Feedback trenera',
    feedbackPlaceholder: 'Napisz feedback dla klienta...',
    markReviewed: 'Oznacz jako przejrzane',
    reviewed: 'Przejrzane ✓',
    invoiceDetails: 'Szczegóły faktury',
    amount: 'Kwota',
    dueDate: 'Termin',
    status: 'Status',
    overdue: 'Zaległa',
    pending: 'Oczekująca',
    paid: 'Zapłacona',
    clientMetrics: 'Metryki klienta',
    lastWorkout: 'Ostatni trening',
    daysAgo: 'dni temu',
    streak: 'Streak',
    progress: 'Postęp',
    days: 'dni',
    noCheckIn: 'Brak check-inu do review',
  } : {
    recentMessages: 'Recent messages',
    noMessages: 'No messages with this client',
    yourMessage: 'Your message',
    send: 'Send',
    sent: 'Sent!',
    close: 'Close',
    dismiss: 'Dismiss',
    checkInReview: 'Check-in review',
    wellness: 'Wellness',
    mood: 'Mood',
    energy: 'Energy',
    stress: 'Stress',
    sleep: 'Sleep',
    nutrition: 'Nutrition',
    steps: 'Steps',
    weight: 'Weight',
    bodyFat: 'Body fat',
    clientNotes: 'Client notes',
    wins: 'Wins',
    challenges: 'Challenges',
    coachFeedback: 'Coach feedback',
    feedbackPlaceholder: 'Write feedback for the client...',
    markReviewed: 'Mark as reviewed',
    reviewed: 'Reviewed ✓',
    invoiceDetails: 'Invoice details',
    amount: 'Amount',
    dueDate: 'Due date',
    status: 'Status',
    overdue: 'Overdue',
    pending: 'Pending',
    paid: 'Paid',
    clientMetrics: 'Client metrics',
    lastWorkout: 'Last workout',
    daysAgo: 'days ago',
    streak: 'Streak',
    progress: 'Progress',
    days: 'days',
    noCheckIn: 'No check-in to review',
  };

  // ── Handlers ──

  const handleSend = () => {
    if (!draftText.trim()) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      clientId: client.id,
      clientName: client.name,
      clientAvatar: '',
      text: draftText.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      isFromCoach: true,
      deliveryStatus: 'sent',
    };
    onSendMessage(msg);
    setSent(true);
    onDismiss(trigger.id);
    setTimeout(() => onClose(), 1200);
  };

  const handleMarkReviewed = () => {
    if (!pendingCheckIn) return;
    const updates: Partial<CheckIn> = {
      reviewStatus: 'reviewed',
      coachFeedback: feedbackText.trim() || pendingCheckIn.coachFeedback,
    };
    onUpdateCheckIn(pendingCheckIn.id, updates);
    setReviewed(true);
    onDismiss(trigger.id);
    setTimeout(() => onClose(), 1200);
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString(lang === 'pl' ? 'pl-PL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  // ── Determine which sections to show ──
  const isCheckInTrigger = trigger.type === 'checkin-overdue';
  const isInvoiceTrigger = trigger.type === 'invoice-overdue' || trigger.type === 'invoice-due';
  // Show draft composer if trigger has a draft OR if its type supports drafts
  // (convo guard may have nullified draftText, but coach should still be able to compose/AI-generate)
  const DRAFTABLE_TYPES = new Set([
    'inactive', 'msg-unanswered', 'missed-workout', 'wellness-decline',
    'program-ending', 'stale', 'new-client', 'paused-long',
    'pr', 'streak', 'progress-milestone',
  ]);
  const hasDraft = !!(trigger.draftText && trigger.draftText !== '__TEMPLATE__') || DRAFTABLE_TYPES.has(trigger.type);
  const isWellnessTrigger = trigger.type === 'wellness-decline' || trigger.type === 'wellness-up';
  const isWorkoutTrigger = trigger.type === 'missed-workout' || trigger.type === 'inactive';
  const isWinTrigger = trigger.type === 'pr' || trigger.type === 'streak' || trigger.type === 'progress-milestone';

  // ── Render sections ──

  const renderWellnessMetrics = (ci: CheckIn) => (
    <div style={s.section}>
      <div style={s.sectionTitle}>{t.wellness}</div>
      {ci.mood != null && (
        <div style={s.wellnessBar}>
          <span style={s.wellnessLabel}>{t.mood}</span>
          <div style={s.wellnessTrack}><div style={s.wellnessFill(ci.mood, 5)} /></div>
          <span style={s.wellnessValue}>{ci.mood}/5</span>
        </div>
      )}
      {ci.energy != null && (
        <div style={s.wellnessBar}>
          <span style={s.wellnessLabel}>{t.energy}</span>
          <div style={s.wellnessTrack}><div style={s.wellnessFill(ci.energy, 10)} /></div>
          <span style={s.wellnessValue}>{ci.energy}/10</span>
        </div>
      )}
      {ci.stress != null && (
        <div style={s.wellnessBar}>
          <span style={s.wellnessLabel}>{t.stress}</span>
          <div style={s.wellnessTrack}><div style={s.wellnessFill(10 - ci.stress, 10)} /></div>
          <span style={s.wellnessValue}>{ci.stress}/10</span>
        </div>
      )}
      {ci.sleepHours != null && (
        <div style={s.wellnessBar}>
          <span style={s.wellnessLabel}>{t.sleep}</span>
          <div style={s.wellnessTrack}><div style={s.wellnessFill(ci.sleepHours, 10)} /></div>
          <span style={s.wellnessValue}>{ci.sleepHours}h</span>
        </div>
      )}
      {ci.nutritionScore != null && (
        <div style={s.wellnessBar}>
          <span style={s.wellnessLabel}>{t.nutrition}</span>
          <div style={s.wellnessTrack}><div style={s.wellnessFill(ci.nutritionScore, 10)} /></div>
          <span style={s.wellnessValue}>{ci.nutritionScore}/10</span>
        </div>
      )}
      {ci.steps != null && (
        <div style={s.wellnessBar}>
          <span style={s.wellnessLabel}>{t.steps}</span>
          <div style={s.wellnessTrack}><div style={s.wellnessFill(Math.min(ci.steps / 100, 10), 10)} /></div>
          <span style={s.wellnessValue}>{(ci.steps / 1000).toFixed(1)}k</span>
        </div>
      )}
    </div>
  );

  const renderCheckInNotes = (ci: CheckIn) => (
    <>
      {ci.notes && (
        <div style={s.section}>
          <div style={s.sectionTitle}>{t.clientNotes}</div>
          <div style={s.checkInNotes}>{ci.notes}</div>
        </div>
      )}
      {ci.wins && (
        <div style={s.section}>
          <div style={s.sectionTitle}>{t.wins}</div>
          <div style={s.checkInNotes}>{ci.wins}</div>
        </div>
      )}
      {ci.challenges && (
        <div style={s.section}>
          <div style={s.sectionTitle}>{t.challenges}</div>
          <div style={s.checkInNotes}>{ci.challenges}</div>
        </div>
      )}
    </>
  );

  const renderBodyMetrics = (ci: CheckIn) => {
    const prevCi = clientCheckIns[1] || null;
    return (
      <div style={s.section}>
        <div style={s.metricRow}>
          {ci.weight != null && (
            <div style={s.metricCard}>
              <div style={s.metricLabel}>{t.weight}</div>
              <div>
                <span style={s.metricValue}>{ci.weight}kg</span>
                {prevCi?.weight != null && (
                  <span style={s.metricDelta(ci.weight <= prevCi.weight)}>
                    {ci.weight > prevCi.weight ? '+' : ''}{(ci.weight - prevCi.weight).toFixed(1)}kg
                  </span>
                )}
              </div>
            </div>
          )}
          {ci.bodyFat != null && (
            <div style={s.metricCard}>
              <div style={s.metricLabel}>{t.bodyFat}</div>
              <div>
                <span style={s.metricValue}>{ci.bodyFat}%</span>
                {prevCi?.bodyFat != null && (
                  <span style={s.metricDelta(ci.bodyFat <= prevCi.bodyFat)}>
                    {ci.bodyFat > prevCi.bodyFat ? '+' : ''}{(ci.bodyFat - prevCi.bodyFat).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMessageThread = () => (
    <div style={s.section}>
      <div style={s.sectionTitle}>{t.recentMessages}</div>
      {clientMessages.length === 0 ? (
        <div style={s.emptyMsg}>{t.noMessages}</div>
      ) : (
        <div style={s.msgThread}>
          {clientMessages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={s.msgBubble(msg.isFromCoach)}>
                {msg.text}
              </div>
              <span style={{
                ...s.msgTime,
                alignSelf: msg.isFromCoach ? 'flex-end' : 'flex-start',
              }}>
                {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const draftBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center' as const,
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer' as const,
    border: '1px solid rgba(0,229,200,0.2)',
    background: 'rgba(0,229,200,0.06)',
    color: 'var(--accent-primary, #00e5c8)',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  };

  const renderDraftComposer = () => (
    <div style={s.section}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        gap: '8px',
      }}>
        <div style={{ ...s.sectionTitle, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {draftText
            ? (lang === 'pl' ? '💬 Gotowa wiadomość — edytuj lub wyślij' : '💬 Ready to send — edit or send as-is')
            : t.yourMessage}
          {isAiDraft && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(139,92,246,0.15)',
              color: '#a78bfa',
              letterSpacing: '0.05em',
            }}>
              AI
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {hasMultipleVariants && !isAiDraft && (
            <button onClick={handleShuffle} style={draftBtnStyle}>
              <RefreshCw size={11} />
              {lang === 'pl' ? 'Inna wersja' : 'Try another'}
            </button>
          )}
          {DRAFTABLE_TYPES.has(trigger.type) && (
            <button
              onClick={() => { setIsAiDraft(false); generateAI(); }}
              disabled={aiLoading}
              style={{
                ...draftBtnStyle,
                border: '1px solid rgba(139,92,246,0.3)',
                background: aiLoading ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)',
                color: '#a78bfa',
                opacity: aiLoading ? 0.7 : 1,
              }}
            >
              {aiLoading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
              {aiLoading
                ? (lang === 'pl' ? 'Generuję...' : 'Generating...')
                : isAiDraft
                  ? (lang === 'pl' ? 'Regeneruj AI' : 'Regenerate AI')
                  : (lang === 'pl' ? 'Wersja AI' : 'AI Draft')}
            </button>
          )}
        </div>
      </div>
      {aiError && (
        <div style={{
          fontSize: '12px',
          color: '#ef4444',
          marginBottom: '8px',
          padding: '6px 10px',
          borderRadius: '6px',
          background: 'rgba(239,68,68,0.08)',
        }}>
          {lang === 'pl' ? 'Nie udało się wygenerować — użyj szablonu' : 'AI generation failed — use template instead'}
        </div>
      )}
      <textarea
        style={{
          ...s.textarea,
          ...(isAiDraft
            ? { borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.05)' }
            : draftText
              ? { borderColor: 'rgba(0,229,200,0.3)', background: 'rgba(0,229,200,0.05)' }
              : {}),
          ...(aiLoading ? { opacity: 0.5 } : {}),
        }}
        value={draftText}
        onChange={(e) => { setDraftText(e.target.value); setIsAiDraft(false); }}
        placeholder={lang === 'pl' ? 'Napisz wiadomość do klienta...' : 'Write a message to the client...'}
        disabled={aiLoading}
      />
    </div>
  );

  const renderClientQuickStats = () => {
    const daysAgo = lastWorkout
      ? Math.floor((Date.now() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const workoutColor = daysAgo === null ? '#64748b'
      : daysAgo <= 1 ? '#22c55e'
      : daysAgo <= 3 ? '#f59e0b'
      : '#ef4444';

    const streakColor = client.streak >= 14 ? '#22c55e'
      : client.streak >= 7 ? '#00e5c8'
      : client.streak >= 3 ? '#f59e0b'
      : '#64748b';

    const progressColor = client.progress >= 75 ? '#22c55e'
      : client.progress >= 50 ? '#00e5c8'
      : client.progress >= 25 ? '#f59e0b'
      : '#ef4444';

    return (
      <div style={s.section}>
        <div style={s.sectionTitle}>{t.clientMetrics}</div>
        <div style={s.metricRow}>
          {/* Last Workout */}
          <div style={{
            ...s.metricCard,
            borderColor: `${workoutColor}25`,
            background: `${workoutColor}08`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Dumbbell size={14} color={workoutColor} />
              <span style={{ ...s.metricLabel, marginBottom: 0 }}>{t.lastWorkout}</span>
            </div>
            <div style={{ ...s.metricValue, color: workoutColor, fontSize: '18px' }}>
              {daysAgo === null
                ? '—'
                : daysAgo === 0
                  ? (lang === 'pl' ? 'Dziś' : 'Today')
                  : `${daysAgo} ${t.daysAgo}`}
            </div>
          </div>

          {/* Streak */}
          <div style={{
            ...s.metricCard,
            borderColor: `${streakColor}25`,
            background: `${streakColor}08`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Flame size={14} color={streakColor} />
              <span style={{ ...s.metricLabel, marginBottom: 0 }}>{t.streak}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ ...s.metricValue, color: streakColor, fontSize: '18px' }}>
                {client.streak}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary, #64748b)' }}>
                {t.days}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div style={{
            ...s.metricCard,
            borderColor: `${progressColor}25`,
            background: `${progressColor}08`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Target size={14} color={progressColor} />
              <span style={{ ...s.metricLabel, marginBottom: 0 }}>{t.progress}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ ...s.metricValue, color: progressColor, fontSize: '18px' }}>
                {client.progress}%
              </span>
            </div>
            {/* Progress bar */}
            <div style={{
              marginTop: '8px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${client.progress}%`,
                borderRadius: '2px',
                background: progressColor,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInvoiceDetails = () => {
    const relevantInvoices = clientInvoices.filter(
      (inv) => inv.status === 'overdue' || inv.status === 'pending',
    );
    if (relevantInvoices.length === 0) return null;

    const statusLabels: Record<string, string> = {
      overdue: t.overdue,
      pending: t.pending,
      paid: t.paid,
    };

    return (
      <div style={s.section}>
        <div style={s.sectionTitle}>{t.invoiceDetails}</div>
        {relevantInvoices.map((inv) => (
          <div key={inv.id} style={{ ...s.invoiceCard, marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                {inv.amount} {lang === 'pl' ? 'zł' : '$'} · {inv.period}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #64748b)', marginTop: '4px' }}>
                {t.dueDate}: {formatDate(inv.dueDate)}
              </div>
            </div>
            <span style={s.statusBadge(inv.status)}>
              {inv.status === 'overdue' && <AlertTriangle size={11} />}
              {inv.status === 'pending' && <Clock size={11} />}
              {statusLabels[inv.status]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderLiftPRs = () => {
    const lifts = ['benchPress', 'squat', 'deadlift'] as const;
    const liftNames: Record<string, string> = lang === 'pl'
      ? { benchPress: 'Wyciskanie', squat: 'Przysiad', deadlift: 'Martwy ciąg' }
      : { benchPress: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift' };

    return (
      <div style={s.section}>
        <div style={s.sectionTitle}>{lang === 'pl' ? 'Rekordy' : 'Personal Records'}</div>
        <div style={s.metricRow}>
          {lifts.map((lift) => {
            const vals = client.metrics[lift];
            if (vals.length === 0) return null;
            const current = vals[vals.length - 1];
            const prev = vals.length >= 2 ? vals[vals.length - 2] : null;
            return (
              <div key={lift} style={s.metricCard}>
                <div style={s.metricLabel}>{liftNames[lift]}</div>
                <div>
                  <span style={s.metricValue}>{current}kg</span>
                  {prev !== null && (
                    <span style={s.metricDelta(current > prev)}>
                      {current > prev ? '+' : ''}{current - prev}kg
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Build modal content based on trigger type ──

  const renderContent = () => {
    // CHECK-IN REVIEW
    if (isCheckInTrigger) {
      if (!pendingCheckIn) {
        return <div style={s.emptyMsg}>{t.noCheckIn}</div>;
      }
      return (
        <>
          {renderBodyMetrics(pendingCheckIn)}
          {renderWellnessMetrics(pendingCheckIn)}
          {renderCheckInNotes(pendingCheckIn)}
          <div style={s.section}>
            <div style={s.sectionTitle}>{t.coachFeedback}</div>
            <textarea
              style={s.textarea}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={t.feedbackPlaceholder}
            />
          </div>
        </>
      );
    }

    // INVOICE TRIGGERS
    if (isInvoiceTrigger) {
      return (
        <>
          {renderInvoiceDetails()}
          {renderClientQuickStats()}
        </>
      );
    }

    // WELLNESS TRIGGERS
    if (isWellnessTrigger && latestCheckIn) {
      return (
        <>
          {renderWellnessMetrics(latestCheckIn)}
          {renderBodyMetrics(latestCheckIn)}
          {renderMessageThread()}
          {hasDraft && renderDraftComposer()}
        </>
      );
    }

    // WORKOUT / INACTIVE TRIGGERS
    if (isWorkoutTrigger) {
      return (
        <>
          {renderClientQuickStats()}
          {latestCheckIn && renderWellnessMetrics(latestCheckIn)}
          {renderMessageThread()}
          {hasDraft && renderDraftComposer()}
        </>
      );
    }

    // WIN TRIGGERS (PR, streak, progress)
    if (isWinTrigger) {
      return (
        <>
          {renderLiftPRs()}
          {renderClientQuickStats()}
          {renderMessageThread()}
          {hasDraft && renderDraftComposer()}
        </>
      );
    }

    // DEFAULT: msg-unanswered, new-client, paused-long, program-ending, stale
    return (
      <>
        {renderClientQuickStats()}
        {renderMessageThread()}
        {hasDraft && renderDraftComposer()}
      </>
    );
  };

  // ── Footer buttons ──

  const renderFooter = () => {
    if (sent) {
      return (
        <div style={s.footer}>
          <span style={{ color: 'var(--accent-success, #22c55e)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {t.sent}
          </span>
        </div>
      );
    }

    if (reviewed) {
      return (
        <div style={s.footer}>
          <span style={{ color: 'var(--accent-success, #22c55e)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {t.reviewed}
          </span>
        </div>
      );
    }

    return (
      <div style={s.footer}>
        <button style={s.btn('secondary')} onClick={() => { onDismiss(trigger.id); onClose(); }}>
          {t.dismiss}
        </button>

        {isCheckInTrigger && pendingCheckIn && (
          <button style={s.btn('primary')} onClick={handleMarkReviewed}>
            <CheckCircle2 size={14} />
            {t.markReviewed}
          </button>
        )}

        {hasDraft && (
          <button
            style={s.btn('primary')}
            onClick={handleSend}
            disabled={!draftText.trim()}
          >
            <Send size={14} />
            {t.send}
          </button>
        )}

        {!isCheckInTrigger && !hasDraft && (
          <button style={s.btn('secondary')} onClick={onClose}>
            {t.close}
          </button>
        )}
      </div>
    );
  };

  // ── Render ──

  return (
    <AnimatePresence>
      <div style={s.overlay} onClick={onClose}>
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          style={s.modal(isMobile)}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.avatar(client.id)}>
                {getInitials(client.name)}
              </div>
              <div>
                <div style={s.clientName}>{client.name}</div>
                <div style={s.triggerLabel}>
                  {triggerLabels[trigger.type]?.[lang] || trigger.type}
                </div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={s.body}>
            {renderContent()}
          </div>

          {/* Footer */}
          {renderFooter()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
