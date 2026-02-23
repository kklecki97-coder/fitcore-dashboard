import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Mail, Target,
  FileText, Weight, Save,
} from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import type { Client } from '../types';

interface AddClientPageProps {
  onBack: () => void;
  onSave: (client: Client) => void;
}

const planRates: Record<Client['plan'], number> = {
  Basic: 99,
  Premium: 199,
  Elite: 299,
};

export default function AddClientPage({ onBack, onSave }: AddClientPageProps) {
  const isMobile = useIsMobile();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<Client['plan']>('Basic');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (height && (isNaN(Number(height)) || Number(height) <= 0)) errs.height = 'Enter a valid height';
    if (weight && (isNaN(Number(weight)) || Number(weight) <= 0)) errs.weight = 'Enter a valid weight';
    if (bodyFat && (isNaN(Number(bodyFat)) || Number(bodyFat) < 0 || Number(bodyFat) > 100)) errs.bodyFat = 'Enter a valid body fat %';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const newClient: Client = {
      id: `c${Date.now()}`,
      name: name.trim(),
      avatar: '',
      email: email.trim().toLowerCase(),
      plan,
      status: 'pending',
      height: height ? Number(height) : undefined,
      startDate: today,
      nextCheckIn: nextWeek.toISOString().split('T')[0],
      monthlyRate: planRates[plan],
      progress: 0,
      metrics: {
        weight: weight ? [Number(weight)] : [],
        bodyFat: bodyFat ? [Number(bodyFat)] : [],
        benchPress: [],
        squat: [],
        deadlift: [],
      },
      goals: goals.trim() ? goals.split(',').map(g => g.trim()).filter(Boolean) : [],
      notes: notes.trim(),
      lastActive: 'Just added',
      streak: 0,
    };

    onSave(newClient);
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Header */}
      <motion.div
        style={styles.header}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h2 style={styles.pageTitle}>Add New Client</h2>
      </motion.div>

      {/* Form */}
      <div style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Personal Info */}
        <GlassCard delay={0.05}>
          <div style={styles.sectionHeader}>
            <User size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>Personal Information</h3>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name *</label>
            <div style={{ ...styles.inputWrap, borderColor: errors.name ? 'var(--accent-danger)' : 'var(--glass-border)' }}>
              <User size={14} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder="e.g. John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
              />
            </div>
            {errors.name && <span style={styles.error}>{errors.name}</span>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email Address *</label>
            <div style={{ ...styles.inputWrap, borderColor: errors.email ? 'var(--accent-danger)' : 'var(--glass-border)' }}>
              <Mail size={14} color="var(--text-tertiary)" />
              <input
                type="email"
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Plan</label>
            <div style={styles.planPicker}>
              {(['Basic', 'Premium', 'Elite'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  style={{
                    ...styles.planOption,
                    ...(plan === p ? styles.planActive : {}),
                    ...(plan === p && p === 'Elite' ? { borderColor: 'var(--accent-warm)', color: 'var(--accent-warm)' } : {}),
                    ...(plan === p && p === 'Premium' ? { borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)' } : {}),
                    ...(plan === p && p === 'Basic' ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : {}),
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>{p}</div>
                  <div style={{ fontSize: '15px', opacity: 0.7 }}>${planRates[p]}/mo</div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Body Metrics */}
        <GlassCard delay={0.1}>
          <div style={styles.sectionHeader}>
            <Weight size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>Starting Metrics</h3>
          </div>
          <p style={styles.sectionSub}>Optional — can be filled in later</p>

          <div style={{ ...styles.metricRow, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Weight (kg)</label>
              <div style={{ ...styles.inputWrap, borderColor: errors.weight ? 'var(--accent-danger)' : 'var(--glass-border)' }}>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  style={styles.input}
                />
              </div>
              {errors.weight && <span style={styles.error}>{errors.weight}</span>}
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Height (cm)</label>
              <div style={{ ...styles.inputWrap, borderColor: errors.height ? 'var(--accent-danger)' : 'var(--glass-border)' }}>
                <input
                  type="number"
                  placeholder="e.g. 180"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  style={styles.input}
                />
              </div>
              {errors.height && <span style={styles.error}>{errors.height}</span>}
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Body Fat %</label>
            <div style={{ ...styles.inputWrap, borderColor: errors.bodyFat ? 'var(--accent-danger)' : 'var(--glass-border)', maxWidth: isMobile ? '100%' : '50%' }}>
              <input
                type="number"
                placeholder="e.g. 20"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                style={styles.input}
              />
            </div>
            {errors.bodyFat && <span style={styles.error}>{errors.bodyFat}</span>}
          </div>
        </GlassCard>

        {/* Goals */}
        <GlassCard delay={0.15}>
          <div style={styles.sectionHeader}>
            <Target size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>Goals</h3>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Client Goals</label>
            <div style={{ ...styles.inputWrap, alignItems: 'flex-start' }}>
              <Target size={14} color="var(--text-tertiary)" style={{ marginTop: '2px' }} />
              <input
                type="text"
                placeholder="e.g. Lose 10kg, Build muscle, Run 5K"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                style={styles.input}
              />
            </div>
            <span style={styles.hint}>Separate multiple goals with commas</span>
          </div>
        </GlassCard>

        {/* Notes */}
        <GlassCard delay={0.2}>
          <div style={styles.sectionHeader}>
            <FileText size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>Coach Notes</h3>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              placeholder="Any relevant details — injuries, schedule preferences, experience level..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              rows={4}
            />
          </div>
        </GlassCard>
      </div>

      {/* Summary + Submit */}
      <GlassCard delay={0.25}>
        <div style={{ ...styles.submitRow, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Plan</span>
              <span style={styles.summaryValue}>{plan}</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Monthly Rate</span>
              <span style={{ ...styles.summaryValue, color: 'var(--accent-success)' }}>${planRates[plan]}</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Status</span>
              <span style={styles.summaryValue}>Pending</span>
            </div>
          </div>

          <div style={{ ...styles.actions, width: isMobile ? '100%' : 'auto' }}>
            <button onClick={onBack} style={styles.cancelBtn}>Cancel</button>
            <button onClick={handleSubmit} style={{ ...styles.saveBtn, flex: isMobile ? 1 : undefined }}>
              <Save size={16} />
              Add Client
            </button>
          </div>
        </div>
      </GlassCard>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    transition: 'color 0.15s',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  formGrid: {
    display: 'grid',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '21px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sectionSub: {
    fontSize: '17px',
    color: 'var(--text-tertiary)',
    marginTop: '-10px',
    marginBottom: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  },
  label: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    transition: 'border-color 0.2s',
  },
  input: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    flex: 1,
    width: '100%',
  },
  textarea: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  error: {
    fontSize: '15px',
    color: 'var(--accent-danger)',
    fontWeight: 500,
  },
  planPicker: {
    display: 'flex',
    gap: '8px',
  },
  planOption: {
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
  planActive: {
    background: 'rgba(255,255,255,0.04)',
  },
  metricRow: {
    display: 'flex',
    gap: '12px',
  },
  submitRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  summaryLabel: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  summaryDivider: {
    width: '1px',
    height: '28px',
    background: 'var(--glass-border)',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 24px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: '#07090e',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
};
