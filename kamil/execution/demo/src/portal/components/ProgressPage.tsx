import { useState, useRef, useEffect } from 'react';
import { TrendingUp, Target, Scale, Droplets, Camera, X, Share2, Zap, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { Client, WorkoutLog, CheckIn } from '../types';

interface ProgressPageProps {
  client: Client;
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  coachName?: string;
}

// ── Overall progress calculation (local, no external imports) ──

function calculateOverallProgress(client: Client, workoutLogs: WorkoutLog[]): number {
  const { metrics, goalTargets } = client;
  const scores: number[] = [];

  if (goalTargets) {
    if (goalTargets.targetWeight != null && metrics.weight.length >= 2) {
      const start = metrics.weight[0];
      const current = metrics.weight[metrics.weight.length - 1];
      const target = goalTargets.targetWeight;
      const totalDistance = Math.abs(start - target);
      if (totalDistance > 0) {
        const traveled = Math.abs(start - current);
        const rightDirection =
          (target < start && current <= start) ||
          (target > start && current >= start);
        const pct = rightDirection ? (traveled / totalDistance) * 100 : 0;
        scores.push(Math.min(pct, 100));
      }
    }
    if (goalTargets.targetBodyFat != null && metrics.bodyFat.length >= 2) {
      const start = metrics.bodyFat[0];
      const current = metrics.bodyFat[metrics.bodyFat.length - 1];
      const target = goalTargets.targetBodyFat;
      const totalDistance = Math.abs(start - target);
      if (totalDistance > 0) {
        const traveled = Math.abs(start - current);
        const rightDirection =
          (target < start && current <= start) ||
          (target > start && current >= start);
        const pct = rightDirection ? (traveled / totalDistance) * 100 : 0;
        scores.push(Math.min(pct, 100));
      }
    }
    const liftGoals: { target?: number; data: number[] }[] = [
      { target: goalTargets.targetBenchPress, data: metrics.benchPress },
      { target: goalTargets.targetSquat, data: metrics.squat },
      { target: goalTargets.targetDeadlift, data: metrics.deadlift },
    ];
    for (const lift of liftGoals) {
      if (lift.target != null && lift.data.length >= 1) {
        const current = lift.data[lift.data.length - 1];
        const pct = (current / lift.target) * 100;
        scores.push(Math.min(pct, 100));
      }
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
  const recentLogs = workoutLogs.filter(w => w.clientId === client.id && w.date >= cutoff);
  let freqScore: number | null = null;
  if (recentLogs.length > 0) {
    const completed = recentLogs.filter(w => w.completed).length;
    freqScore = (completed / recentLogs.length) * 100;
  }

  const goalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  let progress: number;
  if (goalScore != null && freqScore != null) {
    progress = goalScore * 0.75 + freqScore * 0.25;
  } else if (goalScore != null) {
    progress = goalScore;
  } else if (freqScore != null) {
    progress = freqScore;
  } else {
    return client.progress;
  }
  return Math.round(Math.min(Math.max(progress, 0), 100));
}

// ── Simple animated number ──
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = 0;
    const to = value;
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

// @ts-ignore - coachName used in share card
export default function ProgressPage({ client, workoutLogs, checkIns, coachName }: ProgressPageProps) {
  const isMobile = useIsMobile();
  const { t, lang } = useLang();
  const [localCheckIns, setLocalCheckIns] = useState(checkIns);
  const [photoPose, setPhotoPose] = useState<'front' | 'side' | 'back'>('front');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'week1' | 'latest'>('week1');

  const { metrics } = client;
  const weights = metrics.weight;
  const startWeight = weights.length > 0 ? weights[0] : null;
  const currentWeight = weights.length > 0 ? weights[weights.length - 1] : null;

  const monthNames = lang === 'pl'
    ? ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Pa\u017a', 'Lis', 'Gru']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const checkInPhotos = localCheckIns
    .filter(ci => ci.photos && ci.photos.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstPhotos = checkInPhotos[0];
  const latestPhotos = checkInPhotos.length > 1 ? checkInPhotos[checkInPhotos.length - 1] : null;

  const getPhotoForPose = (ci: CheckIn | undefined, pose: string): string | null => {
    if (!ci?.photos) return null;
    const match = ci.photos.find(p => p.label.toLowerCase().includes(pose));
    return match?.url ?? null;
  };

  const poses: Array<{ key: 'front' | 'side' | 'back'; label: string }> = [
    { key: 'front', label: t.progress.front },
    { key: 'side', label: t.progress.side },
    { key: 'back', label: t.progress.back },
  ];

  // ── Lift PRs ──
  const liftLabels: Record<string, string> = lang === 'pl'
    ? { bench: 'Wyciskanie', squat: 'Przysiad', deadlift: 'Martwy Ci\u0105g' }
    : { bench: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift' };
  const allLifts = [
    { key: 'bench', name: liftLabels.bench, values: metrics.benchPress, unit: 'kg' },
    { key: 'squat', name: liftLabels.squat, values: metrics.squat, unit: 'kg' },
    { key: 'deadlift', name: liftLabels.deadlift, values: metrics.deadlift, unit: 'kg' },
  ];

  // ── Goal progress from goalTargets ──
  const targets = client.goalTargets ?? {};
  const goalProgress: { goal: string; progress: number; label: string }[] = [];

  if (targets.targetWeight && currentWeight) {
    const target = targets.targetWeight;
    if (startWeight) {
      if (startWeight === target) {
        goalProgress.push({ goal: t.progress.targetWeight, progress: 100, label: `${currentWeight}kg \u2192 ${target}kg` });
      } else {
        const pct = Math.min(100, Math.round(Math.abs((startWeight - currentWeight) / (startWeight - target)) * 100));
        goalProgress.push({ goal: t.progress.targetWeight, progress: Math.max(0, pct), label: `${currentWeight}kg \u2192 ${target}kg` });
      }
    } else {
      goalProgress.push({ goal: t.progress.targetWeight, progress: 0, label: `${currentWeight}kg \u2192 ${target}kg` });
    }
  }

  if (targets.targetBodyFat && metrics.bodyFat.length > 0) {
    const target = targets.targetBodyFat;
    const startBf = metrics.bodyFat[0];
    const currentBf = metrics.bodyFat[metrics.bodyFat.length - 1];
    if (startBf === target) {
      goalProgress.push({ goal: t.progress.targetBodyFat, progress: 100, label: `${currentBf}% \u2192 ${target}%` });
    } else {
      const pct = Math.min(100, Math.round(((startBf - currentBf) / (startBf - target)) * 100));
      goalProgress.push({ goal: t.progress.targetBodyFat, progress: Math.max(0, pct), label: `${currentBf}% \u2192 ${target}%` });
    }
  }

  if (targets.targetBenchPress && metrics.benchPress.length > 0) {
    const target = targets.targetBenchPress;
    const current = metrics.benchPress[metrics.benchPress.length - 1];
    goalProgress.push({ goal: t.progress.targetBenchPress, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
  }

  if (targets.targetSquat && metrics.squat.length > 0) {
    const target = targets.targetSquat;
    const current = metrics.squat[metrics.squat.length - 1];
    goalProgress.push({ goal: t.progress.targetSquat, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
  }

  if (targets.targetDeadlift && metrics.deadlift.length > 0) {
    const target = targets.targetDeadlift;
    const current = metrics.deadlift[metrics.deadlift.length - 1];
    goalProgress.push({ goal: t.progress.targetDeadlift, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
  }

  // Photo upload handler (demo - local state only)
  const handlePhotoUpload = (tgt: 'week1' | 'latest') => {
    setUploadTarget(tgt);
    photoInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const targetCheckIn = uploadTarget === 'week1' ? firstPhotos : (latestPhotos ?? localCheckIns.sort((a, b) => b.date.localeCompare(a.date))[0]);
      if (targetCheckIn) {
        setLocalCheckIns(prev => prev.map(ci =>
          ci.id === targetCheckIn.id
            ? { ...ci, photos: [...(ci.photos || []), { url: dataUrl, label: photoPose }] }
            : ci
        ));
      }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const weeksIn = client.startDate ? Math.max(1, Math.floor((Date.now() - new Date(client.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;
  const overallProgress = calculateOverallProgress(client, workoutLogs);
  const hasAnyData = (client.goalTargets && Object.values(client.goalTargets).some(v => v != null)) || workoutLogs.length > 0;
  const weightChange = startWeight && currentWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : null;
  const totalWorkoutsCompleted = workoutLogs.filter(w => w.completed).length;

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 14px 100px' : '24px 24px 80px', gap: isMobile ? '14px' : undefined }}>

      {/* ── OVERALL PROGRESS HERO ── */}
      <GlassCard delay={0} style={{ padding: isMobile ? '10px 14px' : '16px 20px', position: 'relative' as const, overflow: 'hidden' as const }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: isMobile ? '80px' : '110px', height: isMobile ? '80px' : '110px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,200,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ textAlign: 'center' as const, position: 'relative' as const }}>
          <div style={{
            fontSize: isMobile ? '10px' : '11px', fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: '1.5px', color: 'var(--text-tertiary)', marginBottom: isMobile ? '6px' : '10px',
          }}>
            {t.progress.overallProgress}
          </div>
          {hasAnyData ? (
            <>
              <div style={{ position: 'relative', width: isMobile ? '80px' : '100px', height: isMobile ? '80px' : '100px', margin: '0 auto' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={overallProgress >= 80 ? 'var(--accent-success, #22c55e)' : overallProgress >= 50 ? 'var(--accent-primary)' : 'var(--accent-warm, #f59e0b)'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - overallProgress / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: isMobile ? '20px' : '26px', fontWeight: 800, letterSpacing: '-1px',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
                  }}>
                    <AnimatedNumber value={overallProgress} duration={1200} />%
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'center', gap: isMobile ? '14px' : '20px',
                marginTop: isMobile ? '6px' : '8px', fontSize: isMobile ? '10px' : '11px', color: 'var(--text-tertiary)',
              }}>
                {goalProgress.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Target size={isMobile ? 11 : 13} color="var(--accent-primary)" />
                    <span>{t.progress.goalsComponent} 75%</span>
                  </div>
                )}
                {workoutLogs.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={isMobile ? 11 : 13} color="var(--accent-primary)" />
                    <span>{t.progress.frequencyComponent} 25%</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{
              padding: isMobile ? '12px 8px' : '16px 12px', fontSize: isMobile ? '12px' : '13px',
              color: 'var(--text-tertiary)', lineHeight: 1.6,
            }}>
              {t.progress.noDataYet}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── STATS: Strength + Body Composition ── */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: isMobile ? '6px' : '10px' }}>
        <div style={{ ...styles.strengthLabel, fontSize: isMobile ? '13px' : undefined }}>{t.progress.strength}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allLifts.length}, 1fr)`, gap: isMobile ? '6px' : '10px' }}>
          {allLifts.map((lift, i) => {
            const current = lift.values.length > 0 ? lift.values[lift.values.length - 1] : null;
            const startVal = lift.values.length > 0 ? lift.values[0] : null;
            const totalGain = current !== null && startVal !== null ? current - startVal : 0;
            return (
              <GlassCard key={lift.name} delay={0.05 + i * 0.05} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
                <div style={styles.statLabel}>{lift.name}</div>
                <div style={styles.statValue}>
                  {current !== null ? <AnimatedNumber value={current} duration={1200} /> : '-'}<span style={styles.statUnit}>{lift.unit}</span>
                </div>
                {totalGain > 0 && (
                  <div style={{ ...styles.statChange, color: 'var(--accent-success)' }}>
                    <TrendingUp size={isMobile ? 9 : 10} />
                    +{totalGain}{lift.unit}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>

        {/* Body Composition */}
        <div style={{ display: 'grid', gridTemplateColumns: client.height ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: isMobile ? '6px' : '10px' }}>
          <GlassCard delay={0.2} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
            <Scale size={isMobile ? 14 : 16} color="var(--accent-primary)" style={{ marginBottom: isMobile ? 2 : 4 }} />
            <div style={styles.statLabel}>{t.progress.weight}</div>
            <div style={styles.statValue}>
              {currentWeight !== null ? <><AnimatedNumber value={currentWeight} duration={1200} /><span style={styles.statUnit}>kg</span></> : '\u2014'}
            </div>
            {startWeight !== null && currentWeight !== null && weights.length > 1 && (
              <div style={{ ...styles.statChange, color: currentWeight <= startWeight ? 'var(--accent-primary)' : 'var(--accent-warm)' }}>
                {currentWeight <= startWeight ? '' : '+'}{(currentWeight - startWeight).toFixed(1)} kg
              </div>
            )}
          </GlassCard>

          <GlassCard delay={0.25} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
            <Droplets size={isMobile ? 14 : 16} color="var(--accent-secondary)" style={{ marginBottom: isMobile ? 2 : 4 }} />
            <div style={styles.statLabel}>{t.progress.bodyFat}</div>
            <div style={styles.statValue}>
              {metrics.bodyFat.length > 0 ? <><AnimatedNumber value={metrics.bodyFat[metrics.bodyFat.length - 1]} duration={1200} /><span style={styles.statUnit}>%</span></> : '\u2014'}
            </div>
            {metrics.bodyFat.length > 1 && (
              <div style={{ ...styles.statChange, color: metrics.bodyFat[metrics.bodyFat.length - 1] <= metrics.bodyFat[0] ? 'var(--accent-primary)' : 'var(--accent-warm)' }}>
                {metrics.bodyFat[metrics.bodyFat.length - 1] <= metrics.bodyFat[0] ? '' : '+'}{(metrics.bodyFat[metrics.bodyFat.length - 1] - metrics.bodyFat[0]).toFixed(1)}%
              </div>
            )}
          </GlassCard>

          {client.height && (
            <GlassCard delay={0.3} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
              <TrendingUp size={isMobile ? 14 : 16} color="var(--accent-warm)" style={{ marginBottom: isMobile ? 2 : 4 }} />
              <div style={styles.statLabel}>{t.progress.height}</div>
              <div style={styles.statValue}>
                {client.height}<span style={styles.statUnit}>cm</span>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* ── BODY MEASUREMENTS TABLE ── */}
      {(() => {
        const measurementKeys = ['waist', 'hips', 'chest', 'bicep', 'thigh'] as const;
        const measurementLabels: Record<string, string> = {
          waist: t.progress.waist,
          hips: t.progress.hips,
          chest: t.progress.chest,
          bicep: t.progress.bicep,
          thigh: t.progress.thigh,
        };
        const hasMeasurements = measurementKeys.some(k => metrics[k] && metrics[k].length > 0);

        return hasMeasurements ? (
          <GlassCard delay={0.32} style={{ marginTop: '14px', ...(isMobile ? { padding: '14px' } : {}) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '12px' : '16px' }}>
              <Ruler size={isMobile ? 14 : 16} color="var(--accent-primary)" />
              <span style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t.progress.measurements}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 0 }}>
              {/* Header row */}
              <div style={{ padding: isMobile ? '6px 0' : '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>&nbsp;</span>
              </div>
              {[t.progress.start, t.progress.current, t.progress.change].map(header => (
                <div key={header} style={{ padding: isMobile ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' as const }}>
                  <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{header}</span>
                </div>
              ))}
              {/* Data rows */}
              {measurementKeys.map(key => {
                const vals = metrics[key];
                if (!vals || vals.length === 0) return null;
                const startVal = vals[0];
                const currentVal = vals[vals.length - 1];
                const change = currentVal - startVal;
                const showChange = vals.length > 1;
                return [
                  <div key={`${key}-label`} style={{ padding: isMobile ? '8px 0' : '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{measurementLabels[key]}</span>
                  </div>,
                  <div key={`${key}-start`} style={{ padding: isMobile ? '8px 8px' : '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' as const }}>
                    <span style={{ fontSize: isMobile ? '13px' : '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{startVal}</span>
                    <span style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>cm</span>
                  </div>,
                  <div key={`${key}-current`} style={{ padding: isMobile ? '8px 8px' : '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' as const }}>
                    <span style={{ fontSize: isMobile ? '13px' : '14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{currentVal}</span>
                    <span style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>cm</span>
                  </div>,
                  <div key={`${key}-change`} style={{ padding: isMobile ? '8px 8px' : '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' as const }}>
                    {showChange ? (
                      <span style={{
                        fontSize: isMobile ? '13px' : '14px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: change < 0 ? 'var(--accent-primary)' : change > 0 ? 'var(--accent-warm)' : 'var(--text-tertiary)',
                      }}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ fontSize: isMobile ? '12px' : '13px', color: 'var(--text-tertiary)' }}>{'\u2014'}</span>
                    )}
                  </div>,
                ];
              })}
            </div>
          </GlassCard>
        ) : null;
      })()}

      {/* ── GOALS ── */}
      {goalProgress.length > 0 && (
        <GlassCard delay={0.3} style={{ marginTop: '14px', ...(isMobile ? { padding: '14px' } : {}) }}>
          <div style={{ ...styles.goalsHeader, marginBottom: isMobile ? '12px' : undefined }}>
            <Target size={isMobile ? 14 : 16} color="var(--accent-primary)" />
            <span style={{ ...styles.goalsTitle, fontSize: isMobile ? '14px' : undefined }}>{t.progress.goals}</span>
            <span style={{ ...styles.goalsCount, fontSize: isMobile ? '10px' : undefined }}>
              {goalProgress.filter(g => g.progress >= 100).length}/{goalProgress.length}
            </span>
          </div>
          <div style={{ ...styles.goalsList, gap: isMobile ? '12px' : undefined }}>
            {goalProgress.map((g, i) => {
              const color = g.progress >= 100 ? 'var(--accent-success)' : g.progress >= 50 ? 'var(--accent-primary)' : 'var(--accent-warm, #f59e0b)';
              return (
                <div key={i} style={{ ...styles.goalItem, gap: isMobile ? '4px' : undefined }}>
                  <div style={styles.goalTop}>
                    <div style={{ ...styles.goalName, fontSize: isMobile ? '13px' : undefined }}>{g.goal}</div>
                    <div style={{ ...styles.goalPct, color, fontSize: isMobile ? '13px' : undefined }}>{g.progress}%</div>
                  </div>
                  <div style={{ ...styles.goalBarBg, height: isMobile ? '5px' : undefined }}>
                    <div style={{ ...styles.goalBarFill, width: `${Math.max(g.progress, 2)}%`, background: color }} />
                  </div>
                  <div style={{ ...styles.goalLabel, fontSize: isMobile ? '10px' : undefined }}>{g.label}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── PROGRESS PHOTOS ── */}
      <GlassCard delay={0.35} style={{ marginTop: '14px', ...(isMobile ? { padding: '14px' } : {}) }}>
        <div style={{ ...styles.photosHeader, marginBottom: isMobile ? '12px' : undefined }}>
          <Camera size={isMobile ? 14 : 16} color="var(--accent-primary)" />
          <span style={{ ...styles.photosTitle, fontSize: isMobile ? '14px' : undefined }}>{t.progress.progressPhotos}</span>
          <div style={styles.poseTabs}>
            {poses.map(p => (
              <button
                key={p.key}
                onClick={() => setPhotoPose(p.key)}
                style={{
                  ...styles.poseTab,
                  ...(photoPose === p.key ? styles.poseTabActive : {}),
                  ...(isMobile ? { padding: '3px 8px', fontSize: '10px' } : {}),
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

        {(firstPhotos || latestPhotos) ? (
          <div style={styles.photoCompare}>
            <div style={styles.photoSide}>
              <div style={styles.photoDateLabel}>{t.progress.week1}</div>
              {(() => {
                const userSrc = getPhotoForPose(firstPhotos, photoPose);
                const ciDate = firstPhotos?.date ? new Date(firstPhotos.date) : null;
                const ciWeight = firstPhotos?.weight ?? null;
                if (userSrc) {
                  return (
                    <>
                      <div style={styles.photoFrame} onClick={() => setLightboxSrc(userSrc)}>
                        <img src={userSrc} alt={`${t.progress.week1} ${photoPose}`} style={styles.photoImg} />
                      </div>
                      <div style={styles.photoMeta}>
                        {ciDate ? monthNames[ciDate.getMonth()] : ''}{ciWeight != null ? ` \u00b7 ${ciWeight}kg` : ''}
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>
            {latestPhotos && (
              <div style={styles.photoSide}>
                <div style={styles.photoDateLabel}>{t.progress.latest}</div>
                {(() => {
                  const userSrc = getPhotoForPose(latestPhotos, photoPose);
                  const ciDate = latestPhotos?.date ? new Date(latestPhotos.date) : null;
                  const ciWeight = latestPhotos?.weight ?? null;
                  if (userSrc) {
                    return (
                      <>
                        <div style={styles.photoFrame} onClick={() => setLightboxSrc(userSrc)}>
                          <img src={userSrc} alt={`${t.progress.latest} ${photoPose}`} style={styles.photoImg} />
                        </div>
                        <div style={styles.photoMeta}>
                          {ciDate ? monthNames[ciDate.getMonth()] : ''}{ciWeight != null ? ` \u00b7 ${ciWeight}kg` : ''}
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        ) : null}

        <button
          onClick={() => handlePhotoUpload(firstPhotos ? 'latest' : 'week1')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: isMobile ? '11px' : '14px', borderRadius: '10px',
            border: '1.5px dashed rgba(0,229,200,0.3)', background: 'rgba(0,229,200,0.04)',
            color: 'var(--accent-primary)', fontSize: isMobile ? '13px' : '14px', fontWeight: 600,
            fontFamily: 'var(--font-display)', cursor: 'pointer', transition: 'all 0.15s',
            marginTop: (firstPhotos || latestPhotos) ? '8px' : '0',
          }}
        >
          <Camera size={16} />
          {uploading ? t.progress.uploading : `+ ${t.progress.uploadPhoto}`}
        </button>
      </GlassCard>

      {/* Share Progress Button */}
      <button
        onClick={() => setShowShareCard(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%', padding: isMobile ? '10px' : '12px', borderRadius: '10px',
          background: 'rgba(0,229,200,0.06)', border: '1px solid rgba(0,229,200,0.2)',
          color: 'var(--accent-primary)', fontSize: isMobile ? '13px' : '14px', fontWeight: 600,
          fontFamily: 'var(--font-display)', cursor: 'pointer',
          transition: 'all 0.15s', marginTop: '14px',
        }}
      >
        <Share2 size={16} />
        {t.progress.shareProgress}
      </button>

      {/* Share Card Modal */}
      {showShareCard && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setShowShareCard(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #0c1017 0%, #111827 100%)',
            borderRadius: '20px', padding: '28px', maxWidth: '380px', width: '100%',
            border: '1px solid rgba(0,229,200,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                {t.progress.overallProgress}
              </div>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {overallProgress}%
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{lang === 'pl' ? 'Tygodnie' : 'Weeks In'}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{weeksIn}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{lang === 'pl' ? 'Treningi' : 'Workouts'}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{totalWorkoutsCompleted}</div>
              </div>
              {weightChange !== null && (
                <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{t.progress.weight}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: weightChange <= 0 ? 'var(--accent-primary)' : 'var(--accent-warm)' }}>
                    {weightChange > 0 ? '+' : ''}{weightChange}kg
                  </div>
                </div>
              )}
              {allLifts.some(l => l.values.length > 0) && (
                <div style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Best Lift</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                    {Math.max(...allLifts.flatMap(l => l.values))}kg
                  </div>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              {lang === 'pl' ? `Trener: ${coachName || 'Coach'}` : `Coach: ${coachName || 'Coach'}`} &middot; FitCore
            </div>
            <button
              onClick={() => setShowShareCard(false)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                background: 'var(--accent-primary)', border: 'none',
                color: '#000', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {lang === 'pl' ? 'Zamknij' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxSrc(null)}>
          <button style={styles.lightboxClose} onClick={() => setLightboxSrc(null)}>
            <X size={24} />
          </button>
          <img
            src={lightboxSrc}
            alt="Progress photo"
            style={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '100%',
  },
  strengthLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.2px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px 12px',
    textAlign: 'center',
    minHeight: '90px',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  statUnit: {
    fontSize: '12px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
    marginLeft: 2,
  },
  statChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    marginTop: '6px',
  },
  goalsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  goalsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  goalsCount: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: 'auto',
  },
  goalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  goalItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  goalTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  goalPct: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  goalBarBg: {
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.8s ease',
  },
  goalLabel: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  photosHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  photosTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  poseTabs: {
    display: 'flex',
    gap: '4px',
    marginLeft: 'auto',
  },
  poseTab: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  poseTabActive: {
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    borderColor: 'rgba(0,229,200,0.25)',
  },
  photoCompare: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  photoSide: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  photoDateLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: '10px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
    position: 'relative',
    cursor: 'pointer',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoMeta: {
    fontSize: '11px',
    fontWeight: 500,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-tertiary)',
  },
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  lightboxClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 101,
  },
  lightboxImg: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '12px',
    cursor: 'default',
  },
};
