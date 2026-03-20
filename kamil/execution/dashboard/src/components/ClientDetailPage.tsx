import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Calendar, Flame, Target,
  TrendingUp, TrendingDown, Minus, DollarSign,
  Edit3, MessageSquare, FileText, X, Send, Save,
  Activity, Dumbbell, Check, ClipboardCheck, Flag,
  Smile, Frown, Meh, SmilePlus, Angry,
  Moon, Download, Clock, Star,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import jsPDF from 'jspdf';
import GlassCard from './GlassCard';
import ClientInsights from './ClientInsights';
import EngagementPanel from './EngagementPanel';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { calculateMetricChange, buildClientRadarData } from '../utils/client-metrics';
import { calculateEngagement, generateEngagementInsight, getSuggestedAction } from '../utils/engagement';
import { getLocale } from '../lib/locale';
import type { Client, Message, WorkoutProgram, WorkoutLog, WorkoutSetLog, CheckIn, CoachingPlan } from '../types';

interface ClientDetailPageProps {
  clientId: string;
  clients: Client[];
  programs: WorkoutProgram[];
  plans: CoachingPlan[];
  workoutLogs: WorkoutLog[];
  setLogs: WorkoutSetLog[];
  checkIns: CheckIn[];
  messages: Message[];
  onBack: () => void;
  backLabel?: string;
  onUpdateClient: (id: string, updates: Partial<Client>) => void;
  onSendMessage: (msg: Message) => void;
  onUpdateProgram: (programId: string, updates: Partial<WorkoutProgram>) => void;
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  onAddCheckIn: (checkIn: CheckIn) => void;
}

export default function ClientDetailPage({ clientId, clients, programs, plans, workoutLogs, setLogs, checkIns, messages, onBack, backLabel, onUpdateClient, onSendMessage, onUpdateProgram, onUpdateCheckIn, onAddCheckIn: _onAddCheckIn }: ClientDetailPageProps) {
  const isMobile = useIsMobile();
  const { lang, t } = useLang();
  const client = clients.find(c => c.id === clientId);

  // NOTE: All hooks must be called before any early return (React rules of hooks).
  // The `if (!client) return null` below is intentionally placed after all hooks.
  const [activeModal, setActiveModal] = useState<'message' | 'editPlan' | 'notes' | 'logMetrics' | 'assignProgram' | 'checkIn' | 'viewCheckIn' | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [messageText, setMessageText] = useState('');
  const [editPlan, setEditPlan] = useState<string>(client?.plan ?? 'Basic');
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'pending'>(client?.status ?? 'active');
  const [editNotes, setEditNotes] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saveFlash, setSaveFlash] = useState('');
  // @ts-ignore - scaffolded for upcoming check-in-from-coach modal
  const [checkInForm, setCheckInForm] = useState({
    weight: '',
    bodyFat: '',
    mood: '' as string,
    sleepHours: '',
    steps: '',
    energy: '',
    stress: '',
    nutritionScore: '',
    notes: '',
    wins: '',
    challenges: '',
    coachFeedback: '',
  });
  // @ts-ignore - scaffolded for upcoming metrics logging modal
  const [metricsForm, setMetricsForm] = useState({
    weight: '',
    bodyFat: '',
    benchPress: '',
    squat: '',
    deadlift: '',
  });

  // Load client's weekly schedule for calendar
  const [clientSchedule, setClientSchedule] = useState<Record<string, string>>({});
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      // Get the most recent weekly schedule for this client
      const { data } = await supabase
        .from('weekly_schedule')
        .select('day_assignments')
        .eq('client_id', clientId)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.day_assignments) setClientSchedule(data.day_assignments as Record<string, string>);
    })();
  }, [clientId]);

  if (!client) return null;

  const dateLocale = getLocale(lang);

  const weightMetric = calculateMetricChange(client.metrics.weight);
  const hasWeight = client.metrics.weight.length > 0;
  const latestWeight = weightMetric.latestValue;
  const weightChange = weightMetric.change;

  const bfMetric = calculateMetricChange(client.metrics.bodyFat);
  const hasBF = client.metrics.bodyFat.length > 0;
  const latestBF = bfMetric.latestValue;
  const bfChange = bfMetric.change;

  // Deterministic radar values derived from client data
  const radarData = buildClientRadarData(client, {
    strength: t.clientDetail.radarStrength,
    endurance: t.clientDetail.radarEndurance,
    consistency: t.clientDetail.radarConsistency,
    nutrition: t.clientDetail.radarNutrition,
    recovery: t.clientDetail.radarRecovery,
    progress: t.clientDetail.radarProgress,
  });

  const planColors: Record<string, { color: string; bg: string }> = {
    Elite: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
    Premium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
    Basic: { color: 'var(--text-secondary)', bg: 'var(--bg-subtle-hover)' },
  };

  const planLabelMap: Record<string, string> = {
    Basic: t.clients.basic,
    Premium: t.clients.premium,
    Elite: t.clients.elite,
  };

  const statusLabelMap: Record<string, string> = {
    active: t.clients.active,
    paused: t.clients.paused,
    pending: t.clients.pending,
  };

  const assignedPrograms = programs.filter(p => p.clientIds.includes(client.id));

  const flashSaved = (label: string) => {
    setSaveFlash(label);
    setTimeout(() => setSaveFlash(''), 1500);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      clientId: client.id,
      clientName: client.name,
      clientAvatar: '',
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      isFromCoach: true,
    };
    onSendMessage(msg);
    onUpdateClient(client.id, {
      activityLog: [{ type: 'message', description: `Message sent to ${client.name}`, date: new Date().toISOString() }, ...(client.activityLog || [])],
    });
    setMessageText('');
    setActiveModal(null);
    flashSaved(t.clientDetail.messageSent);
  };

  const handleSavePlan = () => {
    const matchedPlan = plans.find(p => p.name === editPlan);
    const rate = matchedPlan ? matchedPlan.price : 0;
    const changes: string[] = [];
    if (editPlan !== client.plan) changes.push(t.clientDetail.planChanged(planLabelMap[client.plan] || client.plan, planLabelMap[editPlan] || editPlan));
    if (editStatus !== client.status) changes.push(t.clientDetail.statusChanged(statusLabelMap[client.status], statusLabelMap[editStatus]));
    const desc = changes.length > 0 ? changes.join(', ') : t.clientDetail.planSaved;
    onUpdateClient(client.id, {
      plan: editPlan, status: editStatus, monthlyRate: rate,
      activityLog: [{ type: 'plan', description: desc, date: new Date().toISOString() }, ...(client.activityLog || [])],
    });
    setActiveModal(null);
    flashSaved(t.clientDetail.planUpdated);
  };

  const handleSaveNotes = () => {
    if (!editNotes.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const newHistory = [{ text: editNotes.trim(), date: today }, ...(client.notesHistory || [])];
    onUpdateClient(client.id, {
      notes: editNotes.trim(),
      notesHistory: newHistory,
      activityLog: [{ type: 'notes', description: 'Notes updated', date: new Date().toISOString() }, ...(client.activityLog || [])],
    });
    setEditNotes('');
    setShowNoteInput(false);
    flashSaved(t.clientDetail.noteAdded);
  };

  const handleToggleKeyNote = (index: number) => {
    const history = [...(client.notesHistory || [])];
    const note = history[index];
    if (!note) return;
    const keyCount = history.filter(n => n.isKey).length;
    if (!note.isKey && keyCount >= 2) return; // max 2 key notes
    history[index] = { ...note, isKey: !note.isKey };
    onUpdateClient(client.id, { notesHistory: history });
  };

  // @ts-ignore - scaffolded for upcoming metrics logging modal
  const handleLogMetrics = () => {
    const updates: Partial<Client> = {
      metrics: { ...client.metrics },
    };
    if (metricsForm.weight) updates.metrics!.weight = [...client.metrics.weight, parseFloat(metricsForm.weight)];
    if (metricsForm.bodyFat) updates.metrics!.bodyFat = [...client.metrics.bodyFat, parseFloat(metricsForm.bodyFat)];
    if (metricsForm.benchPress) updates.metrics!.benchPress = [...client.metrics.benchPress, parseFloat(metricsForm.benchPress)];
    if (metricsForm.squat) updates.metrics!.squat = [...client.metrics.squat, parseFloat(metricsForm.squat)];
    if (metricsForm.deadlift) updates.metrics!.deadlift = [...client.metrics.deadlift, parseFloat(metricsForm.deadlift)];
    onUpdateClient(client.id, updates);
    setMetricsForm({ weight: '', bodyFat: '', benchPress: '', squat: '', deadlift: '' });
    setActiveModal(null);
    flashSaved(t.clientDetail.metricsLogged);
  };

  const handleToggleProgram = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    const isAssigned = program.clientIds.includes(client.id);
    onUpdateProgram(programId, {
      clientIds: isAssigned
        ? program.clientIds.filter(id => id !== client.id)
        : [...program.clientIds, client.id],
    });
    onUpdateClient(client.id, {
      activityLog: [{
        type: 'program',
        description: isAssigned ? `Program "${program.name}" removed` : `Program "${program.name}" assigned`,
        date: new Date().toISOString(),
      }, ...(client.activityLog || [])],
    });
  };

  // ── PDF Export ──
  const handleExportReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'pl' ? 'FitCore - Raport Klienta' : 'FitCore - Client Report', 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, y);
    y += 14;

    // Client Info
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(client.name, 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${client.email}  |  ${client.plan} Plan  |  ${statusLabelMap[client.status]}  |  ${t.clientDetail.since} ${client.startDate}`, 14, y);
    y += 10;

    // Metrics
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'pl' ? 'Kluczowe Metryki' : 'Key Metrics', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const latW = client.metrics.weight[client.metrics.weight.length - 1];
    const latBF = client.metrics.bodyFat[client.metrics.bodyFat.length - 1];
    const latBench = client.metrics.benchPress[client.metrics.benchPress.length - 1];
    const latSquat = client.metrics.squat[client.metrics.squat.length - 1];
    const latDeadlift = client.metrics.deadlift[client.metrics.deadlift.length - 1];
    const metrics = [
      `${t.clientDetail.weight}: ${latW ?? '-'} kg`,
      `${t.clientDetail.bodyFat}: ${latBF ?? '-'}%`,
      `${t.clientDetail.benchPress}: ${latBench ?? '-'} kg`,
      `${t.clientDetail.squat}: ${latSquat ?? '-'} kg`,
      `${t.clientDetail.deadlift}: ${latDeadlift ?? '-'} kg`,
      `${t.clientDetail.monthlyRate}: $${client.monthlyRate}`,
      `${lang === 'pl' ? 'Postęp' : 'Progress'}: ${client.progress}%`,
      `${lang === 'pl' ? 'Passa' : 'Streak'}: ${client.streak} ${lang === 'pl' ? 'dni' : 'days'}`,
    ];
    metrics.forEach(m => { doc.text(m, 14, y); y += 6; });
    y += 4;

    // Goals
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'pl' ? 'Cele' : 'Goals', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    client.goals.forEach(g => { doc.text(`• ${g}`, 14, y); y += 6; });
    y += 4;

    // Notes
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Coach Notes', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (client.notes) {
      const noteLines = doc.splitTextToSize(client.notes, pageWidth - 28);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 5 + 4;
    } else {
      doc.text('No notes yet.', 14, y);
      y += 6;
    }
    y += 4;

    // Recent Activity
    if (client.activityLog && client.activityLog.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.line(14, y, pageWidth - 14, y);
      y += 8;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Recent Activity', 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const recentActivity = client.activityLog.slice(0, 10);
      recentActivity.forEach(a => {
        if (y > 275) { doc.addPage(); y = 20; }
        const date = new Date(a.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
        doc.text(`${date}  -  ${a.description}`, 14, y);
        y += 5;
      });
    }

    // Notes History
    if (client.notesHistory && client.notesHistory.length > 1) {
      y += 6;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.line(14, y, pageWidth - 14, y);
      y += 8;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes History', 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      client.notesHistory.forEach(nh => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(new Date(nh.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }), 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(nh.text, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 4;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('FitCore - Confidential', 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`${client.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    flashSaved('Report exported');
  };

  // Activity icon helper
  const activityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare size={14} color="var(--accent-primary)" />;
      case 'check-in': return <ClipboardCheck size={14} color="var(--accent-success)" />;
      case 'notes': return <FileText size={14} color="var(--accent-secondary)" />;
      case 'program': return <Dumbbell size={14} color="var(--accent-warm)" />;
      case 'plan': return <Edit3 size={14} color="var(--accent-primary)" />;
      default: return <Activity size={14} color="var(--text-tertiary)" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  };

  // ── Engagement Score ──
  const engagementScore = calculateEngagement(client, workoutLogs, checkIns, messages);
  const engagementInsight = generateEngagementInsight(client, engagementScore, lang as 'en' | 'pl');
  const engagementAction = getSuggestedAction(engagementScore, lang as 'en' | 'pl');

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
      {/* Back Button + Client Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={styles.backRow}
      >
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} />
          {backLabel}
        </button>
      </motion.div>

      {/* Save Flash */}
      <AnimatePresence>
        {saveFlash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.saveFlash}
          >
            {saveFlash}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header */}
      <GlassCard delay={0.05}>
        <div style={{ ...styles.profileHeader, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : undefined }}>
          <div style={{ ...styles.profileLeft, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '20px' }}>
            <div style={{ ...styles.bigAvatar, background: getAvatarColor(client.id), ...(isMobile ? { width: '48px', height: '48px', fontSize: '25px' } : {}) }}>
              {getInitials(client.name)}
            </div>
            <div>
              <h2 style={{ ...styles.profileName, fontSize: isMobile ? '18px' : '22px' }}>{client.name}</h2>
              <div style={{ ...styles.profileMeta, flexWrap: 'wrap' }}>
                <Mail size={13} color="var(--text-tertiary)" />
                <span>{client.email}</span>
                <span style={styles.dot} />
                <Calendar size={13} color="var(--text-tertiary)" />
                <span>{t.clientDetail.since} {client.startDate}</span>
              </div>
              <div style={{ ...styles.profileTags, flexWrap: 'wrap' }}>
                <span style={{ ...styles.planTag, color: (planColors[client.plan] || { color: 'var(--accent-primary)', bg: 'var(--accent-primary-dim)' }).color, background: (planColors[client.plan] || { color: 'var(--accent-primary)', bg: 'var(--accent-primary-dim)' }).bg }}>
                  {planLabelMap[client.plan] || client.plan}
                </span>
                <span style={styles.statusTag}>
                  {client.status === 'active' && <Flame size={12} color="var(--accent-success)" />}
                  <span style={{ textTransform: 'capitalize' }}>{statusLabelMap[client.status]}</span>
                </span>
                {client.streak > 0 && (
                  <span style={styles.streakTag}>
                    <Flame size={12} color="var(--accent-warm)" />
                    {client.streak} {t.clientDetail.dayStreak}
                  </span>
                )}
                {assignedPrograms.map(prog => (
                  <span key={prog.id} style={styles.programTag}>
                    <Dumbbell size={12} />
                    {prog.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...styles.profileActions, ...(isMobile ? { width: '100%', flexWrap: 'wrap' } : {}) }}>
            <button onClick={() => setActiveModal('message')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <MessageSquare size={15} />
              {t.clientDetail.sendMessage}
            </button>
            <button onClick={() => setActiveModal('editPlan')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <Edit3 size={15} />
              {t.clientDetail.editPlanStatus}
            </button>
            <button onClick={() => { setShowNoteInput(false); setEditNotes(''); setActiveModal('notes'); }} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <FileText size={15} />
              {t.clientDetail.notes}
            </button>
            <button onClick={() => setActiveModal('assignProgram')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <Dumbbell size={15} />
              {t.clientDetail.assignProgram}
            </button>
            <button onClick={handleExportReport} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}), color: 'var(--accent-primary)' }}>
              <Download size={15} />
              {t.clientDetail.export}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Key Metrics */}
      <div style={{ ...styles.metricsRow, ...(isMobile ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' } : {}) }}>
        <GlassCard delay={0.1} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>{t.clientDetail.weight}</div>
          <div style={styles.metricValue}>
            {latestWeight != null ? latestWeight : '-'} <span style={styles.metricUnit}>kg</span>
          </div>
          {hasWeight && (
          <div style={{ ...styles.metricChange, color: weightChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {weightChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(weightChange).toFixed(1)} kg
          </div>
          )}
        </GlassCard>
        <GlassCard delay={0.12} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>{t.clientDetail.bodyFat}</div>
          <div style={styles.metricValue}>
            {latestBF != null ? latestBF : '-'} <span style={styles.metricUnit}>%</span>
          </div>
          {hasBF && (
          <div style={{ ...styles.metricChange, color: bfChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {bfChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(bfChange).toFixed(1)}%
          </div>
          )}
        </GlassCard>
        <GlassCard delay={0.14} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>{t.clientDetail.monthlyRate}</div>
          <div style={styles.metricValue}>
            <DollarSign size={20} style={{ opacity: 0.5 }} />
            {client.monthlyRate}
          </div>
          <div style={{ ...styles.metricChange, color: 'var(--text-tertiary)' }}>
            <Minus size={14} />
            per month
          </div>
        </GlassCard>
        <GlassCard delay={0.16} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>Overall Progress</div>
          <div style={styles.metricValue}>{client.progress}%</div>
          <div style={styles.bigProgressBar}>
            <motion.div
              style={{
                ...styles.bigProgressFill,
                background: client.progress > 80 ? 'var(--accent-success)' :
                            client.progress > 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${client.progress}%` }}
              transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </GlassCard>
      </div>

      {/* Smart Insights (replaces weight/bf trend + strength profile charts) */}
      <ClientInsights
        client={client}
        workoutLogs={workoutLogs}
        setLogs={setLogs}
        checkIns={checkIns}
        program={assignedPrograms.find(p => p.status === 'active') ?? assignedPrograms[0] ?? null}
        t={{
          insightsTitle: t.clientDetail.insightsTitle,
          insightsSub: t.clientDetail.insightsSub,
          showMore: t.clientDetail.showMore,
          showLess: t.clientDetail.showLess,
          noInsights: t.clientDetail.noInsights,
        }}
      />

      {/* Engagement Score Panel */}
      <EngagementPanel
        score={engagementScore}
        insight={engagementInsight}
        suggestedAction={engagementAction}
        onAction={(type) => {
          if (type === 'motivation' || type === 'call') setActiveModal('message');
        }}
        t={{
          title: t.engagement.title,
          subtitle: t.engagement.subtitle,
          workoutCompletion: t.engagement.workoutCompletion,
          checkInRate: t.engagement.checkInRate,
          messageResponsiveness: t.engagement.messageResponsiveness,
          streakLength: t.engagement.streakLength,
          goalProgress: t.engagement.goalProgress,
          trend8Weeks: t.engagement.trend8Weeks,
          aiInsight: t.engagement.aiInsight,
          suggestedAction: t.engagement.suggestedAction,
          last14Days: t.engagement.last14Days,
        }}
      />

      {/* Training History */}
      {(() => {
        const clientLogs = workoutLogs
          .filter(w => w.clientId === client.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const completedSessions = clientLogs.filter(w => w.completed).length;
        const avgDuration = completedSessions > 0 ? Math.round(clientLogs.filter(w => w.completed).reduce((s, w) => s + w.duration, 0) / completedSessions) : 0;

        // Build month calendar data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Count planned sessions this month from schedule
        const calYear = today.getFullYear();
        const calMonth = today.getMonth();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        let plannedThisMonth = 0;
        let completedThisMonth = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const cellDate = new Date(calYear, calMonth, d);
          const dow = (cellDate.getDay() + 6) % 7;
          if (clientSchedule[String(dow)]) plannedThisMonth++;
          const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (clientLogs.some(w => w.date === dateKey && w.completed)) completedThisMonth++;
        }
        const completionRate = plannedThisMonth > 0 ? Math.round((completedThisMonth / plannedThisMonth) * 100) : 0;
        const ringR = 18;
        const ringC = 2 * Math.PI * ringR;
        const ringOff = ringC - (completionRate / 100) * ringC;

        const logsByDate: Record<string, WorkoutLog[]> = {};
        clientLogs.forEach(w => {
          if (!logsByDate[w.date]) logsByDate[w.date] = [];
          logsByDate[w.date].push(w);
        });

        // Current month grid
        const firstDay = new Date(calYear, calMonth, 1);
        const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
        const monthName = firstDay.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });

        // Build 6-row x 7-col grid (pad with nulls)
        const calendarCells: (number | null)[] = [];
        for (let i = 0; i < startDow; i++) calendarCells.push(null);
        for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
        while (calendarCells.length < 42) calendarCells.push(null);

        const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        return (
          <div>
            {/* Month Calendar */}
            <GlassCard delay={0.28}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={styles.chartTitle}>Training Activity</h3>
                  <p style={styles.trainingSubtitle}>{monthName}</p>
                </div>
              </div>

              {/* Stats row - 3 mini cards */}
              <div style={styles.calStatsRow}>
                <div style={styles.calStatCard}>
                  <Dumbbell size={16} color="var(--accent-primary)" />
                  <span style={styles.calStatValue}>{completedThisMonth}/{plannedThisMonth}</span>
                  <span style={styles.calStatLabel}>sessions</span>
                </div>
                <div style={styles.calStatCard}>
                  <svg width="44" height="44" viewBox="0 0 44 44" style={{ marginTop: '-2px', marginBottom: '-2px' }}>
                    <circle cx="22" cy="22" r={ringR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle
                      cx="22" cy="22" r={ringR}
                      fill="none"
                      stroke={completionRate >= 80 ? '#20dba4' : completionRate >= 50 ? 'var(--accent-warm)' : '#e8637a'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={ringC}
                      strokeDashoffset={ringOff}
                      transform="rotate(-90 22 22)"
                    />
                    <text x="22" y="23" textAnchor="middle" dominantBaseline="middle"
                      fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                      {completionRate}
                    </text>
                  </svg>
                  <span style={styles.calStatLabel}>completion %</span>
                </div>
                <div style={styles.calStatCard}>
                  <Clock size={16} color="var(--accent-warm)" />
                  <span style={styles.calStatValue}>{avgDuration}</span>
                  <span style={styles.calStatLabel}>avg min</span>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div style={{ ...styles.calGrid, ...(isMobile ? { gap: '2px' } : {}) }}>
                {dayHeaders.map(d => (
                  <div key={d} style={styles.calDayHeader}>{d}</div>
                ))}

                {/* Calendar cells */}
                {calendarCells.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} style={styles.calCellEmpty} />;

                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const entries = logsByDate[dateKey];
                  const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  const isFuture = new Date(calYear, calMonth, day) > today;
                  // Check if this day has a planned workout from the client's schedule
                  const cellDate = new Date(calYear, calMonth, day);
                  const dow = (cellDate.getDay() + 6) % 7; // Mon=0, Sun=6
                  const plannedDayId = clientSchedule[String(dow)];
                  const isPlanned = !!plannedDayId;
                  // Resolve planned workout name from program
                  const clientProgram = programs.find(p => p.clientIds.includes(client.id));
                  const plannedDayName = isPlanned && clientProgram
                    ? clientProgram.days.find(d => d.id === plannedDayId)?.name ?? ''
                    : '';

                  const allCompleted = entries?.every(e => e.completed);
                  const hasMissed = entries && !allCompleted;
                  const shortType = entries?.[0]?.type
                    .replace('Upper Body ', 'Upper ')
                    .replace('Lower Body ', 'Lower ') ?? '';

                  return (
                    <div
                      key={dateKey}
                      title={entries ? entries.map(e => `${e.type} (${e.duration}min)`).join(', ') : dateKey}
                      onClick={() => (entries || (isPlanned && !isFuture)) ? setSelectedCalDay(selectedCalDay === dateKey ? null : dateKey) : null}
                      style={{
                        ...styles.calCell,
                        ...(isMobile ? { minHeight: '36px', padding: '0 1px 3px' } : {}),
                        ...((entries || (isPlanned && !isFuture)) ? { cursor: 'pointer' } : {}),
                        ...(selectedCalDay === dateKey ? { boxShadow: '0 0 0 2px var(--accent-primary)', border: '1px solid var(--accent-primary)' } : {}),
                        ...(entries && allCompleted ? {
                          background: isToday ? 'rgba(32,219,164,0.18)' : 'rgba(32,219,164,0.12)',
                          border: `1px solid ${isToday ? 'rgba(32,219,164,0.5)' : 'rgba(32,219,164,0.35)'}`,
                          boxShadow: isToday ? '0 0 8px rgba(32,219,164,0.15)' : 'none',
                        } : entries && !isFuture && hasMissed ? {
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.25)',
                        } : isPlanned && !isFuture && !entries ? {
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.25)',
                        } : isToday ? {
                          background: isPlanned ? 'rgba(59,130,246,0.1)' : 'rgba(0,229,200,0.08)',
                          border: `1px solid ${isPlanned ? 'rgba(59,130,246,0.3)' : 'rgba(0,229,200,0.25)'}`,
                          boxShadow: '0 0 8px rgba(0,229,200,0.1)',
                        } : isPlanned && isFuture ? {
                          background: 'rgba(59,130,246,0.08)',
                          border: '1px solid rgba(59,130,246,0.25)',
                        } : isFuture ? {
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.02)',
                          opacity: 0.4,
                        } : {
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid transparent',
                        }),
                      }}
                    >
                      {/* Status bar */}
                      <div style={{
                        ...styles.calStatusBar,
                        background: entries && !isFuture && allCompleted ? '#20dba4'
                          : entries && !isFuture && hasMissed ? '#e8637a'
                          : isPlanned && !isFuture && !entries ? '#e8637a'
                          : isToday ? 'var(--accent-primary)'
                          : isPlanned && isFuture ? '#3b82f6'
                          : 'transparent',
                      }} />
                      <span style={{
                        ...styles.calDayNum,
                        color: isToday ? 'var(--accent-primary)'
                          : entries && !isFuture && allCompleted ? '#20dba4'
                          : entries && !isFuture && hasMissed ? '#e8637a'
                          : 'var(--text-secondary)',
                        fontWeight: 700,
                      }}>
                        {day}
                      </span>
                      {entries && !isFuture ? (
                        <span style={{
                          ...styles.calSessionType,
                          color: allCompleted ? '#20dba4' : '#e8637a',
                        }}>
                          {shortType}
                        </span>
                      ) : isPlanned && plannedDayName ? (
                        <span style={{
                          ...styles.calSessionType,
                          color: isFuture ? '#3b82f6' : '#e8637a',
                          fontSize: isMobile ? '6px' : '8px',
                        }}>
                          {plannedDayName.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={styles.calLegend}>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: '#20dba4' }} />
                  <span>Completed</span>
                </div>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: '#e8637a' }} />
                  <span>Missed</span>
                </div>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: '#3b82f6' }} />
                  <span>Planned</span>
                </div>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: 'var(--accent-primary)' }} />
                  <span>Today</span>
                </div>
              </div>

              {/* Selected day detail panel */}
              {selectedCalDay && (() => {
                const dayEntries = logsByDate[selectedCalDay];
                const dayDate = new Date(selectedCalDay);
                const dayLabel = dayDate.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
                const workoutType = dayEntries?.[0]?.type ?? '';

                // Get the exercises for this workout day from the program
                const clientProg = programs.find(p => p.clientIds.includes(client.id));
                const programDay = clientProg?.days.find(d => d.name === workoutType);
                const programExerciseNames = programDay ? programDay.exercises.map(e => e.name) : [];

                // Filter set logs to only this day's exercises
                const daySetLogs = setLogs
                  .filter(l => l.clientId === client.id && l.date === selectedCalDay && l.completed)
                  .filter(l => programExerciseNames.length === 0 || programExerciseNames.includes(l.exerciseName))
                  .sort((a, b) => {
                    // Sort by program exercise order
                    const aIdx = programExerciseNames.indexOf(a.exerciseName);
                    const bIdx = programExerciseNames.indexOf(b.exerciseName);
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx || a.setNumber - b.setNumber;
                    return a.exerciseName.localeCompare(b.exerciseName) || a.setNumber - b.setNumber;
                  });

                // Group set logs by exercise name (preserving order)
                const exerciseGroups: [string, typeof daySetLogs][] = [];
                const seen = new Set<string>();
                for (const log of daySetLogs) {
                  if (!seen.has(log.exerciseName)) {
                    seen.add(log.exerciseName);
                    exerciseGroups.push([log.exerciseName, daySetLogs.filter(l => l.exerciseName === log.exerciseName)]);
                  }
                }

                // Filter out instruction/note rows (very long names are likely coach notes, not exercises)
                const cleanGroups = exerciseGroups.filter(([name]) => name.length < 60);

                return (
                  <div style={{
                    marginTop: '12px', borderRadius: '12px',
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 16px', borderBottom: '1px solid var(--glass-border)',
                      background: 'rgba(0,229,200,0.04)',
                    }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{dayLabel}</div>
                        {workoutType && (
                          <div style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '2px' }}>{workoutType}</div>
                        )}
                      </div>
                      <button onClick={() => setSelectedCalDay(null)} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px',
                        width: '28px', height: '28px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>×</button>
                    </div>

                    {/* Exercise list */}
                    {cleanGroups.length > 0 ? (
                      <div style={{ padding: '8px 0' }}>
                        {cleanGroups.map(([name, sets], idx) => {
                          const hasSomeWeight = sets.some(s => s.weight && s.weight !== '0' && s.weight !== '-');
                          return (
                            <div key={name} style={{
                              display: 'flex', alignItems: 'center', gap: '12px',
                              padding: '10px 16px',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                            }}>
                              <span style={{
                                width: '24px', height: '24px', borderRadius: '6px',
                                background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0,
                              }}>{idx + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {hasSomeWeight
                                    ? sets.map(s => `${s.weight}kg ×${s.reps}`).join('  /  ')
                                    : `${sets.length} sets × ${sets[0]?.reps ?? '-'} reps`
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '20px 16px', fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                        {dayEntries ? (lang === 'pl' ? 'Brak szczegółów zestawów' : 'No set details logged') : (lang === 'pl' ? 'Zaplanowany trening' : 'Planned workout')}
                      </div>
                    )}
                  </div>
                );
              })()}
            </GlassCard>

          </div>
        );
      })()}

      {/* Check-In History */}
      {(() => {
        const clientCheckIns = checkIns
          .filter(ci => ci.clientId === client.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const nextScheduled = clientCheckIns.find(ci => ci.status === 'scheduled');
        const completed = clientCheckIns.filter(ci => ci.status === 'completed');
        const missed = clientCheckIns.filter(ci => ci.status === 'missed');
        const avgMood = completed.length > 0
          ? (completed.reduce((s, ci) => s + (ci.mood || 0), 0) / completed.filter(ci => ci.mood).length).toFixed(1)
          : '-';
        const avgSteps = completed.length > 0
          ? Math.round(completed.reduce((s, ci) => s + (ci.steps || 0), 0) / completed.filter(ci => ci.steps).length)
          : 0;

        const moodIcons: Record<number, { icon: typeof Smile; color: string }> = {
          1: { icon: Angry, color: 'var(--accent-danger)' },
          2: { icon: Frown, color: 'var(--accent-warm)' },
          3: { icon: Meh, color: 'var(--text-secondary)' },
          4: { icon: Smile, color: 'var(--accent-success)' },
          5: { icon: SmilePlus, color: 'var(--accent-primary)' },
        };

        return (
          <GlassCard delay={0.3}>
            <div style={styles.trainingSectionHeader}>
              <div>
                <h3 style={styles.chartTitle}>Check-In History</h3>
                {nextScheduled && (
                  <p style={styles.trainingSubtitle}>
                    Next: {new Date(nextScheduled.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
              <div style={styles.trainingStats}>
                <div style={styles.trainingStat}>
                  <span style={styles.trainingStatValue}>{completed.length}</span>
                  <span style={styles.trainingStatLabel}>done</span>
                </div>
                <div style={styles.trainingStat}>
                  <span style={styles.trainingStatValue}>{missed.length}</span>
                  <span style={styles.trainingStatLabel}>missed</span>
                </div>
                <div style={styles.trainingStat}>
                  <span style={styles.trainingStatValue}>{avgMood}</span>
                  <span style={styles.trainingStatLabel}>avg mood</span>
                </div>
                <div style={styles.trainingStat}>
                  <span style={{ ...styles.trainingStatValue, color: avgSteps >= 8000 ? 'var(--accent-success)' : avgSteps >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                    {avgSteps.toLocaleString()}
                  </span>
                  <span style={styles.trainingStatLabel}>avg steps</span>
                </div>
              </div>
            </div>

            <div style={styles.checkInList}>
              {clientCheckIns.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '18px' }}>
                  No check-ins yet.
                </div>
              )}
              {clientCheckIns.map((ci, idx) => {
                const MoodIcon = ci.mood ? moodIcons[ci.mood]?.icon || Meh : null;
                const moodColor = ci.mood ? moodIcons[ci.mood]?.color || 'var(--text-secondary)' : '';
                const statusColor = ci.status === 'completed' ? 'var(--accent-success)' : ci.status === 'scheduled' ? 'var(--accent-primary)' : 'var(--accent-danger)';
                const statusBg = ci.status === 'completed' ? 'var(--accent-success-dim)' : ci.status === 'scheduled' ? 'var(--accent-primary-dim)' : 'rgba(239,68,68,0.1)';

                return (
                  <motion.div
                    key={ci.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => {
                      if (ci.status === 'completed') {
                        setSelectedCheckIn(ci);
                        setActiveModal('viewCheckIn');
                      }
                    }}
                    style={{
                      ...styles.checkInRow,
                      cursor: ci.status === 'completed' ? 'pointer' : 'default',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? '8px' : '16px',
                    }}
                  >
                    <div style={styles.checkInDate}>
                      <Calendar size={13} color={statusColor} />
                      <span>{new Date(ci.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {ci.status === 'completed' && (
                      <div style={{ ...styles.checkInMetrics, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                        {ci.weight && <span style={styles.checkInChip}>{ci.weight} kg</span>}
                        {ci.bodyFat && <span style={styles.checkInChip}>{ci.bodyFat}% BF</span>}
                        {ci.sleepHours && (
                          <span style={styles.checkInChip}>
                            <Moon size={10} /> {ci.sleepHours}h
                          </span>
                        )}
                        {ci.steps !== null && (
                          <span style={{
                            ...styles.checkInChip,
                            color: ci.steps >= 8000 ? 'var(--accent-success)' : ci.steps >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                          }}>
                            {ci.steps.toLocaleString()} steps
                          </span>
                        )}
                        {ci.energy !== null && ci.energy !== undefined && (
                          <span style={styles.checkInChip}>E:{ci.energy}</span>
                        )}
                        {ci.stress !== null && ci.stress !== undefined && (
                          <span style={{
                            ...styles.checkInChip,
                            color: ci.stress >= 7 ? 'var(--accent-danger)' : ci.stress >= 5 ? 'var(--accent-warm)' : 'var(--text-secondary)',
                          }}>S:{ci.stress}</span>
                        )}
                        {MoodIcon && (
                          <span style={{ ...styles.checkInChip, color: moodColor }}>
                            <MoodIcon size={12} />
                          </span>
                        )}
                      </div>
                    )}

                    <span style={{ ...styles.checkInStatusBadge, color: statusColor, background: statusBg, marginLeft: isMobile ? '0' : 'auto' }}>
                      {ci.status}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        );
      })()}

      {/* Activity Timeline */}
      {client.activityLog && client.activityLog.length > 0 && (
        <GlassCard delay={0.28}>
          <div style={styles.trainingSectionHeader}>
            <div>
              <h3 style={styles.chartTitle}>{t.clientDetail.activityLog}</h3>
              <p style={styles.trainingSubtitle}>{client.activityLog.length} events</p>
            </div>
          </div>
          <div style={styles.activityTimeline}>
            {client.activityLog
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8)
              .map((event, idx) => (
                <motion.div
                  key={`${event.date}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={styles.activityItem}
                >
                  <div style={styles.activityIcon}>{activityIcon(event.type)}</div>
                  <div style={styles.activityContent}>
                    <span style={styles.activityDesc}>{event.description}</span>
                    <span style={styles.activityTime}>
                      <Clock size={11} />
                      {timeAgo(event.date)}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </GlassCard>
      )}

      {/* Bottom Row */}
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Performance Radar */}
        <GlassCard delay={0.3}>
          <h3 style={styles.chartTitle}>{t.clientDetail.progressTracker}</h3>
          <div style={{ height: 260, marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-subtle-strong)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 15, fill: '#8b92a5' }} />
                <Radar
                  dataKey="value"
                  stroke="#00e5c8"
                  fill="#00e5c8"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Goals + Coach Notes */}
        <GlassCard delay={0.35}>
          <h3 style={styles.chartTitle}>Goals</h3>
          <div style={styles.goalsList}>
            {client.goals.map((goal, i) => (
              <motion.div
                key={i}
                style={styles.goalItem}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <Target size={16} color="var(--accent-primary)" />
                <span>{goal}</span>
              </motion.div>
            ))}
          </div>

          <div style={styles.divider} />

          <h3 style={{ ...styles.chartTitle, marginTop: '16px' }}>Coach Notes</h3>
          <p style={styles.notes}>{client.notes}</p>
        </GlassCard>
      </div>

      {/* Modals */}
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
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  {activeModal === 'message' && t.clientDetail.sendMessage}
                  {activeModal === 'editPlan' && t.clientDetail.editPlanStatus}
                  {activeModal === 'notes' && t.clientDetail.notes}
                  {activeModal === 'assignProgram' && t.clientDetail.assignProgram}
                  {activeModal === 'viewCheckIn' && 'Check-In Details'}
                </h3>
                <button onClick={() => setActiveModal(null)} style={styles.closeBtn}>
                  <X size={18} />
                </button>
              </div>

              {/* Message Modal */}
              {activeModal === 'message' && (
                <div style={styles.modalBody}>
                  <div style={styles.modalRecipient}>
                    <span style={styles.modalLabel}>To</span>
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
                <div style={styles.modalBody}>
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
                                <div style={{ fontSize: '14px', opacity: 0.7 }}>${p.price}{cycleSuffix}</div>
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
                <div style={styles.modalBody}>
                  {/* Add Note toggle */}
                  {!showNoteInput ? (
                    <button
                      onClick={() => setShowNoteInput(true)}
                      style={styles.addNoteBtn}
                    >
                      <Edit3 size={14} />
                      Add Note
                    </button>
                  ) : (
                    <div style={styles.modalField}>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        style={styles.modalTextarea}
                        rows={4}
                        placeholder="Write a new note..."
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
                          History ({client.notesHistory.length})
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
                                      <Star size={9} /> KEY
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleToggleKeyNote(i)}
                                  style={{
                                    ...styles.keyToggleBtn,
                                    ...(nh.isKey
                                      ? { color: 'var(--accent-warm)', borderColor: 'var(--accent-warm)' }
                                      : keyCount >= 2
                                        ? { opacity: 0.3, cursor: 'not-allowed' }
                                        : {}
                                    ),
                                  }}
                                  title={nh.isKey ? 'Remove key note' : keyCount >= 2 ? 'Max 2 key notes' : 'Mark as key note'}
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
                      No notes yet. Click "Add Note" to get started.
                    </p>
                  )}
                </div>
              )}

              {/* Assign Program Modal */}
              {activeModal === 'assignProgram' && (
                <div style={styles.modalBody}>
                  <p style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: 0 }}>
                    Select which programs to assign to <strong style={{ color: 'var(--text-primary)' }}>{client.name}</strong>:
                  </p>
                  <div style={styles.programList}>
                    {programs.filter(p => !p.isTemplate).length === 0 ? (
                      <p style={{ fontSize: '18px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
                        No programs available. Create one in the Programs page first.
                      </p>
                    ) : (
                      programs.filter(p => !p.isTemplate).map(prog => {
                        const isAssigned = prog.clientIds.includes(client.id);
                        return (
                          <button
                            key={prog.id}
                            onClick={() => handleToggleProgram(prog.id)}
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
                                {prog.status} &middot; {prog.days.length} days &middot; {prog.durationWeeks}w
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
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* View Check-In Detail Modal */}
              {activeModal === 'viewCheckIn' && selectedCheckIn && (
                <div style={{ ...styles.modalBody, maxHeight: '70vh', overflowY: 'auto' }}>
                  <div style={styles.checkInDetailGrid}>
                    <div style={styles.checkInDetailItem}>
                      <span style={styles.checkInDetailLabel}>Date</span>
                      <span style={styles.checkInDetailValue}>
                        {new Date(selectedCheckIn.date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {selectedCheckIn.weight && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>{t.clientDetail.weight}</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.weight} kg</span>
                      </div>
                    )}
                    {selectedCheckIn.bodyFat && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>{t.clientDetail.bodyFat}</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.bodyFat}%</span>
                      </div>
                    )}
                    {selectedCheckIn.mood && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Mood</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.mood}/5</span>
                      </div>
                    )}
                    {selectedCheckIn.energy !== null && selectedCheckIn.energy !== undefined && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Energy</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.energy}/10</span>
                      </div>
                    )}
                    {selectedCheckIn.stress !== null && selectedCheckIn.stress !== undefined && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Stress</span>
                        <span style={{ ...styles.checkInDetailValue, color: (selectedCheckIn.stress || 0) >= 7 ? 'var(--accent-danger)' : (selectedCheckIn.stress || 0) >= 5 ? 'var(--accent-warm)' : 'var(--accent-success)' }}>
                          {selectedCheckIn.stress}/10
                        </span>
                      </div>
                    )}
                    {selectedCheckIn.sleepHours && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Sleep</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.sleepHours}h</span>
                      </div>
                    )}
                    {selectedCheckIn.steps !== null && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Steps</span>
                        <span style={{ ...styles.checkInDetailValue, color: (selectedCheckIn.steps || 0) >= 8000 ? 'var(--accent-success)' : (selectedCheckIn.steps || 0) >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                          {(selectedCheckIn.steps || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedCheckIn.nutritionScore !== null && selectedCheckIn.nutritionScore !== undefined && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Nutrition</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.nutritionScore}/10</span>
                      </div>
                    )}
                  </div>

                  {selectedCheckIn.notes && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Client Notes</span>
                      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)' }}>
                        {selectedCheckIn.notes}
                      </p>
                    </div>
                  )}

                  {selectedCheckIn.wins && (
                    <div style={styles.modalField}>
                      <span style={{ ...styles.modalLabel, color: 'var(--accent-success)' }}>Wins</span>
                      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-success-dim)', border: '1px solid rgba(34,197,94,0.1)' }}>
                        {selectedCheckIn.wins}
                      </p>
                    </div>
                  )}

                  {selectedCheckIn.challenges && (
                    <div style={styles.modalField}>
                      <span style={{ ...styles.modalLabel, color: 'var(--accent-warm)' }}>Challenges</span>
                      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-warm-dim)', border: '1px solid rgba(245,158,11,0.1)' }}>
                        {selectedCheckIn.challenges}
                      </p>
                    </div>
                  )}

                  {/* Editable Coach Feedback */}
                  <div style={styles.modalField}>
                    <span style={{ ...styles.modalLabel, color: 'var(--accent-primary)' }}>Coach Feedback</span>
                    <textarea
                      defaultValue={selectedCheckIn.coachFeedback}
                      onChange={(e) => setSelectedCheckIn(prev => prev ? { ...prev, coachFeedback: e.target.value } : null)}
                      placeholder="Add your feedback for this check-in..."
                      style={styles.modalTextarea}
                      rows={3}
                    />
                  </div>

                  {selectedCheckIn.reviewStatus === 'flagged' && selectedCheckIn.flagReason && (
                    <div style={styles.modalField}>
                      <span style={{ ...styles.modalLabel, color: 'var(--accent-danger)' }}>Flagged</span>
                      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        {selectedCheckIn.flagReason}
                      </p>
                    </div>
                  )}

                  {/* Review Status Badge */}
                  {selectedCheckIn.reviewStatus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>{t.clientDetail.status}:</span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        fontSize: '15px',
                        textTransform: 'capitalize' as const,
                        color: selectedCheckIn.reviewStatus === 'reviewed' ? 'var(--accent-success)' : selectedCheckIn.reviewStatus === 'flagged' ? 'var(--accent-danger)' : 'var(--accent-warm)',
                        background: selectedCheckIn.reviewStatus === 'reviewed' ? 'var(--accent-success-dim)' : selectedCheckIn.reviewStatus === 'flagged' ? 'rgba(239,68,68,0.1)' : 'var(--accent-warm-dim)',
                      }}>
                        {selectedCheckIn.reviewStatus}
                      </span>
                    </div>
                  )}

                  <div style={styles.modalActions}>
                    <button onClick={() => { setActiveModal(null); setSelectedCheckIn(null); }} style={styles.modalCancelBtn}>
                      {t.clientDetail.cancel}
                    </button>
                    {selectedCheckIn.reviewStatus !== 'flagged' && (
                      <button
                        onClick={() => {
                          const reason = window.prompt('Flag reason (e.g. needs program change, schedule a call):');
                          if (reason) {
                            onUpdateCheckIn(selectedCheckIn.id, { coachFeedback: selectedCheckIn.coachFeedback, reviewStatus: 'flagged', flagReason: reason });
                            setActiveModal(null);
                            setSelectedCheckIn(null);
                            flashSaved('Check-in flagged');
                          }
                        }}
                        style={{ ...styles.modalCancelBtn, color: 'var(--accent-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        <Flag size={14} />
                        Flag
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onUpdateCheckIn(selectedCheckIn.id, { coachFeedback: selectedCheckIn.coachFeedback, reviewStatus: 'reviewed' });
                        setActiveModal(null);
                        setSelectedCheckIn(null);
                        flashSaved('Check-in reviewed');
                      }}
                      style={styles.modalPrimaryBtn}
                    >
                      <Save size={14} />
                      {selectedCheckIn.reviewStatus === 'reviewed' ? t.clientDetail.save : 'Mark Reviewed'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  saveFlash: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-success-dim)',
    border: '1px solid rgba(34,197,94,0.2)',
    color: 'var(--accent-success)',
    fontSize: '18px',
    fontWeight: 600,
    textAlign: 'center',
  },
  backRow: {
    display: 'flex',
    alignItems: 'center',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'color 0.15s',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  profileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  bigAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '31px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  profileName: {
    fontSize: '31px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  profileMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '18px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  dot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
  },
  profileTags: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
  },
  planTag: {
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  statusTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-subtle)',
    padding: '3px 10px',
    borderRadius: '20px',
  },
  streakTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '17px',
    color: 'var(--accent-warm)',
    background: 'var(--accent-warm-dim)',
    padding: '3px 10px',
    borderRadius: '20px',
  },
  profileActions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  metricsRow: {
    display: 'flex',
    gap: '16px',
  },
  metricLabel: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '39px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-1px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  metricUnit: {
    fontSize: '20px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  metricChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '17px',
    fontWeight: 500,
    marginTop: '4px',
  },
  bigProgressBar: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'var(--bg-subtle-hover)',
    overflow: 'hidden',
    marginTop: '8px',
  },
  bigProgressFill: {
    height: '100%',
    borderRadius: '3px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  chartTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  chartLegend: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  goalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px',
  },
  goalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '16px 0 0',
  },
  notes: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginTop: '8px',
  },
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
  programTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
  },
  trainingGrid: {},
  trainingSectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  trainingSubtitle: {
    fontSize: '17px',
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
  trainingStats: {
    display: 'flex',
    gap: '16px',
  },
  trainingStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  trainingStatValue: {
    fontSize: '25px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
  },
  trainingStatLabel: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  calStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  calStatCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px 6px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
  },
  calStatValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  calStatLabel: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  calDayHeader: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const,
    padding: '2px 0 6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  calCellEmpty: {
    minHeight: '52px',
    borderRadius: '8px',
  },
  calCell: {
    minHeight: '52px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    cursor: 'default',
    transition: 'all 0.15s ease',
    border: '1px solid transparent',
    overflow: 'hidden',
    padding: '0 2px 5px',
  },
  calStatusBar: {
    width: '100%',
    height: '2.5px',
    borderRadius: '0 0 1px 1px',
    marginBottom: '4px',
    flexShrink: 0,
  },
  calDayNum: {
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
  },
  calSessionType: {
    fontSize: '9px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2px',
    lineHeight: 1.2,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginTop: '3px',
  },
  calLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
    justifyContent: 'center',
  },
  calLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  calLegendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  modalInput: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
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
  // Check-in styles
  checkInList: {
    display: 'flex',
    flexDirection: 'column',
  },
  checkInRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.1s',
  },
  checkInDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    minWidth: '130px',
    flexShrink: 0,
  },
  checkInMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  checkInChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '15px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  checkInStatusBadge: {
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    textTransform: 'capitalize' as const,
    flexShrink: 0,
  },
  moodPicker: {
    display: 'flex',
    gap: '6px',
  },
  moodOption: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '10px 4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
  checkInDetailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  checkInDetailItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--glass-border)',
  },
  checkInDetailLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  checkInDetailValue: {
    fontSize: '22px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
  },
  // Activity Timeline styles
  activityTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.1s',
    borderBottom: '1px solid var(--border-subtle)',
  },
  activityIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--bg-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: '8px',
    minWidth: 0,
  },
  activityDesc: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activityTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  // Notes History styles
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
