import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Ruler, Target, ChevronRight, Loader2, Dumbbell, Trophy } from 'lucide-react';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';

interface OnboardingPageProps {
  client: Client;
  coachName: string;
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

const TOTAL_STEPS = 5;

export default function OnboardingPage({ client, coachName, onComplete }: OnboardingPageProps) {
  const { t } = useLang();
  const ob = t.onboarding;

  const [step, setStep] = useState(0); // 0=welcome, 1=stats, 2=PRs, 3=goals, 4=summary
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [benchPR, setBenchPR] = useState('');
  const [squatPR, setSquatPR] = useState('');
  const [deadliftPR, setDeadliftPR] = useState('');
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

  const toggleGoal = (key: string) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');

    const heightNum = height ? Number(height) : null;
    const weightNum = weight ? Number(weight) : null;
    const bodyFatNum = bodyFat ? Number(bodyFat) : null;
    const benchNum = benchPR ? Number(benchPR) : null;
    const squatNum = squatPR ? Number(squatPR) : null;
    const deadliftNum = deadliftPR ? Number(deadliftPR) : null;

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

    // Insert initial metrics if provided
    if (weightNum || bodyFatNum || benchNum || squatNum || deadliftNum) {
      await supabase.from('client_metrics').insert({
        client_id: client.id,
        recorded_at: new Date().toISOString().split('T')[0],
        weight: weightNum,
        body_fat: bodyFatNum,
        bench_press: benchNum,
        squat: squatNum,
        deadlift: deadliftNum,
      });
    }

    onComplete({
      height: heightNum,
      goals: selectedGoals,
      onboarded: true,
      metrics: {
        weight: weightNum ? [weightNum] : client.metrics?.weight ?? [],
        bodyFat: bodyFatNum ? [bodyFatNum] : client.metrics?.bodyFat ?? [],
        benchPress: benchNum ? [benchNum] : client.metrics?.benchPress ?? [],
        squat: squatNum ? [squatNum] : client.metrics?.squat ?? [],
        deadlift: deadliftNum ? [deadliftNum] : client.metrics?.deadlift ?? [],
      },
    });
  };

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  // Summary data for step 4
  const summaryItems = [
    ...(height ? [{ label: ob.heightCm, value: `${height} cm` }] : []),
    ...(weight ? [{ label: ob.weightKg, value: `${weight} kg` }] : []),
    ...(bodyFat ? [{ label: ob.bodyFatPercent, value: `${bodyFat}%` }] : []),
    ...(benchPR ? [{ label: ob.benchPress, value: `${benchPR} kg` }] : []),
    ...(squatPR ? [{ label: ob.squat, value: `${squatPR} kg` }] : []),
    ...(deadliftPR ? [{ label: ob.deadlift, value: `${deadliftPR} kg` }] : []),
  ];

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {/* Step indicators */}
        <div style={styles.steps}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
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
              <p style={styles.subtitle}>{ob.welcomeSub(coachName)}</p>
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

              {/* Body fat - optional with skip hint */}
              <div style={{ width: '100%' }}>
                <label style={styles.label}>{ob.bodyFatPercent}</label>
                <input
                  type="number"
                  value={bodyFat}
                  onChange={e => setBodyFat(e.target.value)}
                  placeholder={ob.bodyFatPlaceholder}
                  style={styles.input}
                  min={3}
                  max={60}
                  step={0.1}
                />
                <div style={styles.optionalHint}>{ob.optional}</div>
              </div>

              <button onClick={() => setStep(2)} style={styles.btn}>
                {ob.next}
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── Step 2: PRs ── */}
          {step === 2 && (
            <motion.div
              key="prs"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              style={styles.card}
            >
              <div style={styles.iconWrap}>
                <Dumbbell size={36} color="var(--accent-primary)" />
              </div>
              <h2 style={styles.title}>{ob.prsTitle}</h2>
              <p style={styles.subtitle}>{ob.prsSub}</p>

              <div style={styles.prGrid}>
                <div style={styles.prCard}>
                  <span style={styles.prEmoji}>🏋️</span>
                  <label style={styles.prLabel}>{ob.benchPress}</label>
                  <div style={styles.prInputWrap}>
                    <input
                      type="number"
                      value={benchPR}
                      onChange={e => setBenchPR(e.target.value)}
                      placeholder="—"
                      style={styles.prInput}
                      min={0}
                      max={500}
                    />
                    <span style={styles.prUnit}>kg</span>
                  </div>
                </div>

                <div style={styles.prCard}>
                  <span style={styles.prEmoji}>🦵</span>
                  <label style={styles.prLabel}>{ob.squat}</label>
                  <div style={styles.prInputWrap}>
                    <input
                      type="number"
                      value={squatPR}
                      onChange={e => setSquatPR(e.target.value)}
                      placeholder="—"
                      style={styles.prInput}
                      min={0}
                      max={500}
                    />
                    <span style={styles.prUnit}>kg</span>
                  </div>
                </div>

                <div style={styles.prCard}>
                  <span style={styles.prEmoji}>💀</span>
                  <label style={styles.prLabel}>{ob.deadlift}</label>
                  <div style={styles.prInputWrap}>
                    <input
                      type="number"
                      value={deadliftPR}
                      onChange={e => setDeadliftPR(e.target.value)}
                      placeholder="—"
                      style={styles.prInput}
                      min={0}
                      max={500}
                    />
                    <span style={styles.prUnit}>kg</span>
                  </div>
                </div>
              </div>

              <div style={styles.optionalHint}>{ob.prsSkipHint}</div>

              <div style={styles.btnRow}>
                <button onClick={() => setStep(3)} style={styles.btnSecondary}>
                  {ob.skip}
                </button>
                <button onClick={() => setStep(3)} style={{ ...styles.btn, flex: 1 }}>
                  {ob.next}
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Goals ── */}
          {step === 3 && (
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

              {error && step === 3 && (
                <div style={{ color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => {
                  if (selectedGoals.length === 0) {
                    setError(ob.selectAtLeastOne);
                    return;
                  }
                  setError('');
                  setStep(4);
                }}
                style={styles.btn}
              >
                {ob.next}
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── Step 4: Summary ── */}
          {step === 4 && (
            <motion.div
              key="summary"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              style={styles.card}
            >
              <div style={styles.iconWrap}>
                <Trophy size={36} color="var(--accent-primary)" />
              </div>
              <h2 style={styles.title}>{ob.summaryTitle}</h2>
              <p style={styles.subtitle}>{ob.summarySub(client.name)}</p>

              {/* Profile card */}
              <div style={styles.summaryCard}>
                <div style={styles.summaryHeader}>
                  <div style={styles.summaryAvatar}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.summaryName}>{client.name}</div>
                    <div style={styles.summaryCoach}>{ob.coachedBy(coachName)}</div>
                  </div>
                </div>

                {/* Stats grid */}
                {summaryItems.length > 0 && (
                  <div style={styles.summaryGrid}>
                    {summaryItems.map((item, i) => (
                      <div key={i} style={styles.summaryStatItem}>
                        <div style={styles.summaryStatValue}>{item.value}</div>
                        <div style={styles.summaryStatLabel}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Goals */}
                <div style={styles.summaryGoals}>
                  <div style={styles.summaryGoalsLabel}>{ob.goalsTitle}</div>
                  <div style={styles.summaryGoalTags}>
                    {selectedGoals.map((key) => (
                      <span key={key} style={styles.summaryGoalTag}>
                        {GOAL_ICONS[GOAL_KEYS.indexOf(key as typeof GOAL_KEYS[number])]} {goalLabels[key]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {error && step === 4 && (
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
                {saving ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {saving ? ob.saving : ob.finish}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step counter */}
        <div style={styles.stepText}>
          {ob.step(step + 1, TOTAL_STEPS)}
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
    overflowY: 'auto',
  },
  container: {
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '20px 0',
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
  btnSecondary: {
    padding: '13px 24px',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnRow: {
    width: '100%',
    display: 'flex',
    gap: '10px',
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
  optionalHint: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: '4px',
    textAlign: 'center',
  },
  // PR step styles
  prGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  prCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.02)',
  },
  prEmoji: {
    fontSize: '24px',
    flexShrink: 0,
  },
  prLabel: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  prInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  prInput: {
    width: '72px',
    padding: '8px 10px',
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
  prUnit: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
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
  // Summary step styles
  summaryCard: {
    width: '100%',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  summaryAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '20px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryName: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  summaryCoach: {
    fontSize: '13px',
    color: 'var(--accent-primary)',
    fontWeight: 500,
    textAlign: 'left',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    padding: '12px 0',
    borderTop: '1px solid var(--glass-border)',
    borderBottom: '1px solid var(--glass-border)',
  },
  summaryStatItem: {
    textAlign: 'center',
  },
  summaryStatValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  summaryStatLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginTop: '2px',
  },
  summaryGoals: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryGoalsLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    textAlign: 'left',
  },
  summaryGoalTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  summaryGoalTag: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid var(--accent-primary)',
    whiteSpace: 'nowrap',
  },
  stepText: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
};
