import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Ruler, Target, ChevronRight, Loader2 } from 'lucide-react';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';

interface OnboardingPageProps {
  client: Client;
  onComplete: (updates: Partial<Client>) => void;
}

const GOAL_KEYS = [
  'goalLoseWeight',
  'goalBuildMuscle',
  'goalGetStronger',
  'goalEndurance',
  'goalFlexibility',
  'goalHealth',
] as const;

const GOAL_ICONS = ['🔥', '💪', '🏋️', '🏃', '🧘', '❤️'];

export default function OnboardingPage({ client, onComplete }: OnboardingPageProps) {
  const { t } = useLang();
  const ob = t.onboarding;

  const [step, setStep] = useState(0); // 0=welcome, 1=stats, 2=goals
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const goalLabels: Record<string, string> = {
    goalLoseWeight: ob.goalLoseWeight,
    goalBuildMuscle: ob.goalBuildMuscle,
    goalGetStronger: ob.goalGetStronger,
    goalEndurance: ob.goalEndurance,
    goalFlexibility: ob.goalFlexibility,
    goalHealth: ob.goalHealth,
  };

  // Store goal KEYS (not translated labels) so they are language-independent (#25/#37)
  const toggleGoal = (key: string) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    if (selectedGoals.length === 0) {
      setError(ob.selectAtLeastOne);
      return;
    }

    setSaving(true);
    setError('');

    const heightNum = height ? Number(height) : null;
    const weightNum = weight ? Number(weight) : null;

    // Update client row
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        height: heightNum,
        goals: selectedGoals,
        onboarded: true,
      })
      .eq('id', client.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Insert initial weight metric if provided
    if (weightNum) {
      await supabase.from('client_metrics').insert({
        client_id: client.id,
        recorded_at: new Date().toISOString().split('T')[0],
        weight: weightNum,
      });
    }

    onComplete({
      height: heightNum,
      goals: selectedGoals,
      onboarded: true,
      metrics: weightNum
        ? { ...client.metrics, weight: [weightNum] }
        : client.metrics,
    });
  };

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {/* Step indicators */}
        <div style={styles.steps}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                ...styles.stepDot,
                background: i <= step ? 'var(--accent-primary)' : 'var(--glass-border)',
                boxShadow: i <= step ? '0 0 8px var(--accent-primary-glow)' : 'none',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <motion.div
              key="welcome"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              style={styles.card}
            >
              <div style={styles.iconWrap}>
                <Sparkles size={40} color="var(--accent-primary)" />
              </div>
              <h1 style={styles.title}>{ob.welcomeTitle(client.name)}</h1>
              <p style={styles.subtitle}>{ob.welcomeSub}</p>
              <button onClick={() => setStep(1)} style={styles.btn}>
                {ob.getStarted}
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── Step 1: Stats ── */}
          {step === 1 && (
            <motion.div
              key="stats"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              style={styles.card}
            >
              <div style={styles.iconWrap}>
                <Ruler size={36} color="var(--accent-primary)" />
              </div>
              <h2 style={styles.title}>{ob.statsTitle}</h2>
              <p style={styles.subtitle}>{ob.statsSub}</p>

              <div style={styles.fields}>
                <div style={styles.field}>
                  <label style={styles.label}>{ob.heightCm}</label>
                  <input
                    type="number"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="175"
                    style={styles.input}
                    min={100}
                    max={250}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{ob.weightKg}</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="75"
                    style={styles.input}
                    min={30}
                    max={300}
                  />
                </div>
              </div>

              <button onClick={() => setStep(2)} style={styles.btn}>
                {ob.next}
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Goals ── */}
          {step === 2 && (
            <motion.div
              key="goals"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              style={styles.card}
            >
              <div style={styles.iconWrap}>
                <Target size={36} color="var(--accent-primary)" />
              </div>
              <h2 style={styles.title}>{ob.goalsTitle}</h2>
              <p style={styles.subtitle}>{ob.goalsSub}</p>

              <div style={styles.goalGrid}>
                {GOAL_KEYS.map((key, i) => {
                  const label = goalLabels[key];
                  const selected = selectedGoals.includes(key);
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleGoal(key)}
                      style={{
                        ...styles.goalCard,
                        borderColor: selected ? 'var(--accent-primary)' : 'var(--glass-border)',
                        background: selected ? 'var(--accent-primary-dim)' : 'rgba(255,255,255,0.02)',
                        boxShadow: selected ? '0 0 16px var(--accent-primary-dim)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{GOAL_ICONS[i]}</span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: selected ? 700 : 500,
                        color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}>
                        {label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {error && (
                <div style={{ color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  ...styles.btn,
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? <Loader2 size={16} className="spin" /> : null}
                {saving ? ob.saving : ob.finish}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step counter */}
        <div style={styles.stepText}>
          {ob.step(step + 1, 3)}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    zIndex: 100,
    padding: '20px',
  },
  container: {
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  steps: {
    display: 'flex',
    gap: '8px',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  card: {
    width: '100%',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 32px',
    boxShadow: 'var(--shadow-elevated)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    textAlign: 'center',
  },
  iconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'var(--accent-primary-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: '340px',
  },
  btn: {
    width: '100%',
    padding: '13px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
    transition: 'opacity 0.15s',
    marginTop: '4px',
  },
  fields: {
    width: '100%',
    display: 'flex',
    gap: '12px',
  },
  field: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    textAlign: 'center',
    transition: 'border-color 0.15s',
  },
  goalGrid: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  goalCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
  stepText: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
};
