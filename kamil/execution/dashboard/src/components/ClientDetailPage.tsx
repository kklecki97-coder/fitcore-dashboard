import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Calendar, Flame, Target,
  TrendingUp, TrendingDown, Minus, DollarSign,
  Edit3, MessageSquare, FileText, X, Send, Save,
  Activity, Dumbbell, Check, ClipboardCheck, Flag,
  Smile, Frown, Meh, SmilePlus, Angry,
  Moon, Percent, Download, Clock, Star,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import jsPDF from 'jspdf';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, Message, WorkoutProgram, WorkoutLog, CheckIn } from '../types';

interface ClientDetailPageProps {
  clientId: string;
  clients: Client[];
  programs: WorkoutProgram[];
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  onBack: () => void;
  onUpdateClient: (id: string, updates: Partial<Client>) => void;
  onSendMessage: (msg: Message) => void;
  onUpdateProgram: (programId: string, updates: Partial<WorkoutProgram>) => void;
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  onAddCheckIn: (checkIn: CheckIn) => void;
}

export default function ClientDetailPage({ clientId, clients, programs, workoutLogs, checkIns, onBack, onUpdateClient, onSendMessage, onUpdateProgram, onUpdateCheckIn, onAddCheckIn }: ClientDetailPageProps) {
  const isMobile = useIsMobile();
  const client = clients.find(c => c.id === clientId);

  // All hooks must be called before any early return
  const [activeModal, setActiveModal] = useState<'message' | 'editPlan' | 'notes' | 'logMetrics' | 'assignProgram' | 'checkIn' | 'viewCheckIn' | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    weight: '',
    bodyFat: '',
    mood: '' as string,
    sleepHours: '',
    adherence: '',
    energy: '',
    stress: '',
    nutritionScore: '',
    notes: '',
    wins: '',
    challenges: '',
    coachFeedback: '',
  });
  const [messageText, setMessageText] = useState('');
  const [editPlan, setEditPlan] = useState<'Basic' | 'Premium' | 'Elite'>(client?.plan ?? 'Basic');
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'pending'>(client?.status ?? 'active');
  const [editNotes, setEditNotes] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saveFlash, setSaveFlash] = useState('');
  const [metricsForm, setMetricsForm] = useState({
    weight: '',
    bodyFat: '',
    benchPress: '',
    squat: '',
    deadlift: '',
  });

  if (!client) return null;

  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  const weightData = client.metrics.weight.map((w, i) => ({ month: months[i] || `M${i}`, value: w }));
  const bfData = client.metrics.bodyFat.map((bf, i) => ({ month: months[i] || `M${i}`, value: bf }));

  const liftData = client.metrics.benchPress.map((_, i) => ({
    month: months[i] || `M${i}`,
    bench: client.metrics.benchPress[i],
    squat: client.metrics.squat[i],
    deadlift: client.metrics.deadlift[i],
  }));

  const latestWeight = client.metrics.weight[client.metrics.weight.length - 1];
  const prevWeight = client.metrics.weight[client.metrics.weight.length - 2] || latestWeight;
  const weightChange = latestWeight - prevWeight;

  const latestBF = client.metrics.bodyFat[client.metrics.bodyFat.length - 1];
  const prevBF = client.metrics.bodyFat[client.metrics.bodyFat.length - 2] || latestBF;
  const bfChange = latestBF - prevBF;

  // Deterministic radar values derived from client data
  const enduranceScore = Math.min(100, 60 + (client.progress * 0.3) + (client.streak * 0.5));
  const nutritionScore = Math.min(100, 45 + (client.progress * 0.4) + (client.streak * 0.3));
  const recoveryScore = Math.min(100, 55 + (client.streak * 1.2) + (client.progress * 0.15));

  const radarData = [
    { metric: 'Strength', value: Math.min(100, (client.metrics.benchPress[client.metrics.benchPress.length - 1] / 120) * 100) },
    { metric: 'Endurance', value: enduranceScore },
    { metric: 'Consistency', value: Math.min(100, client.streak * 3.5) },
    { metric: 'Nutrition', value: nutritionScore },
    { metric: 'Recovery', value: recoveryScore },
    { metric: 'Progress', value: client.progress },
  ];

  const planColors: Record<string, { color: string; bg: string }> = {
    Elite: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
    Premium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
    Basic: { color: 'var(--text-secondary)', bg: 'var(--bg-subtle-hover)' },
  };

  const assignedPrograms = programs.filter(p => p.clientIds.includes(client.id));

  const flashSaved = (label: string) => {
    setSaveFlash(label);
    setTimeout(() => setSaveFlash(''), 1500);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    const msg: Message = {
      id: `m-${Date.now()}`,
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
    flashSaved('Message sent');
  };

  const handleSavePlan = () => {
    const rateMap: Record<string, number> = { Basic: 99, Premium: 199, Elite: 299 };
    const changes: string[] = [];
    if (editPlan !== client.plan) changes.push(`Plan: ${client.plan} → ${editPlan}`);
    if (editStatus !== client.status) changes.push(`Status: ${client.status} → ${editStatus}`);
    const desc = changes.length > 0 ? changes.join(', ') : 'Plan saved (no changes)';
    onUpdateClient(client.id, {
      plan: editPlan, status: editStatus, monthlyRate: rateMap[editPlan],
      activityLog: [{ type: 'plan', description: desc, date: new Date().toISOString() }, ...(client.activityLog || [])],
    });
    setActiveModal(null);
    flashSaved('Plan updated');
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
    flashSaved('Note added');
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
    flashSaved('Metrics logged');
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
    doc.text('FitCore — Client Report', 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, y);
    y += 14;

    // Client Info
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(client.name, 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${client.email}  |  ${client.plan} Plan  |  ${client.status}  |  Since ${client.startDate}`, 14, y);
    y += 10;

    // Metrics
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Metrics', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const latW = client.metrics.weight[client.metrics.weight.length - 1];
    const latBF = client.metrics.bodyFat[client.metrics.bodyFat.length - 1];
    const latBench = client.metrics.benchPress[client.metrics.benchPress.length - 1];
    const latSquat = client.metrics.squat[client.metrics.squat.length - 1];
    const latDeadlift = client.metrics.deadlift[client.metrics.deadlift.length - 1];
    const metrics = [
      `Weight: ${latW ?? '—'} kg`,
      `Body Fat: ${latBF ?? '—'}%`,
      `Bench: ${latBench ?? '—'} kg`,
      `Squat: ${latSquat ?? '—'} kg`,
      `Deadlift: ${latDeadlift ?? '—'} kg`,
      `Monthly Rate: $${client.monthlyRate}`,
      `Progress: ${client.progress}%`,
      `Streak: ${client.streak} days`,
    ];
    metrics.forEach(m => { doc.text(m, 14, y); y += 6; });
    y += 4;

    // Goals
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Goals', 14, y);
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
        const date = new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        doc.text(`${date}  —  ${a.description}`, 14, y);
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
        doc.text(new Date(nh.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 14, y);
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
      doc.text('FitCore — Confidential', 14, doc.internal.pageSize.getHeight() - 10);
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
          Back to Clients
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
                <span>Since {client.startDate}</span>
              </div>
              <div style={{ ...styles.profileTags, flexWrap: 'wrap' }}>
                <span style={{ ...styles.planTag, color: planColors[client.plan].color, background: planColors[client.plan].bg }}>
                  {client.plan}
                </span>
                <span style={styles.statusTag}>
                  {client.status === 'active' && <Flame size={12} color="var(--accent-success)" />}
                  <span style={{ textTransform: 'capitalize' }}>{client.status}</span>
                </span>
                {client.streak > 0 && (
                  <span style={styles.streakTag}>
                    <Flame size={12} color="var(--accent-warm)" />
                    {client.streak} day streak
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
              Message
            </button>
            <button onClick={() => setActiveModal('editPlan')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <Edit3 size={15} />
              Edit Plan
            </button>
            <button onClick={() => { setShowNoteInput(false); setEditNotes(''); setActiveModal('notes'); }} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <FileText size={15} />
              Notes
            </button>
            <button onClick={() => setActiveModal('assignProgram')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <Dumbbell size={15} />
              Program
            </button>
            <button onClick={handleExportReport} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}), color: 'var(--accent-primary)' }}>
              <Download size={15} />
              Export
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Key Metrics */}
      <div style={{ ...styles.metricsRow, ...(isMobile ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' } : {}) }}>
        <GlassCard delay={0.1} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>Current Weight</div>
          <div style={styles.metricValue}>
            {latestWeight} <span style={styles.metricUnit}>kg</span>
          </div>
          <div style={{ ...styles.metricChange, color: weightChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {weightChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(weightChange).toFixed(1)} kg
          </div>
        </GlassCard>
        <GlassCard delay={0.12} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>Body Fat</div>
          <div style={styles.metricValue}>
            {latestBF} <span style={styles.metricUnit}>%</span>
          </div>
          <div style={{ ...styles.metricChange, color: bfChange <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {bfChange <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(bfChange).toFixed(1)}%
          </div>
        </GlassCard>
        <GlassCard delay={0.14} style={{ flex: 1 }}>
          <div style={styles.metricLabel}>Monthly Rate</div>
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

      {/* Charts */}
      <div style={{ ...styles.chartsGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Weight + Body Fat */}
        <GlassCard delay={0.2}>
          <h3 style={styles.chartTitle}>Weight & Body Fat Trend</h3>
          <div style={{ height: 240, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle-strong)',
                    borderRadius: '10px', boxShadow: 'var(--shadow-elevated)',
                    fontSize: '18px', fontFamily: 'Outfit',
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#00e5c8" strokeWidth={2.5} dot={{ r: 4, fill: '#00e5c8', strokeWidth: 0 }} name="Weight (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Lifts */}
        <GlassCard delay={0.25}>
          <h3 style={styles.chartTitle}>Strength Progression</h3>
          <div style={{ height: 240, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liftData}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle-strong)',
                    borderRadius: '10px', boxShadow: 'var(--shadow-elevated)',
                    fontSize: '18px', fontFamily: 'Outfit',
                  }}
                />
                <Line type="monotone" dataKey="bench" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} name="Bench (kg)" />
                <Line type="monotone" dataKey="squat" stroke="#00e5c8" strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} name="Squat (kg)" />
                <Line type="monotone" dataKey="deadlift" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} name="Deadlift (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.chartLegend}>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#6366f1' }} />Bench</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#00e5c8' }} />Squat</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#f59e0b' }} />Deadlift</span>
          </div>
        </GlassCard>
      </div>

      {/* Training History */}
      {(() => {
        const clientLogs = workoutLogs
          .filter(w => w.clientId === client.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalSessions = clientLogs.length;
        const completedSessions = clientLogs.filter(w => w.completed).length;
        const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
        const avgDuration = totalSessions > 0 ? Math.round(clientLogs.reduce((s, w) => s + w.duration, 0) / totalSessions) : 0;

        // Build month calendar data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logsByDate: Record<string, WorkoutLog[]> = {};
        clientLogs.forEach(w => {
          if (!logsByDate[w.date]) logsByDate[w.date] = [];
          logsByDate[w.date].push(w);
        });

        // Current month grid
        const calYear = today.getFullYear();
        const calMonth = today.getMonth();
        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
        const daysInMonth = lastDay.getDate();
        const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
              <div style={styles.trainingSectionHeader}>
                <div>
                  <h3 style={styles.chartTitle}>Training Activity</h3>
                  <p style={styles.trainingSubtitle}>{monthName}</p>
                </div>
                <div style={styles.trainingStats}>
                  <div style={styles.trainingStat}>
                    <span style={styles.trainingStatValue}>{completedSessions}</span>
                    <span style={styles.trainingStatLabel}>sessions</span>
                  </div>
                  <div style={styles.trainingStat}>
                    <span style={{ ...styles.trainingStatValue, color: completionRate >= 80 ? 'var(--accent-success)' : completionRate >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                      {completionRate}%
                    </span>
                    <span style={styles.trainingStatLabel}>rate</span>
                  </div>
                  <div style={styles.trainingStat}>
                    <span style={styles.trainingStatValue}>{avgDuration}</span>
                    <span style={styles.trainingStatLabel}>avg min</span>
                  </div>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div style={styles.calGrid}>
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

                  let cellBg = 'var(--bg-subtle)';
                  let dotColor = '';
                  let label = '';
                  if (entries && !isFuture) {
                    const allCompleted = entries.every(e => e.completed);
                    if (allCompleted) {
                      cellBg = 'rgba(0, 229, 200, 0.08)';
                      dotColor = 'var(--accent-success)';
                      label = entries.map(e => `${e.type} (${e.duration}min)`).join(', ');
                    } else {
                      cellBg = 'rgba(239, 68, 68, 0.08)';
                      dotColor = 'var(--accent-danger)';
                      label = 'Missed';
                    }
                  }

                  return (
                    <div
                      key={dateKey}
                      title={label || dateKey}
                      style={{
                        ...styles.calCell,
                        background: cellBg,
                        opacity: isFuture ? 0.35 : 1,
                        ...(isToday ? { border: '1px solid var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary-dim)' } : {}),
                      }}
                    >
                      <span style={{
                        ...styles.calDayNum,
                        color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: isToday ? 700 : 500,
                      }}>
                        {day}
                      </span>
                      {dotColor && (
                        <div style={styles.calDotRow}>
                          {entries!.map((_e, ei) => (
                            <div key={ei} style={{ ...styles.calDot, background: dotColor }} />
                          ))}
                        </div>
                      )}
                      {entries && !isFuture && entries.every(e => e.completed) && (
                        <span style={styles.calSessionType}>
                          {entries[0].type.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={styles.calLegend}>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: 'var(--accent-success)' }} />
                  <span>Completed</span>
                </div>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: 'var(--accent-danger)' }} />
                  <span>Missed</span>
                </div>
                <div style={styles.calLegendItem}>
                  <div style={{ ...styles.calLegendDot, background: 'transparent', border: '1px solid var(--accent-primary)' }} />
                  <span>Today</span>
                </div>
              </div>
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
          : '—';
        const avgAdherence = completed.length > 0
          ? Math.round(completed.reduce((s, ci) => s + (ci.adherence || 0), 0) / completed.filter(ci => ci.adherence).length)
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
                    Next: {new Date(nextScheduled.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                  <span style={{ ...styles.trainingStatValue, color: avgAdherence >= 80 ? 'var(--accent-success)' : avgAdherence >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                    {avgAdherence}%
                  </span>
                  <span style={styles.trainingStatLabel}>adherence</span>
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
                      <span>{new Date(ci.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                        {ci.adherence !== null && (
                          <span style={{
                            ...styles.checkInChip,
                            color: ci.adherence >= 80 ? 'var(--accent-success)' : ci.adherence >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                          }}>
                            <Percent size={10} /> {ci.adherence}
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
              <h3 style={styles.chartTitle}>Recent Activity</h3>
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
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Performance Radar */}
        <GlassCard delay={0.3}>
          <h3 style={styles.chartTitle}>Performance Profile</h3>
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

        {/* Goals */}
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

        {/* Body Fat Chart */}
        <GlassCard delay={0.4}>
          <h3 style={styles.chartTitle}>Body Fat Trend</h3>
          <div style={{ height: 200, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bfData}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 17, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle-strong)',
                    borderRadius: '10px', fontSize: '18px',
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4, fill: '#ec4899', strokeWidth: 0 }} name="Body Fat %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                  {activeModal === 'message' && 'Send Message'}
                  {activeModal === 'editPlan' && 'Edit Plan'}
                  {activeModal === 'notes' && 'Coach Notes'}
                  {activeModal === 'assignProgram' && 'Assign Program'}
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
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    style={styles.modalTextarea}
                    rows={5}
                    autoFocus
                  />
                  <div style={styles.modalActions}>
                    <button onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>Cancel</button>
                    <button
                      onClick={handleSendMessage}
                      style={{ ...styles.modalPrimaryBtn, opacity: messageText.trim() ? 1 : 0.5 }}
                    >
                      <Send size={14} />
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Plan Modal */}
              {activeModal === 'editPlan' && (
                <div style={styles.modalBody}>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Plan Tier</span>
                    <div style={styles.modalPlanPicker}>
                      {(['Basic', 'Premium', 'Elite'] as const).map((p) => {
                        const isActive = editPlan === p;
                        const accentMap = { Basic: 'var(--accent-primary)', Premium: 'var(--accent-secondary)', Elite: 'var(--accent-warm)' };
                        const rateMap = { Basic: 99, Premium: 199, Elite: 299 };
                        return (
                          <button
                            key={p}
                            onClick={() => setEditPlan(p)}
                            style={{
                              ...styles.modalPlanOption,
                              ...(isActive ? { borderColor: accentMap[p], color: accentMap[p], background: 'var(--bg-subtle)' } : {}),
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '18px' }}>{p}</div>
                            <div style={{ fontSize: '15px', opacity: 0.7 }}>${rateMap[p]}/mo</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Status</span>
                    <div style={styles.modalStatusPicker}>
                      {(['active', 'paused', 'pending'] as const).map((s) => {
                        const isActive = editStatus === s;
                        const colorMap = { active: 'var(--accent-success)', paused: 'var(--accent-warm)', pending: 'var(--accent-secondary)' };
                        return (
                          <button
                            key={s}
                            onClick={() => setEditStatus(s)}
                            style={{
                              ...styles.modalStatusOption,
                              ...(isActive ? { borderColor: colorMap[s], color: colorMap[s], background: 'var(--bg-subtle)' } : {}),
                            }}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.modalActions}>
                    <button onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>Cancel</button>
                    <button onClick={handleSavePlan} style={styles.modalPrimaryBtn}>
                      <Save size={14} />
                      Save Changes
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
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          style={{ ...styles.modalPrimaryBtn, opacity: editNotes.trim() ? 1 : 0.5 }}
                        >
                          <Save size={14} />
                          Save
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
                          {client.notesHistory.filter(n => n.isKey).length}/2 key
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
                                    {new Date(nh.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                    <button onClick={() => { setActiveModal(null); flashSaved('Program updated'); }} style={styles.modalPrimaryBtn}>
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
                        {new Date(selectedCheckIn.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {selectedCheckIn.weight && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Weight</span>
                        <span style={styles.checkInDetailValue}>{selectedCheckIn.weight} kg</span>
                      </div>
                    )}
                    {selectedCheckIn.bodyFat && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Body Fat</span>
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
                    {selectedCheckIn.adherence !== null && (
                      <div style={styles.checkInDetailItem}>
                        <span style={styles.checkInDetailLabel}>Adherence</span>
                        <span style={{ ...styles.checkInDetailValue, color: (selectedCheckIn.adherence || 0) >= 80 ? 'var(--accent-success)' : (selectedCheckIn.adherence || 0) >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                          {selectedCheckIn.adherence}%
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
                      <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>Status:</span>
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
                      Cancel
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
                      {selectedCheckIn.reviewStatus === 'reviewed' ? 'Save' : 'Mark Reviewed'}
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
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '3px',
  },
  calDayHeader: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const,
    padding: '2px 0 6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  calCellEmpty: {
    height: '36px',
    borderRadius: '6px',
  },
  calCell: {
    height: '36px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    cursor: 'default',
    transition: 'background 0.15s',
    border: '1px solid transparent',
    overflow: 'hidden',
  },
  calDayNum: {
    fontSize: '17px',
    fontFamily: 'var(--font-display)',
    lineHeight: 1,
  },
  calDotRow: {
    display: 'flex',
    gap: '2px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  calSessionType: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    lineHeight: 1,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
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
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  calLegendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
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
