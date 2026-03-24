import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Scale, Droplets, Camera, X, Share2, Zap, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';
import ShareProgressCard from './ShareProgressCard';
// Charts will be re-enabled once clients have enough data points
// import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis, Tooltip } from 'recharts';
import GlassCard from './GlassCard';
import AnimatedNumber from './AnimatedNumber';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { matchMainLift, MAIN_LIFT_PATTERNS, parseTarget } from '../utils/lift-matching';
import { calculateOverallProgress } from '../utils/calculateProgress';
import type { Client, WorkoutLog, CheckIn, WorkoutSetLog } from '../types';


interface ProgressPageProps {
  client: Client;
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  setLogs: WorkoutSetLog[];
  coachName?: string;
}

export default function ProgressPage({ client, workoutLogs, checkIns, setLogs, coachName }: ProgressPageProps) {
  const isMobile = useIsMobile();
  const { t, lang } = useLang();
  const [showShareCard, setShowShareCard] = useState(false);
  const [localCheckIns, setLocalCheckIns] = useState(checkIns);
  useEffect(() => { setLocalCheckIns(checkIns); }, [checkIns]);
  const [photoPose, setPhotoPose] = useState<'front' | 'side' | 'back'>('front');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'week1' | 'latest'>('week1');


  const { metrics } = client;
  const weights = metrics.weight;
  const startWeight = weights.length > 0 ? weights[0] : null;
  const currentWeight = weights.length > 0 ? weights[weights.length - 1] : null;

  const monthNames = lang === 'pl'
    ? ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Progress photos - check-in photos from DB
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

  // ── Main 3 Lift PRs from workout set logs ──

  const liftMap = new Map<string, number[]>();
  const completedSets = setLogs.filter(l => l.completed && l.weight);
  const sortedSets = [...completedSets].sort((a, b) => a.date.localeCompare(b.date));
  for (const log of sortedSets) {
    const w = parseFloat(log.weight);
    if (isNaN(w) || w <= 0) continue;
    const liftKey = matchMainLift(log.exerciseName);
    if (!liftKey) continue; // Skip non-main lifts
    if (!liftMap.has(liftKey)) liftMap.set(liftKey, []);
    const vals = liftMap.get(liftKey)!;
    const lastVal = vals.length > 0 ? vals[vals.length - 1] : 0;
    if (vals.length === 0 || w !== lastVal) vals.push(w);
  }

  // Build the 3 main lifts array — show all 3 even if no data yet
  const liftLabels: Record<string, string> = lang === 'pl'
    ? { bench: 'Wyciskanie', squat: 'Przysiad', deadlift: 'Martwy Ciąg' }
    : { bench: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift' };
  const allLifts = MAIN_LIFT_PATTERNS.map(lift => ({
    name: liftLabels[lift.key] || lift.label,
    values: liftMap.get(lift.key) ?? metrics[lift.key === 'bench' ? 'benchPress' : lift.key === 'squat' ? 'squat' : 'deadlift'] ?? [],
    unit: 'kg',
  }));

  // ── Goal progress - use goalTargets for measurable progress ──

  const targets = client.goalTargets ?? {};
  const goalProgress: { goal: string; progress: number; label: string }[] = [];

  // Weight target (from goalTargets)
  if (targets.targetWeight && currentWeight) {
    const target = targets.targetWeight;
    if (startWeight) {
      if (startWeight === target) {
        goalProgress.push({ goal: t.onboarding?.targetWeight ?? 'Target Weight', progress: 100, label: `${currentWeight}kg → ${target}kg` });
      } else {
        const pct = Math.min(100, Math.round(Math.abs((startWeight - currentWeight) / (startWeight - target)) * 100));
        goalProgress.push({ goal: t.onboarding?.targetWeight ?? 'Target Weight', progress: Math.max(0, pct), label: `${currentWeight}kg → ${target}kg` });
      }
    } else {
      goalProgress.push({ goal: t.onboarding?.targetWeight ?? 'Target Weight', progress: 0, label: `${currentWeight}kg → ${target}kg` });
    }
  }

  // Body fat target (from goalTargets)
  if (targets.targetBodyFat && metrics.bodyFat.length > 0) {
    const target = targets.targetBodyFat;
    const startBf = metrics.bodyFat[0];
    const currentBf = metrics.bodyFat[metrics.bodyFat.length - 1];
    if (startBf === target) {
      goalProgress.push({ goal: t.onboarding?.targetBodyFat ?? 'Target Body Fat', progress: 100, label: `${currentBf}% → ${target}%` });
    } else {
      const pct = Math.min(100, Math.round(((startBf - currentBf) / (startBf - target)) * 100));
      goalProgress.push({ goal: t.onboarding?.targetBodyFat ?? 'Target Body Fat', progress: Math.max(0, pct), label: `${currentBf}% → ${target}%` });
    }
  }

  // Bench press target (from goalTargets)
  if (targets.targetBenchPress && metrics.benchPress.length > 0) {
    const target = targets.targetBenchPress;
    const current = metrics.benchPress[metrics.benchPress.length - 1];
    goalProgress.push({ goal: t.onboarding?.targetBenchPress ?? 'Bench Press', progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
  }

  // Squat target (from goalTargets)
  if (targets.targetSquat && metrics.squat.length > 0) {
    const target = targets.targetSquat;
    const current = metrics.squat[metrics.squat.length - 1];
    goalProgress.push({ goal: t.onboarding?.targetSquat ?? 'Squat', progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
  }

  // Deadlift target (from goalTargets)
  if (targets.targetDeadlift && metrics.deadlift.length > 0) {
    const target = targets.targetDeadlift;
    const current = metrics.deadlift[metrics.deadlift.length - 1];
    goalProgress.push({ goal: t.onboarding?.targetDeadlift ?? 'Deadlift', progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
  }

  // Fallback: also handle old-style free-text goals that have parseable targets
  for (const goal of client.goals) {
    const g = goal.toLowerCase();
    // Skip goal keys (handled above via goalTargets)
    if (g.startsWith('goal')) continue;
    // Try parsing free-text goals with numbers (backwards compatibility)
    if (g.includes('bench') && metrics.benchPress.length > 0 && !targets.targetBenchPress) {
      const target = parseTarget(goal) ?? 100;
      const current = metrics.benchPress[metrics.benchPress.length - 1];
      goalProgress.push({ goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
    } else if (g.includes('squat') && metrics.squat.length > 0 && !targets.targetSquat) {
      const target = parseTarget(goal) ?? 140;
      const current = metrics.squat[metrics.squat.length - 1];
      goalProgress.push({ goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
    } else if ((g.includes('deadlift') || g.includes('dead lift')) && metrics.deadlift.length > 0 && !targets.targetDeadlift) {
      const target = parseTarget(goal) ?? 180;
      const current = metrics.deadlift[metrics.deadlift.length - 1];
      goalProgress.push({ goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` });
    } else if ((g.includes('weight') || g.includes('drop') || g.includes('cut')) && !g.includes('bench') && !g.includes('squat') && !g.includes('dead') && !targets.targetWeight) {
      const target = parseTarget(goal);
      if (target && startWeight && currentWeight) {
        const pct = Math.min(100, Math.round(((startWeight - currentWeight) / (startWeight - target)) * 100));
        goalProgress.push({ goal, progress: Math.max(0, pct), label: `${currentWeight}kg → ${target}kg` });
      }
    }
  }

  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = (target: 'week1' | 'latest') => {
    setUploadTarget(target);
    photoInputRef.current?.click();
  };

  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError(t.progress.photoInvalidType);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError(t.progress.photoTooLarge);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      // Sanitize label for path construction
      const safeLabel = photoPose.replace(/[^a-zA-Z0-9_-]/g, '_');
      const path = `${client.id}/${uploadTarget}-${safeLabel}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('progress-photos').upload(path, file, { upsert: true });
      if (uploadErr) { console.error('Photo upload failed:', uploadErr); return; }

      // Store path (not signed URL) — signed URLs generated on-the-fly when loading
      // Generate a signed URL for immediate display
      const { data: signedData } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(path, 86400);
      const displayUrl = signedData?.signedUrl || path;

      // Find the target check-in to attach the photo to
      const targetCheckIn = uploadTarget === 'week1' ? firstPhotos : (latestPhotos ?? localCheckIns.sort((a, b) => b.date.localeCompare(a.date))[0]);
      if (targetCheckIn) {
        // Store path in DB (not the signed URL)
        await supabase.from('check_in_photos').insert({
          check_in_id: targetCheckIn.id,
          url: path,
          label: photoPose,
        });

        // Update local state with signed URL for immediate display
        setLocalCheckIns(prev => prev.map(ci =>
          ci.id === targetCheckIn.id
            ? { ...ci, photos: [...(ci.photos || []), { url: displayUrl, label: photoPose }] }
            : ci
        ));
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Compute share card data
  const weeksIn = client.startDate ? Math.max(1, Math.floor((Date.now() - new Date(client.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;
  const overallProgress = calculateOverallProgress(client, workoutLogs);
  const hasAnyData = (client.goalTargets && Object.values(client.goalTargets).some(v => v != null)) || workoutLogs.length > 0;

  const weightChange = startWeight && currentWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : null;
  const totalWorkoutsCompleted = workoutLogs.filter(w => w.completed).length;
  const completionRate = workoutLogs.length > 0 ? Math.round((totalWorkoutsCompleted / workoutLogs.length) * 100) : 0;
  const getBestLift = (key: string) => {
    const vals = liftMap.get(key);
    return vals && vals.length > 0 ? Math.max(...vals) : null;
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 14px 100px' : '24px 24px 80px', gap: isMobile ? '14px' : undefined }}>

      {/* ── OVERALL PROGRESS HERO ── */}
      <GlassCard delay={0} style={{ padding: isMobile ? '10px 14px' : '16px 20px', position: 'relative' as const, overflow: 'hidden' as const }}>
        {/* Glow behind the ring */}
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
              {/* Circular progress ring */}
              <div style={{ position: 'relative', width: isMobile ? '80px' : '100px', height: isMobile ? '80px' : '100px', margin: '0 auto' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background ring */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  {/* Progress ring */}
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
                {/* Center number */}
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

              {/* Breakdown labels */}
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
        {/* Weight */}
        <GlassCard delay={0.2} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
          <Scale size={isMobile ? 14 : 16} color="var(--accent-primary)" style={{ marginBottom: isMobile ? 2 : 4 }} />
          <div style={styles.statLabel}>{t.progress.weight}</div>
          <div style={styles.statValue}>
            {currentWeight !== null ? <><AnimatedNumber value={currentWeight} duration={1200} /><span style={styles.statUnit}>kg</span></> : '—'}
          </div>
          {startWeight !== null && currentWeight !== null && weights.length > 1 && (
            <div style={{ ...styles.statChange, color: currentWeight <= startWeight ? 'var(--accent-primary)' : 'var(--accent-warm)' }}>
              {currentWeight <= startWeight ? '' : '+'}{(currentWeight - startWeight).toFixed(1)} kg
            </div>
          )}
        </GlassCard>

        {/* Body Fat */}
        <GlassCard delay={0.25} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
          <Droplets size={isMobile ? 14 : 16} color="var(--accent-secondary)" style={{ marginBottom: isMobile ? 2 : 4 }} />
          <div style={styles.statLabel}>{t.progress.bodyFat}</div>
          <div style={styles.statValue}>
            {metrics.bodyFat.length > 0 ? <><AnimatedNumber value={metrics.bodyFat[metrics.bodyFat.length - 1]} duration={1200} /><span style={styles.statUnit}>%</span></> : '—'}
          </div>
          {metrics.bodyFat.length > 1 && (
            <div style={{ ...styles.statChange, color: metrics.bodyFat[metrics.bodyFat.length - 1] <= metrics.bodyFat[0] ? 'var(--accent-primary)' : 'var(--accent-warm)' }}>
              {metrics.bodyFat[metrics.bodyFat.length - 1] <= metrics.bodyFat[0] ? '' : '+'}{(metrics.bodyFat[metrics.bodyFat.length - 1] - metrics.bodyFat[0]).toFixed(1)}%
            </div>
          )}
        </GlassCard>

        {/* Height */}
        {client.height && (
          <GlassCard delay={0.3} style={{ ...styles.statCard, padding: isMobile ? '12px 6px' : undefined }}>
            <TrendingUp size={isMobile ? 14 : 16} color="var(--accent-warm)" style={{ marginBottom: isMobile ? 2 : 4 }} />
            <div style={styles.statLabel}>{t.progress.height || 'Height'}</div>
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
          waist: t.progress.waist ?? 'Waist',
          hips: t.progress.hips ?? 'Hips',
          chest: t.progress.chest ?? 'Chest',
          bicep: t.progress.bicep ?? 'Bicep',
          thigh: t.progress.thigh ?? 'Thigh',
        };
        const hasMeasurements = measurementKeys.some(k => metrics[k] && metrics[k].length > 0);

        return hasMeasurements ? (
          <GlassCard delay={0.32} style={{ marginTop: '14px', ...(isMobile ? { padding: '14px' } : {}) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '12px' : '16px' }}>
              <Ruler size={isMobile ? 14 : 16} color="var(--accent-primary)" />
              <span style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t.progress.measurements ?? 'Measurements'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto auto auto' : '1fr auto auto auto', gap: 0 }}>
              {/* Header row */}
              <div style={{ padding: isMobile ? '6px 0' : '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>&nbsp;</span>
              </div>
              {[t.progress.start ?? 'Start', t.progress.current ?? 'Current', t.progress.change ?? 'Change'].map(header => (
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
                      <span style={{ fontSize: isMobile ? '12px' : '13px', color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </div>,
                ];
              })}
            </div>
          </GlassCard>
        ) : null;
      })()}

      {/* ── 3. GOALS ── */}
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
              const color = g.progress >= 100 ? 'var(--accent-success)' : g.progress > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)';
              return (
                <div key={i} style={{ ...styles.goalItem, gap: isMobile ? '4px' : undefined }}>
                  <div style={styles.goalTop}>
                    <div style={{ ...styles.goalName, fontSize: isMobile ? '13px' : undefined }}>{(() => {
                      const goalNames: Record<string, Record<string, string>> = {
                        pl: { goalLoseWeight: 'Schudnąć', goalBuildMuscle: 'Budowa Mięśni', goalHealth: 'Zdrowie', goalStrength: 'Siła', goalEndurance: 'Wytrzymałość' },
                        en: { goalLoseWeight: 'Lose Weight', goalBuildMuscle: 'Build Muscle', goalHealth: 'Health', goalStrength: 'Strength', goalEndurance: 'Endurance' },
                      };
                      return goalNames[lang]?.[g.goal] || g.goal;
                    })()}</div>
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

      {/* ── 4. PROGRESS PHOTOS - Before / Current ── */}
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
        {photoError && (
          <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>
            {photoError}
          </div>
        )}

        {/* Show photos if any exist */}
        {(firstPhotos || latestPhotos) ? (
          <div style={styles.photoCompare}>
            {/* Week 1 / Starting photo */}
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
                        {ciDate ? monthNames[ciDate.getMonth()] : ''}{ciWeight != null ? ` · ${ciWeight}kg` : ''}
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            {/* Latest / Current photo */}
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
                          {ciDate ? monthNames[ciDate.getMonth()] : ''}{ciWeight != null ? ` · ${ciWeight}kg` : ''}
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

        {/* Add photo button */}
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
        {lang === 'pl' ? 'Udostępnij swoje postępy' : 'Share My Progress'}
      </button>

      {/* Share Card Modal */}
      {showShareCard && (
        <ShareProgressCard
          clientName={client.name}
          coachName={coachName || 'Coach'}
          weeksIn={weeksIn}
          weightChange={weightChange}
          currentWeight={currentWeight}
          benchPR={getBestLift('bench')}
          squatPR={getBestLift('squat')}
          deadliftPR={getBestLift('deadlift')}
          workoutsCompleted={totalWorkoutsCompleted}
          completionRate={completionRate}
          streak={0}
          onClose={() => setShowShareCard(false)}
        />
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

  // ── Shared stat card styles (strength + body composition) ──
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

  // ── Time period cycle button ──
  timeCycleBtn: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(0,229,200,0.25)',
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.3px',
    minWidth: '36px',
    textAlign: 'center',
  },

  // ── Body Composition ──
  bodyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  bodyTabs: {
    display: 'flex',
    gap: '4px',
  },
  bodyTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  bodyTabActive: {
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    borderColor: 'rgba(0,229,200,0.25)',
  },
  bodyTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  bodyTrendRange: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    marginLeft: '2px',
  },
  chartWrap: {
    width: '100%',
    minHeight: '180px',
  },
  skeleton: {
    width: '100%',
    height: '180px',
    borderRadius: '8px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite ease-in-out',
  },
  emptyChart: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '180px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },

  // ── Goals ──
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

  // ── Progress Photos ──
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
  photoPlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.02)',
    border: '2px dashed rgba(255,255,255,0.08)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  photoUploadText: {
    fontSize: '12px',
    color: 'var(--accent-primary)',
    fontWeight: 600,
    opacity: 0.7,
    letterSpacing: '0.2px',
  },
  photoMeta: {
    fontSize: '11px',
    fontWeight: 500,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-tertiary)',
  },

  // ── Lightbox ──
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
