import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Calendar, Flame, Target,
  TrendingUp, TrendingDown, Minus, DollarSign,
  Edit3, MessageSquare, FileText, X, Send, Save,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import GlassCard from './GlassCard';
import { clients, getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';

interface ClientDetailPageProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientDetailPage({ clientId, onBack }: ClientDetailPageProps) {
  const isMobile = useIsMobile();
  const client = clients.find(c => c.id === clientId);
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

  const radarData = [
    { metric: 'Strength', value: Math.min(100, (client.metrics.benchPress[client.metrics.benchPress.length - 1] / 120) * 100) },
    { metric: 'Endurance', value: 65 + Math.random() * 20 },
    { metric: 'Consistency', value: Math.min(100, client.streak * 3.5) },
    { metric: 'Nutrition', value: 50 + Math.random() * 30 },
    { metric: 'Recovery', value: 60 + Math.random() * 25 },
    { metric: 'Progress', value: client.progress },
  ];

  const planColors: Record<string, { color: string; bg: string }> = {
    Elite: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
    Premium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
    Basic: { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
  };

  const badge = planColors[client.plan];

  const [activeModal, setActiveModal] = useState<'message' | 'editPlan' | 'notes' | null>(null);
  const [messageText, setMessageText] = useState('');
  const [editPlan, setEditPlan] = useState<'Basic' | 'Premium' | 'Elite'>(client.plan);
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'new'>(client.status);
  const [editNotes, setEditNotes] = useState(client.notes);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    console.log('Message sent to', client.name, ':', messageText);
    setMessageText('');
    setActiveModal(null);
  };

  const handleSavePlan = () => {
    console.log('Plan updated for', client.name, ':', { plan: editPlan, status: editStatus });
    setActiveModal(null);
  };

  const handleSaveNotes = () => {
    console.log('Notes updated for', client.name, ':', editNotes);
    setActiveModal(null);
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

      {/* Profile Header */}
      <GlassCard delay={0.05}>
        <div style={{ ...styles.profileHeader, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : undefined }}>
          <div style={{ ...styles.profileLeft, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '20px' }}>
            <div className="avatar-tooltip-wrap" style={{ position: 'relative' }}>
              <div style={{ ...styles.bigAvatar, background: getAvatarColor(client.id), ...(isMobile ? { width: '48px', height: '48px', fontSize: '18px' } : {}) }}>
                {getInitials(client.name)}
              </div>
              {client.notes && (
                <div className="avatar-tooltip" style={styles.avatarTooltip}>
                  <div style={styles.tooltipLabel}>Coach Notes</div>
                  {client.notes}
                </div>
              )}
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
                <span style={{ ...styles.planTag, color: badge.color, background: badge.bg }}>
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
              </div>
            </div>
          </div>

          <div style={{ ...styles.profileActions, ...(isMobile ? { width: '100%' } : {}) }}>
            <button onClick={() => setActiveModal('message')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <MessageSquare size={15} />
              Message
            </button>
            <button onClick={() => setActiveModal('editPlan')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <Edit3 size={15} />
              Edit Plan
            </button>
            <button onClick={() => setActiveModal('notes')} style={{ ...styles.actionBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
              <FileText size={15} />
              Notes
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
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    fontSize: '13px', fontFamily: 'Outfit',
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
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    fontSize: '13px', fontFamily: 'Outfit',
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

      {/* Bottom Row */}
      <div style={{ ...styles.bottomGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Performance Radar */}
        <GlassCard delay={0.3}>
          <h3 style={styles.chartTitle}>Performance Profile</h3>
          <div style={{ height: 260, marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#8b92a5' }} />
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
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525a6e', fontFamily: 'JetBrains Mono' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: '#151a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', fontSize: '13px',
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
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              style={styles.overlay}
            />

            {/* Modal Panel */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ ...styles.modal, width: isMobile ? 'calc(100% - 32px)' : '480px' }}
            >
              {/* Modal Header */}
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  {activeModal === 'message' && 'Send Message'}
                  {activeModal === 'editPlan' && 'Edit Plan'}
                  {activeModal === 'notes' && 'Coach Notes'}
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
                              ...(isActive ? { borderColor: accentMap[p], color: accentMap[p], background: 'rgba(255,255,255,0.04)' } : {}),
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{p}</div>
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>${rateMap[p]}/mo</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Status</span>
                    <div style={styles.modalStatusPicker}>
                      {(['active', 'paused', 'new'] as const).map((s) => {
                        const isActive = editStatus === s;
                        const colorMap = { active: 'var(--accent-success)', paused: 'var(--accent-warm)', new: 'var(--accent-secondary)' };
                        return (
                          <button
                            key={s}
                            onClick={() => setEditStatus(s)}
                            style={{
                              ...styles.modalStatusOption,
                              ...(isActive ? { borderColor: colorMap[s], color: colorMap[s], background: 'rgba(255,255,255,0.04)' } : {}),
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
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Coach Notes for {client.name}</span>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      style={styles.modalTextarea}
                      rows={8}
                      autoFocus
                    />
                  </div>
                  <div style={styles.modalActions}>
                    <button onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>Cancel</button>
                    <button onClick={handleSaveNotes} style={styles.modalPrimaryBtn}>
                      <Save size={14} />
                      Save Notes
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
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
    fontSize: '13px',
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
    fontSize: '22px',
    fontWeight: 700,
    color: '#07090e',
  },
  profileName: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  profileMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
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
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  statusTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.04)',
    padding: '3px 10px',
    borderRadius: '20px',
  },
  streakTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
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
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  metricsRow: {
    display: 'flex',
    gap: '16px',
  },
  metricLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    letterSpacing: '-1px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  metricUnit: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  metricChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '4px',
  },
  bigProgressBar: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.06)',
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
    fontSize: '15px',
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
    fontSize: '12px',
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
    fontSize: '14px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '16px 0 0',
  },
  notes: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginTop: '8px',
  },
  avatarTooltip: {
    position: 'absolute',
    left: 'calc(100% + 12px)',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    width: '240px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  },
  tooltipLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    zIndex: 101,
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--glass-border)',
  },
  modalTitle: {
    fontSize: '16px',
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
    fontSize: '12px',
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
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--glass-border)',
    fontSize: '13px',
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
    fontSize: '9px',
    fontWeight: 700,
    color: '#07090e',
  },
  modalTextarea: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
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
    fontSize: '13px',
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
    color: '#07090e',
    fontSize: '13px',
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
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
};
