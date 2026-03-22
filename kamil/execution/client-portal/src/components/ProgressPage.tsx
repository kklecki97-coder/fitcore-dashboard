import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Scale, Droplets, Camera, X, Share2 } from 'lucide-react';
import ShareProgressCard from './ShareProgressCard';
// Charts will be re-enabled once clients have enough data points
// import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis, Tooltip } from 'recharts';
import GlassCard from './GlassCard';
import AnimatedNumber from './AnimatedNumber';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { matchMainLift, MAIN_LIFT_PATTERNS, parseTarget } from '../utils/lift-matching';
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

  // ── Goal progress - handle empty data gracefully ──

  const goalProgress = client.goals.map(goal => {
    const g = goal.toLowerCase();

    // Weight-related goals
    if ((g.includes('weight') || g.includes('drop') || g.includes('cut') || g.includes('lean')) && !g.includes('bench') && !g.includes('squat') && !g.includes('dead')) {
      if (!startWeight || !currentWeight) return { goal, progress: 0, label: t.progress.inProgress };
      const target = parseTarget(goal);
      if (!target) return { goal, progress: 0, label: `${currentWeight}kg` };
      if (startWeight === target) return { goal, progress: 100, label: `${currentWeight}kg → ${target}kg` };
      const pct = Math.min(100, Math.round(((startWeight - currentWeight) / (startWeight - target)) * 100));
      return { goal, progress: Math.max(0, pct), label: `${currentWeight}kg → ${target}kg` };
    }
    // Lift goals
    if (g.includes('bench') && metrics.benchPress.length > 0) {
      const target = parseTarget(goal) ?? 100;
      const current = metrics.benchPress[metrics.benchPress.length - 1];
      return { goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` };
    }
    if (g.includes('squat') && metrics.squat.length > 0) {
      const target = parseTarget(goal) ?? 140;
      const current = metrics.squat[metrics.squat.length - 1];
      return { goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` };
    }
    if ((g.includes('deadlift') || g.includes('dead lift')) && metrics.deadlift.length > 0) {
      const target = parseTarget(goal) ?? 180;
      const current = metrics.deadlift[metrics.deadlift.length - 1];
      return { goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current}kg / ${target}kg` };
    }
    // Body fat goals
    if ((g.includes('body fat') || g.includes('bodyfat') || g.includes('bf')) && metrics.bodyFat.length > 0) {
      const targetMatch = goal.match(/(\d+(?:\.\d+)?)\s*%/);
      const target = targetMatch ? parseFloat(targetMatch[1]) : 15;
      const startBf = metrics.bodyFat[0];
      const currentBf = metrics.bodyFat[metrics.bodyFat.length - 1];
      if (startBf === target) return { goal, progress: 100, label: `${currentBf}% → ${target}%` };
      const pct = Math.min(100, Math.round(((startBf - currentBf) / (startBf - target)) * 100));
      return { goal, progress: Math.max(0, pct), label: `${currentBf}% → ${target}%` };
    }
    // Step goals
    if (g.includes('step')) {
      const target = parseTarget(goal) ?? 10000;
      const latestCI = checkIns.filter(ci => ci.steps !== null).sort((a, b) => b.date.localeCompare(a.date))[0];
      const current = latestCI?.steps ?? 0;
      return { goal, progress: Math.max(0, Math.min(100, Math.round((current / target) * 100))), label: `${current.toLocaleString()} / ${target.toLocaleString()}` };
    }
    // Generic goals (Lose Weight, Build Muscle, etc.) - show as in progress
    return { goal, progress: 0, label: t.progress.inProgress };
  });

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
  const weightChange = startWeight && currentWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : null;
  const totalWorkoutsCompleted = workoutLogs.filter(w => w.completed).length;
  const completionRate = workoutLogs.length > 0 ? Math.round((totalWorkoutsCompleted / workoutLogs.length) * 100) : 0;
  const getBestLift = (key: string) => {
    const vals = liftMap.get(key);
    return vals && vals.length > 0 ? Math.max(...vals) : null;
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px 14px 100px' : '24px 24px 80px', gap: isMobile ? '14px' : undefined }}>

      {/* Share Progress Button */}
      <button
        onClick={() => setShowShareCard(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%', padding: isMobile ? '10px' : '12px', borderRadius: '10px',
          background: 'rgba(0,229,200,0.06)', border: '1px solid rgba(0,229,200,0.2)',
          color: 'var(--accent-primary)', fontSize: isMobile ? '13px' : '14px', fontWeight: 600,
          fontFamily: 'var(--font-display)', cursor: 'pointer',
          transition: 'all 0.15s', marginBottom: '4px',
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

      {/* ── 1. STRENGTH ── */}
      <div style={{ ...styles.strengthSection, gap: isMobile ? '8px' : undefined }}>
        <div style={{ ...styles.strengthLabel, fontSize: isMobile ? '15px' : undefined }}>{t.progress.strength}</div>
        <div style={{ ...styles.liftRow, gridTemplateColumns: `repeat(${allLifts.length}, 1fr)`, gap: isMobile ? '8px' : undefined }}>
          {allLifts.map((lift, i) => {
            const current = lift.values.length > 0 ? lift.values[lift.values.length - 1] : null;
            const startVal = lift.values.length > 0 ? lift.values[0] : null;
            const totalGain = current !== null && startVal !== null ? current - startVal : 0;
            return (
              <GlassCard key={lift.name} delay={0.05 + i * 0.05} style={{ ...styles.liftCard, padding: isMobile ? '10px 6px' : undefined }}>
                <div style={{ ...styles.liftName, fontSize: isMobile ? '9px' : undefined, marginBottom: isMobile ? '3px' : undefined }}>{lift.name}</div>
                <div style={{ ...styles.liftValue, fontSize: isMobile ? '18px' : undefined }}>
                  {current !== null ? <AnimatedNumber value={current} duration={1200} /> : '-'}<span style={{ ...styles.liftUnit, fontSize: isMobile ? '10px' : undefined }}>{lift.unit}</span>
                </div>
                {totalGain > 0 && (
                  <div style={{ ...styles.liftGain, fontSize: isMobile ? '10px' : undefined, marginTop: isMobile ? '3px' : undefined }}>
                    <TrendingUp size={isMobile ? 9 : 11} />
                    +{totalGain}{lift.unit}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ── 2. BODY COMPOSITION — compact horizontal cards on mobile ── */}
      <div style={{ display: 'grid', gridTemplateColumns: client.height ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: isMobile ? '6px' : '10px' }}>
        {/* Weight */}
        <GlassCard delay={0.2} style={{ padding: isMobile ? '10px' : '20px 16px', textAlign: 'center' as const }}>
          <Scale size={isMobile ? 14 : 20} color="var(--accent-primary)" style={{ marginBottom: isMobile ? 3 : 8 }} />
          <div style={{ fontSize: isMobile ? '9px' : '12px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.3px', marginBottom: isMobile ? 2 : 4 }}>
            {t.progress.weight}
          </div>
          <div style={{ fontSize: isMobile ? '18px' : '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {currentWeight !== null ? <><AnimatedNumber value={currentWeight} duration={1200} /><span style={{ fontSize: isMobile ? '10px' : '14px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 2 }}>kg</span></> : '—'}
          </div>
          {startWeight !== null && currentWeight !== null && weights.length > 1 && (
            <div style={{ fontSize: isMobile ? '10px' : '12px', color: currentWeight <= startWeight ? 'var(--accent-primary)' : 'var(--accent-warm)', fontWeight: 600, marginTop: isMobile ? 2 : 4 }}>
              {currentWeight <= startWeight ? '' : '+'}{(currentWeight - startWeight).toFixed(1)} kg
            </div>
          )}
        </GlassCard>

        {/* Body Fat */}
        <GlassCard delay={0.25} style={{ padding: isMobile ? '10px' : '20px 16px', textAlign: 'center' as const }}>
          <Droplets size={isMobile ? 14 : 20} color="var(--accent-secondary)" style={{ marginBottom: isMobile ? 3 : 8 }} />
          <div style={{ fontSize: isMobile ? '9px' : '12px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.3px', marginBottom: isMobile ? 2 : 4 }}>
            {t.progress.bodyFat}
          </div>
          <div style={{ fontSize: isMobile ? '18px' : '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {metrics.bodyFat.length > 0 ? <><AnimatedNumber value={metrics.bodyFat[metrics.bodyFat.length - 1]} duration={1200} /><span style={{ fontSize: isMobile ? '10px' : '14px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 2 }}>%</span></> : '—'}
          </div>
          {metrics.bodyFat.length > 1 && (
            <div style={{ fontSize: isMobile ? '10px' : '12px', color: metrics.bodyFat[metrics.bodyFat.length - 1] <= metrics.bodyFat[0] ? 'var(--accent-primary)' : 'var(--accent-warm)', fontWeight: 600, marginTop: isMobile ? 2 : 4 }}>
              {metrics.bodyFat[metrics.bodyFat.length - 1] <= metrics.bodyFat[0] ? '' : '+'}{(metrics.bodyFat[metrics.bodyFat.length - 1] - metrics.bodyFat[0]).toFixed(1)}%
            </div>
          )}
        </GlassCard>

        {/* Height */}
        {client.height && (
          <GlassCard delay={0.3} style={{ padding: isMobile ? '10px' : '20px 16px', textAlign: 'center' as const }}>
            <TrendingUp size={isMobile ? 14 : 20} color="var(--accent-warm)" style={{ marginBottom: isMobile ? 3 : 8 }} />
            <div style={{ fontSize: isMobile ? '9px' : '12px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.3px', marginBottom: isMobile ? 2 : 4 }}>
              {t.progress.height || 'Height'}
            </div>
            <div style={{ fontSize: isMobile ? '18px' : '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {client.height}<span style={{ fontSize: isMobile ? '10px' : '14px', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 2 }}>cm</span>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ── 3. GOALS ── */}
      {goalProgress.length > 0 && (
        <GlassCard delay={0.3} style={isMobile ? { padding: '14px' } : undefined}>
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
      <GlassCard delay={0.35} style={isMobile ? { padding: '14px' } : undefined}>
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
    gap: '16px',
    minHeight: '100%',
  },

  // ── Strength ──
  strengthSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  strengthLabel: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  liftRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  liftCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 8px',
    textAlign: 'center',
  },
  liftName: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  liftValue: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  liftUnit: {
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  liftGain: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-success)',
    marginTop: '8px',
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
