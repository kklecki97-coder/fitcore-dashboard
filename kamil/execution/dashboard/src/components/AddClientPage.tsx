import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Mail, Target,
  FileText, Weight, Save, Minus, Plus,
} from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { Client } from '../types';

interface AddClientPageProps {
  onBack: () => void;
  onSave: (client: Client) => void;
}

function NumberStepper({ value, onChange, min, max, step = 1, placeholder, borderColor }: {
  value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number; placeholder?: string; borderColor?: string;
}) {
  const numVal = value === '' ? null : parseFloat(value);
  const canDec = numVal !== null && (min === undefined || Math.round((numVal - step) * 100) / 100 >= min);
  const canInc = numVal !== null && (max === undefined || Math.round((numVal + step) * 100) / 100 <= max);

  const adjust = (dir: 1 | -1) => {
    if (numVal === null) {
      const initial = placeholder ? parseFloat(placeholder) : (dir === 1 ? (min ?? 0) : (max ?? 0));
      onChange(String(initial));
    } else {
      const next = Math.round((numVal + dir * step) * 100) / 100;
      if (min !== undefined && next < min) return;
      if (max !== undefined && next > max) return;
      onChange(String(next));
    }
  };

  return (
    <div style={{ ...stepperStyles.wrap, borderColor: borderColor || 'var(--glass-border)' }}>
      <button style={{ ...stepperStyles.btn, opacity: canDec ? 1 : 0.3 }} onClick={() => adjust(-1)} type="button">
        <Minus size={16} />
      </button>
      <input
        style={stepperStyles.input}
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      <button style={{ ...stepperStyles.btn, opacity: canInc ? 1 : 0.3 }} onClick={() => adjust(1)} type="button">
        <Plus size={16} />
      </button>
    </div>
  );
}

const stepperStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-subtle)',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  btn: {
    width: '42px',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 0.15s, background 0.15s',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '10px 4px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    textAlign: 'center',
    outline: 'none',
  },
};

const planRates: Record<Client['plan'], number> = {
  Basic: 99,
  Premium: 199,
  Elite: 299,
};

export default function AddClientPage({ onBack, onSave }: AddClientPageProps) {
  const { t } = useLang();
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

  const planLabels: Record<Client['plan'], string> = {
    Basic: t.addClient.basic,
    Premium: t.addClient.premium,
    Elite: t.addClient.elite,
  };

  const planPrices: Record<Client['plan'], string> = {
    Basic: t.addClient.basicPrice,
    Premium: t.addClient.premiumPrice,
    Elite: t.addClient.elitePrice,
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t.addClient.nameRequired;
    if (!email.trim()) errs.email = t.addClient.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t.addClient.invalidEmail;
    if (height && (isNaN(Number(height)) || Number(height) <= 0)) errs.height = t.addClient.validHeight;
    if (weight && (isNaN(Number(weight)) || Number(weight) <= 0)) errs.weight = t.addClient.validWeight;
    if (bodyFat && (isNaN(Number(bodyFat)) || Number(bodyFat) < 0 || Number(bodyFat) > 100)) errs.bodyFat = t.addClient.validBodyFat;
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
      notesHistory: notes.trim() ? [{ text: notes.trim(), date: today }] : [],
      activityLog: [{ type: 'plan', description: 'Client created', date: new Date().toISOString() }],
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
          {t.addClient.back}
        </button>
        <h2 style={styles.pageTitle}>{t.addClient.title}</h2>
      </motion.div>

      {/* Form */}
      <div style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Personal Info */}
        <GlassCard delay={0.05}>
          <div style={styles.sectionHeader}>
            <User size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>{t.addClient.personalInfo}</h3>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>{t.addClient.fullName}</label>
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
            <label style={styles.label}>{t.addClient.emailAddress}</label>
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
            <label style={styles.label}>{t.addClient.plan}</label>
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
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>{planLabels[p]}</div>
                  <div style={{ fontSize: '15px', opacity: 0.7 }}>{planPrices[p]}</div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Body Metrics */}
        <GlassCard delay={0.1}>
          <div style={styles.sectionHeader}>
            <Weight size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>{t.addClient.startingMetrics}</h3>
          </div>
          <p style={styles.sectionSub}>{t.addClient.optionalSubtitle}</p>

          <div style={{ ...styles.metricRow, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>{t.addClient.weightKg}</label>
              <NumberStepper value={weight} onChange={setWeight} step={0.5} min={30} max={300} placeholder="80" borderColor={errors.weight ? 'var(--accent-danger)' : undefined} />
              {errors.weight && <span style={styles.error}>{errors.weight}</span>}
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>{t.addClient.heightCm}</label>
              <NumberStepper value={height} onChange={setHeight} step={1} min={100} max={250} placeholder="180" borderColor={errors.height ? 'var(--accent-danger)' : undefined} />
              {errors.height && <span style={styles.error}>{errors.height}</span>}
            </div>
          </div>

          <div style={{ ...styles.fieldGroup, maxWidth: isMobile ? '100%' : '50%' }}>
            <label style={styles.label}>{t.addClient.bodyFatPct}</label>
            <NumberStepper value={bodyFat} onChange={setBodyFat} step={0.5} min={3} max={60} placeholder="20" borderColor={errors.bodyFat ? 'var(--accent-danger)' : undefined} />
            {errors.bodyFat && <span style={styles.error}>{errors.bodyFat}</span>}
          </div>
        </GlassCard>

        {/* Goals */}
        <GlassCard delay={0.15}>
          <div style={styles.sectionHeader}>
            <Target size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>{t.addClient.goalsSeparated}</h3>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>{t.addClient.goalsSeparated}</label>
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
            <span style={styles.hint}>{t.addClient.goalsHint}</span>
          </div>
        </GlassCard>

        {/* Notes */}
        <GlassCard delay={0.2}>
          <div style={styles.sectionHeader}>
            <FileText size={16} color="var(--accent-primary)" />
            <h3 style={styles.sectionTitle}>{t.addClient.coachNotes}</h3>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>{t.addClient.notes}</label>
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
              <span style={styles.summaryLabel}>{t.addClient.plan}</span>
              <span style={styles.summaryValue}>{planLabels[plan]}</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>{t.addClient.monthlyRate}</span>
              <span style={{ ...styles.summaryValue, color: 'var(--accent-success)' }}>${planRates[plan]}</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>{t.addClient.status}</span>
              <span style={styles.summaryValue}>{t.common.pending}</span>
            </div>
          </div>

          <div style={{ ...styles.actions, width: isMobile ? '100%' : 'auto' }}>
            <button onClick={onBack} style={styles.cancelBtn}>{t.addClient.cancel}</button>
            <button onClick={handleSubmit} style={{ ...styles.saveBtn, flex: isMobile ? 1 : undefined }}>
              <Save size={16} />
              {t.addClient.saveClient}
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
    background: 'var(--bg-subtle)',
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
    background: 'var(--bg-subtle)',
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
    background: 'var(--bg-subtle)',
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
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
};
