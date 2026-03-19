import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Scale, Droplets, Camera, X, Upload } from 'lucide-react';
import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis, Tooltip } from 'recharts';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client, WorkoutLog, CheckIn } from '../types';

type TimePeriod = '1m' | '3m' | '6m' | 'all';

/** Delay before rendering charts to allow container to settle */
const CHART_RENDER_DELAY = 300;

interface ProgressPageProps {
  client: Client;
  // workoutLogs is used for future workout-based progress metrics (e.g. volume over time)
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
}

export default function ProgressPage({ client, workoutLogs: _workoutLogs, checkIns }: ProgressPageProps) {
  void _workoutLogs; // scaffolded for future workout-based progress metrics
  const isMobile = useIsMobile();
  const { t, lang } = useLang();
  const [chartsReady, setChartsReady] = useState(false);
  const [localCheckIns, setLocalCheckIns] = useState(checkIns);
  useEffect(() => { setLocalCheckIns(checkIns); }, [checkIns]);
  const [bodyTab, setBodyTab] = useState<'weight' | 'bodyFat'>('weight');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [photoPose, setPhotoPose] = useState<'front' | 'side' | 'back'>('front');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'week1' | 'latest'>('week1');

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), CHART_RENDER_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const { metrics } = client;
  const weights = metrics.weight;
  const startWeight = weights.length > 0 ? weights[0] : null;
  const currentWeight = weights.length > 0 ? weights[weights.length - 1] : null;


  const monthNames = lang === 'pl'
    ? ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = new Date(client.startDate).getMonth();
  const months = weights.map((_, i) => monthNames[(startMonth + i) % 12]);
  const allWeightData = weights.map((w, i) => ({ month: months[i] || `M${i}`, value: w }));
  const allBodyFatData = metrics.bodyFat.map((bf, i) => ({ month: months[i] || `M${i}`, value: bf }));

  // Filter data by time period
  const sliceByPeriod = <T,>(data: T[]): T[] => {
    if (timePeriod === 'all') return data;
    const count = timePeriod === '1m' ? 1 : timePeriod === '3m' ? 3 : 6;
    return data.slice(-count);
  };

  const weightData = sliceByPeriod(allWeightData);
  const bodyFatData = sliceByPeriod(allBodyFatData);

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

  // ── Lift PRs ──
  const allLifts = [
    { name: 'Bench Press', values: metrics.benchPress, unit: 'kg' },
    { name: 'Squat', values: metrics.squat, unit: 'kg' },
    { name: 'Deadlift', values: metrics.deadlift, unit: 'kg' },
  ];

  // ── Goal progress - handle empty data gracefully ──
  const parseTarget = (text: string): number | null => {
    const match = text.match(/(\d+(?:\.\d+)?)\s*kg/i) || text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

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

  return (
    <div style={{ ...styles.page, padding: isMobile ? '20px 16px 100px' : '24px 24px 80px' }}>

      {/* ── 1. STRENGTH ── */}
      <div style={styles.strengthSection}>
        <div style={styles.strengthLabel}>{t.progress.strength}</div>
        <div style={{ ...styles.liftRow, gridTemplateColumns: `repeat(${allLifts.length}, 1fr)` }}>
          {allLifts.map((lift, i) => {
            const current = lift.values.length > 0 ? lift.values[lift.values.length - 1] : null;
            const startVal = lift.values.length > 0 ? lift.values[0] : null;
            const totalGain = current !== null && startVal !== null ? current - startVal : 0;
            return (
              <GlassCard key={lift.name} delay={0.05 + i * 0.05} style={styles.liftCard}>
                <div style={styles.liftName}>{lift.name}</div>
                <div style={styles.liftValue}>
                  {current !== null ? current : '-'}<span style={styles.liftUnit}>{lift.unit}</span>
                </div>
                {totalGain > 0 && (
                  <div style={styles.liftGain}>
                    <TrendingUp size={11} />
                    +{totalGain}{lift.unit}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ── 2. BODY COMPOSITION ── */}
      <GlassCard delay={0.2}>
        <div style={styles.bodyHeader}>
          <div style={styles.bodyTabs}>
            <button
              onClick={() => setBodyTab('weight')}
              style={{
                ...styles.bodyTab,
                ...(bodyTab === 'weight' ? styles.bodyTabActive : {}),
              }}
            >
              <Scale size={13} />
              {t.progress.weight}
            </button>
            <button
              onClick={() => setBodyTab('bodyFat')}
              style={{
                ...styles.bodyTab,
                ...(bodyTab === 'bodyFat' ? styles.bodyTabActive : {}),
              }}
            >
              <Droplets size={13} />
              {t.progress.bodyFat}
            </button>
          </div>
          <button
            onClick={() => setTimePeriod(p => p === '1m' ? '3m' : p === '3m' ? '6m' : p === '6m' ? 'all' : '1m')}
            style={styles.timeCycleBtn}
          >
            {timePeriod === '1m' ? '1M' : timePeriod === '3m' ? '3M' : timePeriod === '6m' ? '6M' : 'All'}
          </button>
        </div>

        {/* Chart */}
        <div style={styles.chartWrap}>
          {!chartsReady ? (
            <div style={styles.skeleton} />
          ) : bodyTab === 'weight' && weightData.length >= 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weightData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                  formatter={(val) => [`${val} kg`, t.progress.weight]}
                />
                <Area type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ fill: 'var(--accent-primary)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--accent-primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : bodyTab === 'bodyFat' && bodyFatData.length >= 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={bodyFatData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                  formatter={(val) => [`${val}%`, t.progress.bodyFat]}
                />
                <Area type="monotone" dataKey="value" stroke="var(--accent-secondary)" strokeWidth={2.5} fill="url(#bfGrad)" dot={{ fill: 'var(--accent-secondary)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--accent-secondary)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.emptyChart}>
              <span style={styles.emptyText}>{t.progress.notEnoughData}</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── 3. GOALS ── */}
      {goalProgress.length > 0 && (
        <GlassCard delay={0.3}>
          <div style={styles.goalsHeader}>
            <Target size={16} color="var(--accent-primary)" />
            <span style={styles.goalsTitle}>{t.progress.goals}</span>
            <span style={styles.goalsCount}>
              {goalProgress.filter(g => g.progress >= 100).length}/{goalProgress.length}
            </span>
          </div>
          <div style={styles.goalsList}>
            {goalProgress.map((g, i) => {
              const color = g.progress >= 100 ? 'var(--accent-success)' : g.progress > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)';
              return (
                <div key={i} style={styles.goalItem}>
                  <div style={styles.goalTop}>
                    <div style={styles.goalName}>{g.goal}</div>
                    <div style={{ ...styles.goalPct, color }}>{g.progress}%</div>
                  </div>
                  <div style={styles.goalBarBg}>
                    <div style={{ ...styles.goalBarFill, width: `${Math.max(g.progress, 2)}%`, background: color }} />
                  </div>
                  <div style={styles.goalLabel}>{g.label}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── 4. PROGRESS PHOTOS - Before / Current ── */}
      <GlassCard delay={0.35}>
        <div style={styles.photosHeader}>
          <Camera size={16} color="var(--accent-primary)" />
          <span style={styles.photosTitle}>{t.progress.progressPhotos}</span>
          <div style={styles.poseTabs}>
            {poses.map(p => (
              <button
                key={p.key}
                onClick={() => setPhotoPose(p.key)}
                style={{
                  ...styles.poseTab,
                  ...(photoPose === p.key ? styles.poseTabActive : {}),
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
              return (
                <>
                  <div style={styles.photoFrame} onClick={() => handlePhotoUpload('week1')}>
                    <div style={styles.photoPlaceholder}>
                      <Upload size={20} color="var(--accent-primary)" style={{ opacity: 0.6 }} />
                      <span style={styles.photoUploadText}>{uploading ? t.progress.uploading : t.progress.uploadPhoto}</span>
                    </div>
                  </div>
                  <div style={styles.photoMeta}>
                    {startWeight ? `${monthNames[startMonth]} · ${startWeight}kg` : ''}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Latest / Current photo */}
          <div style={styles.photoSide}>
            <div style={styles.photoDateLabel}>{t.progress.latest}</div>
            {(() => {
              const userSrc = getPhotoForPose(latestPhotos ?? undefined, photoPose);
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
              return (
                <>
                  <div style={styles.photoFrame} onClick={() => handlePhotoUpload('latest')}>
                    <div style={styles.photoPlaceholder}>
                      <Upload size={20} color="var(--accent-primary)" style={{ opacity: 0.6 }} />
                      <span style={styles.photoUploadText}>{uploading ? t.progress.uploading : t.progress.uploadPhoto}</span>
                    </div>
                  </div>
                  <div style={styles.photoMeta} />
                </>
              );
            })()}
          </div>
        </div>
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
    aspectRatio: '3 / 4',
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
