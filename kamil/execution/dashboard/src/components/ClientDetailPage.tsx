import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Calendar, Flame, Target,
  TrendingUp, TrendingDown, Minus,
  Edit3, MessageSquare, FileText,
  Dumbbell, ChevronDown, Sparkles,
  Download,
} from 'lucide-react';
// recharts radar removed — no longer used
import jsPDF from 'jspdf';
import GlassCard from './GlassCard';
import ClientInsights from './ClientInsights';
import EngagementPanel from './EngagementPanel';
import ClientDetailTrainingCalendar from './ClientDetailTrainingCalendar';
import ClientDetailCheckIns from './ClientDetailCheckIns';
import ClientDetailActivity from './ClientDetailActivity';
import ClientDetailModals from './ClientDetailModals';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { calculateMetricChange } from '../utils/client-metrics';
import { calculateEngagement, generateEngagementInsight, getSuggestedAction } from '../utils/engagement';
import { getLocale, formatCurrency } from '../lib/locale';
import type { Client, GoalTargets, Message, WorkoutProgram, WorkoutLog, WorkoutSetLog, CheckIn, CoachingPlan } from '../types';
import { Check, X } from 'lucide-react';

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
  const [saveFlash, setSaveFlash] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    insights: !isMobile,
    engagement: !isMobile,
    habits: !isMobile,
    checkIns: !isMobile,
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
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
  const [editingGoals, setEditingGoals] = useState(false);
  const [editGoalTargets, setEditGoalTargets] = useState<GoalTargets>({});
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

  // ── Modal callback handlers (bridging sub-components to parent state) ──

  const handleSendMessageFromModal = (text: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      clientId: client.id,
      clientName: client.name,
      clientAvatar: '',
      text,
      timestamp: new Date().toISOString(),
      isRead: true,
      isFromCoach: true,
    };
    onSendMessage(msg);
    onUpdateClient(client.id, {
      activityLog: [{ type: 'message', description: `Message sent to ${client.name}`, date: new Date().toISOString() }, ...(client.activityLog || [])],
    });
    flashSaved(t.clientDetail.messageSent);
  };

  const handleSavePlanFromModal = (editPlan: string, editStatus: 'active' | 'paused' | 'pending') => {
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
    flashSaved(t.clientDetail.planUpdated);
  };

  const handleSaveNotesFromModal = (text: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newHistory = [{ text, date: today }, ...(client.notesHistory || [])];
    onUpdateClient(client.id, {
      notes: text,
      notesHistory: newHistory,
      activityLog: [{ type: 'notes', description: t.clientDetail.notesUpdatedLog, date: new Date().toISOString() }, ...(client.activityLog || [])],
    });
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
        description: isAssigned ? t.clientDetail.programRemovedLog(program.name) : t.clientDetail.programAssignedLog(program.name),
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
    doc.text(t.clientDetail.pdfClientReport, 14, y);
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
    doc.text(t.clientDetail.pdfKeyMetrics, 14, y);
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
      `${t.clientDetail.monthlyRate}: ${formatCurrency(client.monthlyRate, lang)}`,
      `${t.clientDetail.pdfProgress}: ${client.progress}%`,
      `${t.clientDetail.pdfStreak}: ${client.streak} ${t.clientDetail.pdfStreakDays}`,
    ];
    metrics.forEach(m => { doc.text(m, 14, y); y += 6; });
    y += 4;

    // Goals
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(t.clientDetail.pdfGoals, 14, y);
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
    doc.text(t.clientDetail.coachNotes, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (client.notes) {
      const noteLines = doc.splitTextToSize(client.notes, pageWidth - 28);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 5 + 4;
    } else {
      doc.text(t.clientDetail.pdfNoNotes, 14, y);
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
      doc.text(t.clientDetail.recentActivityPdf, 14, y);
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
      doc.text(t.clientDetail.notesHistoryPdf, 14, y);
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
      doc.text(t.clientDetail.confidential, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(t.clientDetail.pageOf(i, pageCount), pageWidth - 40, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`${client.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    flashSaved(t.clientDetail.reportExported);
  };

  // ── Engagement Score ──
  const engagementScore = calculateEngagement(client, workoutLogs, checkIns, messages);
  const engagementInsight = generateEngagementInsight(client, engagementScore, lang as 'en' | 'pl');
  const engagementAction = getSuggestedAction(engagementScore, lang as 'en' | 'pl');

  return (
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
      {/* Back Button + Client Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={styles.backRow}
      >
        <button onClick={onBack} style={{ ...styles.backBtn, ...(isMobile ? { fontSize: '13px', padding: '4px 8px', gap: '5px' } : {}) }}>
          <ArrowLeft size={isMobile ? 15 : 18} />
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
            style={{ ...styles.saveFlash, ...(isMobile ? { fontSize: '12px', padding: '8px 14px' } : {}) }}
          >
            {saveFlash}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header */}
      <GlassCard delay={0.05} style={isMobile ? { padding: '14px 16px' } : undefined}>
        <div style={{ ...styles.profileHeader, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : undefined }}>
          <div style={{ ...styles.profileLeft, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '10px' : '20px' }}>
            <div style={{ ...styles.bigAvatar, background: getAvatarColor(client.id), ...(isMobile ? { width: '42px', height: '42px', fontSize: '18px', borderRadius: '12px' } : {}) }}>
              {getInitials(client.name)}
            </div>
            <div>
              <h2 style={{ ...styles.profileName, ...(isMobile ? { fontSize: '18px', letterSpacing: '-0.3px' } : {}) }}>{client.name}</h2>
              <div style={{ ...styles.profileMeta, flexWrap: 'wrap', ...(isMobile ? { fontSize: '12px', gap: '4px', marginTop: '2px' } : {}) }}>
                <Mail size={isMobile ? 11 : 13} color="var(--text-tertiary)" />
                <span>{client.email}</span>
                <span style={styles.dot} />
                <Calendar size={isMobile ? 11 : 13} color="var(--text-tertiary)" />
                <span>{t.clientDetail.since} {client.startDate}</span>
              </div>
              <div style={{ ...styles.profileTags, flexWrap: 'wrap', ...(isMobile ? { gap: '5px', marginTop: '6px' } : {}) }}>
                <span style={{ ...styles.planTag, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}), color: (planColors[client.plan] || { color: 'var(--accent-primary)', bg: 'var(--accent-primary-dim)' }).color, background: (planColors[client.plan] || { color: 'var(--accent-primary)', bg: 'var(--accent-primary-dim)' }).bg }}>
                  {planLabelMap[client.plan] || client.plan}
                </span>
                <span style={{ ...styles.statusTag, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}) }}>
                  {client.status === 'active' && <Flame size={isMobile ? 10 : 12} color="var(--accent-success)" />}
                  <span style={{ textTransform: 'capitalize' }}>{statusLabelMap[client.status]}</span>
                </span>
                {client.streak > 0 && (
                  <span style={{ ...styles.streakTag, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}) }}>
                    <Flame size={isMobile ? 10 : 12} color="var(--accent-warm)" />
                    {client.streak} {t.clientDetail.dayStreak}
                  </span>
                )}
                {assignedPrograms.map(prog => (
                  <span key={prog.id} style={{ ...styles.programTag, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}) }}>
                    <Dumbbell size={isMobile ? 10 : 12} />
                    {prog.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...styles.profileActions, ...(isMobile ? { width: '100%', flexWrap: 'wrap', gap: '6px' } : {}) }}>
            <button onClick={() => setActiveModal('message')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 10px', gap: '4px' } : {}) }}>
              <MessageSquare size={isMobile ? 13 : 15} />
              {t.clientDetail.sendMessage}
            </button>
            <button onClick={() => setActiveModal('editPlan')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 10px', gap: '4px' } : {}) }}>
              <Edit3 size={isMobile ? 13 : 15} />
              {t.clientDetail.editPlanStatus}
            </button>
            <button onClick={() => { setActiveModal('notes'); }} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 10px', gap: '4px' } : {}) }}>
              <FileText size={isMobile ? 13 : 15} />
              {t.clientDetail.notes}
            </button>
            <button onClick={() => setActiveModal('assignProgram')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 10px', gap: '4px' } : {}) }}>
              <Dumbbell size={isMobile ? 13 : 15} />
              {t.clientDetail.assignProgram}
            </button>
            <button onClick={handleExportReport} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 10px', gap: '4px' } : {}), color: 'var(--accent-primary)' }}>
              <Download size={isMobile ? 13 : 15} />
              {t.clientDetail.export}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Key Metrics */}
      <div style={{ ...styles.metricsRow, ...(isMobile ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' } : {}) }}>
        <GlassCard delay={0.1} style={{ flex: 1, ...(isMobile ? { padding: '10px 12px' } : {}) }}>
          <div style={{ ...styles.metricLabel, ...(isMobile ? { fontSize: '11px', marginBottom: '2px' } : {}) }}>{t.clientDetail.weight}</div>
          <div style={{ ...styles.metricValue, ...(isMobile ? { fontSize: '20px', letterSpacing: '-0.5px' } : {}) }}>
            {latestWeight != null ? latestWeight : '-'} <span style={{ ...styles.metricUnit, ...(isMobile ? { fontSize: '13px' } : {}) }}>kg</span>
          </div>
          {hasWeight && (
          <div style={{ ...styles.metricChange, ...(isMobile ? { fontSize: '11px', marginTop: '2px' } : {}), color: weightChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {weightChange <= 0 ? <TrendingDown size={isMobile ? 11 : 14} /> : <TrendingUp size={isMobile ? 11 : 14} />}
            {Math.abs(weightChange).toFixed(1)} kg
          </div>
          )}
        </GlassCard>
        <GlassCard delay={0.12} style={{ flex: 1, ...(isMobile ? { padding: '10px 12px' } : {}) }}>
          <div style={{ ...styles.metricLabel, ...(isMobile ? { fontSize: '11px', marginBottom: '2px' } : {}) }}>{t.clientDetail.bodyFat}</div>
          <div style={{ ...styles.metricValue, ...(isMobile ? { fontSize: '20px', letterSpacing: '-0.5px' } : {}) }}>
            {latestBF != null ? latestBF : '-'} <span style={{ ...styles.metricUnit, ...(isMobile ? { fontSize: '13px' } : {}) }}>%</span>
          </div>
          {hasBF && (
          <div style={{ ...styles.metricChange, ...(isMobile ? { fontSize: '11px', marginTop: '2px' } : {}), color: bfChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {bfChange <= 0 ? <TrendingDown size={isMobile ? 11 : 14} /> : <TrendingUp size={isMobile ? 11 : 14} />}
            {Math.abs(bfChange).toFixed(1)}%
          </div>
          )}
        </GlassCard>
        <GlassCard delay={0.14} style={{ flex: 1, ...(isMobile ? { padding: '10px 12px' } : {}) }}>
          <div style={{ ...styles.metricLabel, ...(isMobile ? { fontSize: '11px', marginBottom: '2px' } : {}) }}>{t.clientDetail.monthlyRate}</div>
          <div style={{ ...styles.metricValue, ...(isMobile ? { fontSize: '20px', letterSpacing: '-0.5px' } : {}) }}>
            {formatCurrency(client.monthlyRate, lang)}
          </div>
          <div style={{ ...styles.metricChange, ...(isMobile ? { fontSize: '11px', marginTop: '2px' } : {}), color: 'var(--text-tertiary)' }}>
            <Minus size={isMobile ? 11 : 14} />
            {t.clientDetail.perMonth}
          </div>
        </GlassCard>
        <GlassCard delay={0.16} style={{ flex: 1, ...(isMobile ? { padding: '10px 12px' } : {}) }}>
          <div style={{ ...styles.metricLabel, ...(isMobile ? { fontSize: '11px', marginBottom: '2px' } : {}) }}>{t.clientDetail.overallProgress}</div>
          <div style={{ ...styles.metricValue, ...(isMobile ? { fontSize: '20px', letterSpacing: '-0.5px' } : {}) }}>{client.progress}%</div>
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

      {/* Training Calendar */}
      <ClientDetailTrainingCalendar
        client={client}
        workoutLogs={workoutLogs}
        setLogs={setLogs}
        programs={programs}
        clientSchedule={clientSchedule}
        isMobile={isMobile}
      />

      {/* Smart Insights */}
      {isMobile ? (
        <GlassCard style={{ padding: '0' }}>
          <button onClick={() => toggleSection('insights')} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-primary)" />
              {t.clientDetail.insightsTitle}
            </span>
            <ChevronDown size={14} color="var(--text-tertiary)" style={{ transform: expandedSections.insights ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          {expandedSections.insights && (
            <div style={{ padding: '0 16px 14px' }}>
              <ClientInsights
                client={client}
                workoutLogs={workoutLogs}
                setLogs={setLogs}
                checkIns={checkIns}
                program={assignedPrograms.find(p => p.status === 'active') ?? assignedPrograms[0] ?? null}
                lang={lang}
                t={{ insightsTitle: t.clientDetail.insightsTitle, insightsSub: t.clientDetail.insightsSub, showMore: t.clientDetail.showMore, showLess: t.clientDetail.showLess, noInsights: t.clientDetail.noInsights }}
              />
            </div>
          )}
        </GlassCard>
      ) : (
        <ClientInsights
          client={client}
          workoutLogs={workoutLogs}
          setLogs={setLogs}
          checkIns={checkIns}
          program={assignedPrograms.find(p => p.status === 'active') ?? assignedPrograms[0] ?? null}
          lang={lang}
          t={{ insightsTitle: t.clientDetail.insightsTitle, insightsSub: t.clientDetail.insightsSub, showMore: t.clientDetail.showMore, showLess: t.clientDetail.showLess, noInsights: t.clientDetail.noInsights }}
        />
      )}

      {/* Engagement Score Panel */}
      {isMobile ? (
        <GlassCard style={{ padding: '0' }}>
          <button onClick={() => toggleSection('engagement')} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={14} color="var(--accent-primary)" />
              {t.engagement.title}
              <span style={{ fontSize: '12px', fontWeight: 700, color: engagementScore.total >= 80 ? 'var(--accent-success)' : engagementScore.total >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)', marginLeft: '4px' }}>{engagementScore.total}%</span>
            </span>
            <ChevronDown size={14} color="var(--text-tertiary)" style={{ transform: expandedSections.engagement ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          {expandedSections.engagement && (
            <div style={{ padding: '0 16px 14px' }}>
              <EngagementPanel
                score={engagementScore}
                insight={engagementInsight}
                suggestedAction={engagementAction}
                onAction={(type) => { if (type === 'motivation' || type === 'call') setActiveModal('message'); }}
                t={{ title: t.engagement.title, subtitle: t.engagement.subtitle, workoutCompletion: t.engagement.workoutCompletion, checkInRate: t.engagement.checkInRate, messageResponsiveness: t.engagement.messageResponsiveness, streakLength: t.engagement.streakLength, trend8Weeks: t.engagement.trend8Weeks, aiInsight: t.engagement.aiInsight, suggestedAction: t.engagement.suggestedAction, last14Days: t.engagement.last14Days, actionLocked: t.engagement.actionLocked }}
              />
            </div>
          )}
        </GlassCard>
      ) : (
        <EngagementPanel
          score={engagementScore}
          insight={engagementInsight}
          suggestedAction={engagementAction}
          onAction={(type) => { if (type === 'motivation' || type === 'call') setActiveModal('message'); }}
          t={{ title: t.engagement.title, subtitle: t.engagement.subtitle, workoutCompletion: t.engagement.workoutCompletion, checkInRate: t.engagement.checkInRate, messageResponsiveness: t.engagement.messageResponsiveness, streakLength: t.engagement.streakLength, trend8Weeks: t.engagement.trend8Weeks, aiInsight: t.engagement.aiInsight, suggestedAction: t.engagement.suggestedAction, last14Days: t.engagement.last14Days, actionLocked: t.engagement.actionLocked }}
        />
      )}

      {/* Check-In History */}
      <ClientDetailCheckIns
        client={client}
        checkIns={checkIns}
        isMobile={isMobile}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        onViewCheckIn={(ci) => {
          setSelectedCheckIn(ci);
          setActiveModal('viewCheckIn');
        }}
      />

      {/* Activity Timeline */}
      <ClientDetailActivity
        client={client}
        isMobile={isMobile}
      />

      {/* Bottom Row */}
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: '1fr' }}>
        {/* Goals + Coach Notes */}
        <GlassCard delay={0.35} style={isMobile ? { padding: '14px 16px' } : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ ...styles.chartTitle, ...(isMobile ? { fontSize: '15px' } : {}), margin: 0 }}>{t.clientDetail.goals}</h3>
            {!editingGoals && (
              <button
                onClick={() => { setEditingGoals(true); setEditGoalTargets(client.goalTargets ?? {}); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                <Edit3 size={14} /> {t.clientDetail.editGoals}
              </button>
            )}
          </div>

          {!editingGoals ? (
            <>
              <div style={{ ...styles.goalsList, ...(isMobile ? { gap: '8px', marginTop: '10px' } : {}) }}>
                {client.goals.map((goal, i) => (
                  <motion.div
                    key={i}
                    style={{ ...styles.goalItem, ...(isMobile ? { fontSize: '12px', padding: '8px 10px', gap: '8px' } : {}) }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                  >
                    <Target size={isMobile ? 14 : 16} color="var(--accent-primary)" />
                    <span>{goal}</span>
                  </motion.div>
                ))}
              </div>
              {/* Show current targets if set */}
              {client.goalTargets && Object.values(client.goalTargets).some(v => v != null) && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{t.clientDetail.goalTargets}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {client.goalTargets.targetWeight != null && <span style={styles.targetTag}>{t.clientDetail.targetWeight}: {client.goalTargets.targetWeight}</span>}
                    {client.goalTargets.targetBodyFat != null && <span style={styles.targetTag}>{t.clientDetail.targetBodyFat}: {client.goalTargets.targetBodyFat}</span>}
                    {client.goalTargets.targetBenchPress != null && <span style={styles.targetTag}>{t.clientDetail.targetBenchPress}: {client.goalTargets.targetBenchPress}</span>}
                    {client.goalTargets.targetSquat != null && <span style={styles.targetTag}>{t.clientDetail.targetSquat}: {client.goalTargets.targetSquat}</span>}
                    {client.goalTargets.targetDeadlift != null && <span style={styles.targetTag}>{t.clientDetail.targetDeadlift}: {client.goalTargets.targetDeadlift}</span>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.clientDetail.goalTargets}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                {[
                  { key: 'targetWeight' as const, label: t.clientDetail.targetWeight },
                  { key: 'targetBodyFat' as const, label: t.clientDetail.targetBodyFat },
                  { key: 'targetBenchPress' as const, label: t.clientDetail.targetBenchPress },
                  { key: 'targetSquat' as const, label: t.clientDetail.targetSquat },
                  { key: 'targetDeadlift' as const, label: t.clientDetail.targetDeadlift },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editGoalTargets[key] ?? ''}
                      onChange={e => setEditGoalTargets(prev => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="—"
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => setEditingGoals(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <X size={14} /> {t.clientDetail.cancelEdit}
                </button>
                <button
                  onClick={() => {
                    // Clean up undefined values
                    const cleaned: GoalTargets = {};
                    if (editGoalTargets.targetWeight != null) cleaned.targetWeight = editGoalTargets.targetWeight;
                    if (editGoalTargets.targetBodyFat != null) cleaned.targetBodyFat = editGoalTargets.targetBodyFat;
                    if (editGoalTargets.targetBenchPress != null) cleaned.targetBenchPress = editGoalTargets.targetBenchPress;
                    if (editGoalTargets.targetSquat != null) cleaned.targetSquat = editGoalTargets.targetSquat;
                    if (editGoalTargets.targetDeadlift != null) cleaned.targetDeadlift = editGoalTargets.targetDeadlift;
                    onUpdateClient(client.id, { goalTargets: cleaned });
                    setEditingGoals(false);
                  }}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Check size={14} /> {t.clientDetail.saveGoals}
                </button>
              </div>
            </div>
          )}

          <div style={styles.divider} />

          <h3 style={{ ...styles.chartTitle, ...(isMobile ? { fontSize: '15px' } : {}), marginTop: '16px' }}>{t.clientDetail.coachNotes}</h3>
          <p style={{ ...styles.notes, ...(isMobile ? { fontSize: '12px' } : {}) }}>{client.notes}</p>
        </GlassCard>
      </div>

      {/* Modals */}
      <ClientDetailModals
        client={client}
        programs={programs}
        plans={plans}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        selectedCheckIn={selectedCheckIn}
        setSelectedCheckIn={setSelectedCheckIn}
        isMobile={isMobile}
        onSendMessage={handleSendMessageFromModal}
        onSavePlan={handleSavePlanFromModal}
        onSaveNotes={handleSaveNotesFromModal}
        onToggleKeyNote={handleToggleKeyNote}
        onToggleProgram={handleToggleProgram}
        onUpdateCheckIn={onUpdateCheckIn}
        flashSaved={flashSaved}
      />
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
  chartTitle: {
    fontSize: '21px',
    fontWeight: 600,
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
  targetTag: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(0,229,200,0.15)',
    fontFamily: 'var(--font-mono)',
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
};
