import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, ChevronDown, ChevronUp, Send, MessageSquare, Smile, Frown, Meh, SmilePlus, Angry } from 'lucide-react';
import GlassCard from './GlassCard';
import type { CheckIn } from '../types';

interface CheckInPageProps {
  checkIns: CheckIn[];
  onSubmitCheckIn: (checkIn: CheckIn) => void;
  clientId: string;
  clientName: string;
}

const moodIcons: Record<number, { icon: typeof Smile; color: string; label: string }> = {
  1: { icon: Angry, color: 'var(--accent-danger)', label: 'Terrible' },
  2: { icon: Frown, color: 'var(--accent-warm)', label: 'Bad' },
  3: { icon: Meh, color: 'var(--text-secondary)', label: 'Okay' },
  4: { icon: Smile, color: 'var(--accent-success)', label: 'Good' },
  5: { icon: SmilePlus, color: 'var(--accent-primary)', label: 'Great' },
};

export default function CheckInPage({ checkIns, onSubmitCheckIn, clientId, clientName }: CheckInPageProps) {
  const [tab, setTab] = useState<'submit' | 'history'>('submit');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    weight: '', bodyFat: '', mood: 0, energy: '', stress: '', sleepHours: '',
    adherence: '', nutritionScore: '', notes: '', wins: '', challenges: '',
  });

  const completed = checkIns.filter(ci => ci.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));

  const handleSubmit = () => {
    const ci: CheckIn = {
      id: `ci-new-${Date.now()}`,
      clientId,
      clientName,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      weight: form.weight ? parseFloat(form.weight) : null,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
      mood: (form.mood || null) as CheckIn['mood'],
      energy: form.energy ? parseInt(form.energy) : null,
      stress: form.stress ? parseInt(form.stress) : null,
      sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : null,
      adherence: form.adherence ? parseInt(form.adherence) : null,
      nutritionScore: form.nutritionScore ? parseInt(form.nutritionScore) : null,
      notes: form.notes,
      wins: form.wins,
      challenges: form.challenges,
      coachFeedback: '',
      reviewStatus: 'pending',
      flagReason: '',
    };
    onSubmitCheckIn(ci);
    setForm({ weight: '', bodyFat: '', mood: 0, energy: '', stress: '', sleepHours: '', adherence: '', nutritionScore: '', notes: '', wins: '', challenges: '' });
    setTab('history');
  };

  return (
    <div style={styles.page}>
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('submit')}
          style={{ ...styles.tab, ...(tab === 'submit' ? styles.tabActive : {}) }}
        >
          <ClipboardCheck size={16} /> Submit
        </button>
        <button
          onClick={() => setTab('history')}
          style={{ ...styles.tab, ...(tab === 'history' ? styles.tabActive : {}) }}
        >
          <MessageSquare size={16} /> History ({completed.length})
        </button>
      </div>

      {tab === 'submit' ? (
        <div style={styles.formWrap}>
          {/* Body Metrics */}
          <GlassCard delay={0.05}>
            <div style={styles.sectionTitle}>Body Metrics</div>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>Weight (kg)</label>
                <input style={styles.input} type="number" step="0.1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="83.5" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Body Fat (%)</label>
                <input style={styles.input} type="number" step="0.1" value={form.bodyFat} onChange={e => setForm({ ...form, bodyFat: e.target.value })} placeholder="18.5" />
              </div>
            </div>
          </GlassCard>

          {/* Wellness */}
          <GlassCard delay={0.1}>
            <div style={styles.sectionTitle}>Wellness</div>
            <div style={styles.label}>Mood</div>
            <div style={styles.moodRow}>
              {([1, 2, 3, 4, 5] as const).map(val => {
                const m = moodIcons[val];
                const Icon = m.icon;
                const active = form.mood === val;
                return (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, mood: val })}
                    style={{
                      ...styles.moodBtn,
                      background: active ? `${m.color}20` : 'transparent',
                      borderColor: active ? m.color : 'var(--glass-border)',
                      color: active ? m.color : 'var(--text-tertiary)',
                    }}
                    title={m.label}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>Energy (1-10)</label>
                <input style={styles.input} type="number" min="1" max="10" value={form.energy} onChange={e => setForm({ ...form, energy: e.target.value })} placeholder="7" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Stress (1-10)</label>
                <input style={styles.input} type="number" min="1" max="10" value={form.stress} onChange={e => setForm({ ...form, stress: e.target.value })} placeholder="4" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Sleep (hrs)</label>
                <input style={styles.input} type="number" step="0.5" value={form.sleepHours} onChange={e => setForm({ ...form, sleepHours: e.target.value })} placeholder="7.5" />
              </div>
            </div>
          </GlassCard>

          {/* Compliance */}
          <GlassCard delay={0.15}>
            <div style={styles.sectionTitle}>Compliance</div>
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>Adherence (%)</label>
                <input style={styles.input} type="number" min="0" max="100" value={form.adherence} onChange={e => setForm({ ...form, adherence: e.target.value })} placeholder="90" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nutrition (1-10)</label>
                <input style={styles.input} type="number" min="1" max="10" value={form.nutritionScore} onChange={e => setForm({ ...form, nutritionScore: e.target.value })} placeholder="8" />
              </div>
            </div>
          </GlassCard>

          {/* Self-Report */}
          <GlassCard delay={0.2}>
            <div style={styles.sectionTitle}>Self-Report</div>
            <div style={styles.field}>
              <label style={styles.label}>Notes</label>
              <textarea style={styles.textarea} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="How was your week overall?" rows={3} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Wins this week</label>
              <textarea style={styles.textarea} value={form.wins} onChange={e => setForm({ ...form, wins: e.target.value })} placeholder="What went well?" rows={2} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Challenges</label>
              <textarea style={styles.textarea} value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} placeholder="What was difficult?" rows={2} />
            </div>
          </GlassCard>

          <button style={styles.submitBtn} onClick={handleSubmit}>
            <Send size={16} /> Submit Check-In
          </button>
        </div>
      ) : (
        <div style={styles.historyList}>
          {completed.length === 0 ? (
            <GlassCard>
              <p style={styles.emptyText}>No check-ins yet. Submit your first one!</p>
            </GlassCard>
          ) : (
            completed.map((ci, i) => {
              const isExpanded = expandedId === ci.id;
              const mood = ci.mood ? moodIcons[ci.mood] : null;
              const MoodIcon = mood?.icon;
              return (
                <GlassCard key={ci.id} delay={i * 0.05}>
                  <div
                    style={styles.historyHeader}
                    onClick={() => setExpandedId(isExpanded ? null : ci.id)}
                  >
                    <div style={styles.historyLeft}>
                      <div style={styles.historyDate}>{ci.date}</div>
                      <div style={styles.historyChips}>
                        {ci.weight && <span style={styles.chip}>{ci.weight}kg</span>}
                        {ci.adherence != null && <span style={styles.chip}>{ci.adherence}%</span>}
                        {MoodIcon && <MoodIcon size={14} color={mood?.color} />}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={styles.historyDetail}
                    >
                      <div style={styles.detailGrid}>
                        {ci.energy != null && <div style={styles.detailItem}><span style={styles.detailLabel}>Energy</span><span style={styles.detailValue}>{ci.energy}/10</span></div>}
                        {ci.stress != null && <div style={styles.detailItem}><span style={styles.detailLabel}>Stress</span><span style={styles.detailValue}>{ci.stress}/10</span></div>}
                        {ci.sleepHours != null && <div style={styles.detailItem}><span style={styles.detailLabel}>Sleep</span><span style={styles.detailValue}>{ci.sleepHours}h</span></div>}
                        {ci.nutritionScore != null && <div style={styles.detailItem}><span style={styles.detailLabel}>Nutrition</span><span style={styles.detailValue}>{ci.nutritionScore}/10</span></div>}
                      </div>
                      {ci.notes && <div style={styles.detailText}><strong>Notes:</strong> {ci.notes}</div>}
                      {ci.wins && <div style={{ ...styles.detailText, color: 'var(--accent-success)' }}><strong>Wins:</strong> {ci.wins}</div>}
                      {ci.challenges && <div style={{ ...styles.detailText, color: 'var(--accent-warm)' }}><strong>Challenges:</strong> {ci.challenges}</div>}
                      {ci.coachFeedback && (
                        <div style={styles.feedbackBox}>
                          <div style={styles.feedbackLabel}>Coach Feedback</div>
                          <p style={styles.feedbackText}>{ci.coachFeedback}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    height: '100%',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    flex: 1,
    padding: '10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    borderColor: 'var(--accent-primary)',
  },
  formWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  fieldRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  field: {
    flex: 1,
    minWidth: '100px',
    marginBottom: '8px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  moodRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '14px',
  },
  moodBtn: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
    marginBottom: '24px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  historyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  historyDate: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  historyChips: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chip: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '8px',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
  },
  historyDetail: {
    marginTop: '14px',
    paddingTop: '14px',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  detailText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  feedbackBox: {
    background: 'var(--accent-primary-dim)',
    borderLeft: '3px solid var(--accent-primary)',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
    padding: '12px',
    marginTop: '4px',
  },
  feedbackLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  feedbackText: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    padding: '20px',
  },
};
