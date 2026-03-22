import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, Clock, Calendar, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { getInitials, getAvatarColor } from '../data';
import { FEED_EVENT_CONFIG } from '../utils/activity-feed';
import { relativeTime } from '../utils/relative-time';
import type { FeedEvent } from '../utils/activity-feed';
import type { Client, Message, CheckIn, Invoice, WorkoutLog } from '../types';

// ── Event labels ──

const eventLabels: Record<string, Record<'en' | 'pl', string>> = {
  workout_completed: { en: 'Workout completed', pl: 'Trening ukończony' },
  workout_missed: { en: 'Workout missed', pl: 'Trening pominięty' },
  checkin_submitted: { en: 'Check-in submitted', pl: 'Check-in przesłany' },
  checkin_reviewed: { en: 'Check-in reviewed', pl: 'Check-in sprawdzony' },
  message_received: { en: 'New message', pl: 'Nowa wiadomość' },
  invoice_paid: { en: 'Invoice paid', pl: 'Faktura zapłacona' },
  invoice_overdue: { en: 'Invoice overdue', pl: 'Faktura zaległa' },
  personal_record: { en: 'Personal record!', pl: 'Rekord osobisty!' },
  client_joined: { en: 'New client', pl: 'Nowy klient' },
};

// ── Component ──

interface ActivityFeedModalProps {
  event: FeedEvent;
  client: Client | null;
  messages: Message[];
  checkIns: CheckIn[];
  invoices: Invoice[];
  workoutLogs: WorkoutLog[];
  onClose: () => void;
  lang: 'en' | 'pl';
  isMobile?: boolean;
}

export default function ActivityFeedModal({
  event, client, messages, checkIns, invoices, workoutLogs,
  onClose, lang, isMobile = false,
}: ActivityFeedModalProps) {
  if (!client) return null;

  const config = FEED_EVENT_CONFIG[event.type];
  const accentColor = config.color;

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString(lang === 'pl' ? 'pl-PL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric' });

  const t = lang === 'pl' ? {
    close: 'Zamknij',
    workout: 'Szczegóły treningu',
    type: 'Typ',
    duration: 'Czas trwania',
    date: 'Data',
    completed: 'Ukończony',
    missed: 'Pominięty',
    wellness: 'Samopoczucie',
    mood: 'Nastrój',
    energy: 'Energia',
    stress: 'Stres',
    sleep: 'Sen',
    nutrition: 'Dieta',
    weight: 'Waga',
    bodyFat: 'Tkanka tłuszczowa',
    bodyMetrics: 'Pomiary ciała',
    notes: 'Notatki klienta',
    wins: 'Sukcesy',
    challenges: 'Wyzwania',
    recentMessages: 'Ostatnie wiadomości',
    noMessages: 'Brak wiadomości z tym klientem',
    invoice: 'Szczegóły faktury',
    dueDate: 'Termin',
    paidDate: 'Zapłacono',
    period: 'Okres',
    overdue: 'Zaległa',
    pending: 'Oczekująca',
    paid: 'Zapłacona',
    personalRecords: 'Rekordy osobiste',
    plan: 'Plan',
    joined: 'Data dołączenia',
    clientInfo: 'Informacje o kliencie',
  } : {
    close: 'Close',
    workout: 'Workout Details',
    type: 'Type',
    duration: 'Duration',
    date: 'Date',
    completed: 'Completed',
    missed: 'Missed',
    wellness: 'Wellness',
    mood: 'Mood',
    energy: 'Energy',
    stress: 'Stress',
    sleep: 'Sleep',
    nutrition: 'Nutrition',
    weight: 'Weight',
    bodyFat: 'Body Fat',
    bodyMetrics: 'Body Metrics',
    notes: 'Client Notes',
    wins: 'Wins',
    challenges: 'Challenges',
    recentMessages: 'Recent Messages',
    noMessages: 'No messages with this client',
    invoice: 'Invoice Details',
    dueDate: 'Due date',
    paidDate: 'Paid',
    period: 'Period',
    overdue: 'Overdue',
    pending: 'Pending',
    paid: 'Paid',
    personalRecords: 'Personal Records',
    plan: 'Plan',
    joined: 'Joined',
    clientInfo: 'Client Info',
  };

  // ── WORKOUT ──
  const renderWorkout = () => {
    const logId = event.id.replace('workout_completed-', '').replace('workout_missed-', '');
    const log = workoutLogs.find(w => w.id === logId);
    const isCompleted = event.type === 'workout_completed';
    const statusColor = isCompleted ? '#22c55e' : '#ef4444';

    return (
      <>
        {/* Status hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '20px',
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${statusColor}10, ${statusColor}05)`,
            border: `1px solid ${statusColor}20`,
            marginBottom: '20px',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: `${statusColor}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isCompleted ? <CheckCircle2 size={24} color={statusColor} /> : <XCircle size={24} color={statusColor} />}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: statusColor }}>
              {isCompleted ? t.completed : t.missed}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary, #64748b)', marginTop: '2px' }}>
              {log?.type || '—'}
            </div>
          </div>
        </motion.div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { icon: <Dumbbell size={15} color="var(--accent-primary)" />, label: t.type, value: log?.type || '—' },
            { icon: <Clock size={15} color="var(--accent-primary)" />, label: t.duration, value: `${log?.duration || 0} min` },
            { icon: <Calendar size={15} color="var(--accent-primary)" />, label: t.date, value: formatDate(event.timestamp) },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: '8px' }}>{m.icon}</div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>{m.value}</div>
            </motion.div>
          ))}
        </div>
      </>
    );
  };

  // ── CHECK-IN ──
  const renderCheckIn = () => {
    const ciId = event.id.replace('checkin_submitted-', '').replace('checkin_reviewed-', '');
    const ci = checkIns.find(c => c.id === ciId);
    if (!ci) return null;

    const prevCi = checkIns
      .filter(c => c.clientId === client.id && c.id !== ci.id && c.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

    const wellnessItems = [
      ci.mood != null ? { label: t.mood, value: ci.mood, max: 5, display: `${ci.mood}/5` } : null,
      ci.energy != null ? { label: t.energy, value: ci.energy, max: 10, display: `${ci.energy}/10` } : null,
      ci.stress != null ? { label: t.stress, value: 10 - ci.stress, max: 10, display: `${ci.stress}/10` } : null,
      ci.sleepHours != null ? { label: t.sleep, value: ci.sleepHours, max: 10, display: `${ci.sleepHours}h` } : null,
      ci.nutritionScore != null ? { label: t.nutrition, value: ci.nutritionScore, max: 10, display: `${ci.nutritionScore}/10` } : null,
    ].filter(Boolean) as { label: string; value: number; max: number; display: string }[];

    return (
      <>
        {/* Body metrics hero */}
        {(ci.weight != null || ci.bodyFat != null) && (
          <div style={{ marginBottom: '20px' }}>
            <div style={sectionTitle}>{t.bodyMetrics}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {ci.weight != null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={heroMetricCard}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{t.weight}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{ci.weight}</span>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>kg</span>
                    {prevCi?.weight != null && (
                      <span style={{
                        fontSize: '13px', fontWeight: 600, marginLeft: '4px',
                        color: ci.weight <= prevCi.weight ? '#22c55e' : '#ef4444',
                      }}>
                        {ci.weight > prevCi.weight ? '+' : ''}{(ci.weight - prevCi.weight).toFixed(1)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
              {ci.bodyFat != null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={heroMetricCard}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{t.bodyFat}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{ci.bodyFat}</span>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>%</span>
                    {prevCi?.bodyFat != null && (
                      <span style={{
                        fontSize: '13px', fontWeight: 600, marginLeft: '4px',
                        color: ci.bodyFat <= prevCi.bodyFat ? '#22c55e' : '#ef4444',
                      }}>
                        {ci.bodyFat > prevCi.bodyFat ? '+' : ''}{(ci.bodyFat - prevCi.bodyFat).toFixed(1)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Wellness bars */}
        {wellnessItems.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={sectionTitle}>{t.wellness}</div>
            {wellnessItems.map((item, i) => {
              const ratio = item.value / item.max;
              const barColor = ratio > 0.6 ? '#22c55e' : ratio > 0.3 ? '#f59e0b' : '#ef4444';
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
                >
                  <span style={{ fontSize: '12px', color: '#94a3b8', width: '70px', flexShrink: 0 }}>{item.label}</span>
                  <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${barColor}cc, ${barColor})` }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', width: '40px', textAlign: 'right' }}>{item.display}</span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Notes sections */}
        {ci.notes && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionTitle}>{t.notes}</div>
            <div style={noteCard}>{ci.notes}</div>
          </div>
        )}
        {ci.wins && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionTitle}>{t.wins}</div>
            <div style={{ ...noteCard, borderColor: 'rgba(34,197,94,0.15)', background: 'rgba(34,197,94,0.03)' }}>{ci.wins}</div>
          </div>
        )}
        {ci.challenges && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionTitle}>{t.challenges}</div>
            <div style={{ ...noteCard, borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.03)' }}>{ci.challenges}</div>
          </div>
        )}
      </>
    );
  };

  // ── MESSAGES ──
  const renderMessages = () => {
    const clientMsgs = messages
      .filter(m => m.clientId === client.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-10);

    return (
      <div>
        <div style={sectionTitle}>{t.recentMessages}</div>
        {clientMsgs.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>{t.noMessages}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto', padding: '4px 0' }}>
            {clientMsgs.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.03 }}
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <div style={{
                  padding: '10px 14px',
                  borderRadius: msg.isFromCoach ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  maxWidth: '85%',
                  alignSelf: msg.isFromCoach ? 'flex-end' : 'flex-start',
                  background: msg.isFromCoach
                    ? 'linear-gradient(135deg, rgba(0,229,200,0.12), rgba(0,229,200,0.06))'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.isFromCoach ? 'rgba(0,229,200,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#fff',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <span style={{
                  fontSize: '10px', color: '#4b5563', marginTop: '3px',
                  alignSelf: msg.isFromCoach ? 'flex-end' : 'flex-start',
                  fontFamily: 'var(--font-mono, monospace)',
                }}>
                  {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── PAYMENT ──
  const renderPayment = () => {
    const invId = event.id.replace('invoice_paid-', '').replace('invoice_overdue-', '');
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return null;

    const isPaid = inv.status === 'paid';
    const statusColor = isPaid ? '#22c55e' : inv.status === 'overdue' ? '#ef4444' : '#f59e0b';
    const statusLabel = isPaid ? t.paid : inv.status === 'overdue' ? t.overdue : t.pending;
    const amount = lang === 'pl' ? `${inv.amount} zł` : `$${inv.amount}`;

    return (
      <>
        {/* Hero amount */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            textAlign: 'center',
            padding: '28px 20px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${statusColor}08, ${statusColor}03)`,
            border: `1px solid ${statusColor}20`,
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
            {amount}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '10px', padding: '4px 14px', borderRadius: '20px',
            background: `${statusColor}15`, fontSize: '13px', fontWeight: 600, color: statusColor,
          }}>
            {isPaid && <CheckCircle2 size={14} />}
            {statusLabel}
          </div>
        </motion.div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: t.period, value: inv.period },
            { label: t.plan, value: inv.plan },
            { label: t.dueDate, value: formatDate(inv.dueDate) },
            ...(inv.paidDate ? [{ label: t.paidDate, value: formatDate(inv.paidDate) }] : []),
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{item.value}</div>
            </motion.div>
          ))}
        </div>
      </>
    );
  };

  // ── PR ──
  const renderPR = () => {
    const lifts = ['benchPress', 'squat', 'deadlift'] as const;
    const liftNames: Record<string, string> = lang === 'pl'
      ? { benchPress: 'Wyciskanie', squat: 'Przysiad', deadlift: 'Martwy ciąg' }
      : { benchPress: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift' };

    return (
      <div>
        <div style={sectionTitle}>{t.personalRecords}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {lifts.map((lift, i) => {
            const vals = client.metrics[lift];
            if (vals.length === 0) return null;
            const current = vals[vals.length - 1];
            const prev = vals.length >= 2 ? vals[vals.length - 2] : null;
            const isUp = prev !== null && current > prev;
            return (
              <motion.div
                key={lift}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '14px',
                  background: isUp ? 'rgba(0,229,200,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isUp ? 'rgba(0,229,200,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {liftNames[lift]}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{current}<span style={{ fontSize: '13px', color: '#64748b' }}>kg</span></div>
                {prev !== null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    marginTop: '6px', fontSize: '12px', fontWeight: 600,
                    color: isUp ? '#22c55e' : '#ef4444',
                  }}>
                    <TrendingUp size={12} />
                    {current > prev ? '+' : ''}{current - prev}kg
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── CLIENT JOINED ──
  const renderClientJoined = () => (
    <div>
      <div style={sectionTitle}>{t.clientInfo}</div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[
          { label: t.plan, value: client.plan },
          { label: t.joined, value: formatDate(client.startDate) },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            style={heroMetricCard}
          >
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{item.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{item.value}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ── Route ──
  const renderContent = () => {
    switch (event.type) {
      case 'workout_completed':
      case 'workout_missed':
        return renderWorkout();
      case 'checkin_submitted':
      case 'checkin_reviewed':
        return renderCheckIn();
      case 'message_received':
        return renderMessages();
      case 'invoice_paid':
      case 'invoice_overdue':
        return renderPayment();
      case 'personal_record':
        return renderPR();
      case 'client_joined':
        return renderClientJoined();
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={{
            background: 'var(--bg-card, #0d1117)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            width: isMobile ? '95%' : '480px',
            maxHeight: isMobile ? '88vh' : '75vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 40px ${accentColor}08`,
            overflow: 'hidden',
          }}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header with accent glow */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: `linear-gradient(180deg, ${accentColor}06, transparent)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Avatar with accent ring */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '50%',
                padding: '2px',
                background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}15)`,
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', fontWeight: 700, color: '#fff',
                  background: getAvatarColor(client.id),
                }}>
                  {getInitials(client.name)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                  {client.name}
                </div>
                <div style={{ fontSize: '12px', color: accentColor, marginTop: '2px', fontWeight: 500 }}>
                  {eventLabels[event.type]?.[lang]} · {relativeTime(event.timestamp, lang)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '6px', cursor: 'pointer',
                color: '#64748b', display: 'flex', alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {renderContent()}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            padding: '14px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#94a3b8', fontFamily: 'var(--font-display)',
                transition: 'all 0.15s',
              }}
            >
              {t.close}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Shared styles ──

const sectionTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#64748b',
  marginBottom: '12px',
};

const heroMetricCard: React.CSSProperties = {
  flex: 1,
  padding: '16px 18px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const noteCard: React.CSSProperties = {
  fontSize: '13px',
  color: '#c8cdd8',
  lineHeight: 1.7,
  padding: '12px 16px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
};
