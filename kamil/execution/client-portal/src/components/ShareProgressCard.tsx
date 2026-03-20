import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, TrendingUp, Dumbbell, Flame, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useLang } from '../i18n';

interface ShareProgressCardProps {
  clientName: string;
  coachName: string;
  weeksIn: number;
  weightChange: number | null; // negative = lost weight
  currentWeight: number | null;
  benchPR: number | null;
  squatPR: number | null;
  deadliftPR: number | null;
  workoutsCompleted: number;
  completionRate: number;
  streak: number;
  onClose: () => void;
}

export default function ShareProgressCard({
  clientName, coachName, weeksIn, weightChange, currentWeight,
  benchPR, squatPR, deadliftPR,
  workoutsCompleted, completionRate, streak, onClose,
}: ShareProgressCardProps) {
  const { lang } = useLang();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `fitcore-progress-${clientName.toLowerCase().replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'fitcore-progress.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My FitCore Progress',
          });
        } else {
          // Fallback to download
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  };

  const t = {
    title: lang === 'pl' ? 'Moje Postępy' : 'My Progress',
    weeks: lang === 'pl' ? 'tygodni' : 'weeks',
    weightLost: lang === 'pl' ? 'kg stracone' : 'kg lost',
    weightGained: lang === 'pl' ? 'kg zyskane' : 'kg gained',
    currentWeight: lang === 'pl' ? 'Aktualna waga' : 'Current weight',
    workouts: lang === 'pl' ? 'treningów' : 'workouts',
    completion: lang === 'pl' ? 'ukończenia' : 'completion',
    streak: lang === 'pl' ? 'dni z rzędu' : 'day streak',
    poweredBy: lang === 'pl' ? 'Trenowany z' : 'Coached with',
    download: lang === 'pl' ? 'Pobierz' : 'Download',
    share: lang === 'pl' ? 'Udostępnij' : 'Share',
    coach: lang === 'pl' ? 'Trener' : 'Coach',
    bench: lang === 'pl' ? 'Wyciskanie' : 'Bench',
    squat: lang === 'pl' ? 'Przysiad' : 'Squat',
    deadlift: lang === 'pl' ? 'Martwy ciąg' : 'Deadlift',
    prs: lang === 'pl' ? 'Rekordy' : 'PRs',
  };

  const hasWeightData = weightChange !== null && weightChange !== 0;
  const hasLifts = benchPR || squatPR || deadliftPR;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.overlay}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={styles.wrapper}
        >
          {/* The card itself — this gets captured as image */}
          <div ref={cardRef} style={styles.card}>
            {/* Background gradient overlay */}
            <div style={styles.bgGradient} />

            {/* Header */}
            <div style={styles.header}>
              <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span style={styles.brandName}>FitCore</span>
            </div>

            {/* Title */}
            <div style={styles.titleSection}>
              <div style={styles.clientName}>{clientName}</div>
              <div style={styles.subtitle}>{t.title}</div>
            </div>

            {/* Duration badge */}
            <div style={styles.durationBadge}>
              <Calendar size={14} />
              <span>{weeksIn} {t.weeks}</span>
            </div>

            {/* Stats grid */}
            <div style={styles.statsGrid}>
              {hasWeightData && (
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: (weightChange ?? 0) < 0 ? '#20dba4' : '#3b82f6' }}>
                    {(weightChange ?? 0) < 0 ? '' : '+'}{weightChange}kg
                  </div>
                  <div style={styles.statLabel}>
                    {(weightChange ?? 0) < 0 ? t.weightLost : t.weightGained}
                  </div>
                </div>
              )}
              {currentWeight && (
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{currentWeight}kg</div>
                  <div style={styles.statLabel}>{t.currentWeight}</div>
                </div>
              )}
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: '#00e5c8' }}>
                  <Dumbbell size={16} style={{ marginRight: '4px' }} />
                  {workoutsCompleted}
                </div>
                <div style={styles.statLabel}>{t.workouts}</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: completionRate >= 80 ? '#20dba4' : '#f59e0b' }}>
                  {completionRate}%
                </div>
                <div style={styles.statLabel}>{t.completion}</div>
              </div>
              {streak > 0 && (
                <div style={styles.statCard}>
                  <div style={{ ...styles.statValue, color: '#f59e0b' }}>
                    <Flame size={16} style={{ marginRight: '4px' }} />
                    {streak}
                  </div>
                  <div style={styles.statLabel}>{t.streak}</div>
                </div>
              )}
            </div>

            {/* Lift PRs */}
            {hasLifts && (
              <div style={styles.liftsSection}>
                <div style={styles.liftsTitle}>
                  <TrendingUp size={14} color="#00e5c8" />
                  <span>{t.prs}</span>
                </div>
                <div style={styles.liftsRow}>
                  {benchPR && (
                    <div style={styles.liftChip}>
                      <span style={styles.liftName}>{t.bench}</span>
                      <span style={styles.liftValue}>{benchPR}kg</span>
                    </div>
                  )}
                  {squatPR && (
                    <div style={styles.liftChip}>
                      <span style={styles.liftName}>{t.squat}</span>
                      <span style={styles.liftValue}>{squatPR}kg</span>
                    </div>
                  )}
                  {deadliftPR && (
                    <div style={styles.liftChip}>
                      <span style={styles.liftName}>{t.deadlift}</span>
                      <span style={styles.liftValue}>{deadliftPR}kg</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={styles.footer}>
              <div style={styles.coachLabel}>{t.coach}: {coachName}</div>
              <div style={styles.poweredBy}>{t.poweredBy} <strong>FitCore</strong></div>
            </div>
          </div>

          {/* Action buttons — outside the card capture area */}
          <div style={styles.actions}>
            <button onClick={handleShare} style={styles.shareBtn} disabled={downloading}>
              <Share2 size={16} />
              {t.share}
            </button>
            <button onClick={handleDownload} style={styles.downloadBtn} disabled={downloading}>
              <Download size={16} />
              {downloading ? '...' : t.download}
            </button>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 15000,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  wrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    maxHeight: '95vh', overflow: 'auto',
  },
  card: {
    position: 'relative',
    width: '340px',
    background: 'linear-gradient(160deg, #0c1017 0%, #0a1628 40%, #0c1017 100%)',
    borderRadius: '20px',
    padding: '28px 24px',
    display: 'flex', flexDirection: 'column', gap: '20px',
    border: '1px solid rgba(0,229,200,0.15)',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'absolute', top: '-40%', right: '-30%',
    width: '300px', height: '300px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,229,200,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '8px',
    position: 'relative', zIndex: 1,
  },
  brandName: {
    fontSize: '16px', fontWeight: 700, color: '#00e5c8',
    fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.3px',
  },
  titleSection: {
    position: 'relative', zIndex: 1,
  },
  clientName: {
    fontSize: '28px', fontWeight: 800, color: '#fff',
    fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.5px', lineHeight: 1.1,
  },
  subtitle: {
    fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)',
    marginTop: '4px', fontFamily: 'Outfit, sans-serif',
  },
  durationBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', borderRadius: '20px',
    background: 'rgba(0,229,200,0.1)', border: '1px solid rgba(0,229,200,0.2)',
    color: '#00e5c8', fontSize: '13px', fontWeight: 600,
    fontFamily: 'JetBrains Mono, monospace',
    alignSelf: 'flex-start', position: 'relative', zIndex: 1,
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px',
    position: 'relative', zIndex: 1,
  },
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '14px 12px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  statValue: {
    fontSize: '22px', fontWeight: 800, color: '#fff',
    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px',
    display: 'flex', alignItems: 'center',
  },
  statLabel: {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    fontFamily: 'Outfit, sans-serif',
  },
  liftsSection: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  liftsTitle: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: '1px',
    fontFamily: 'Outfit, sans-serif',
  },
  liftsRow: {
    display: 'flex', gap: '8px',
  },
  liftChip: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '2px', padding: '10px 8px', borderRadius: '10px',
    background: 'rgba(0,229,200,0.06)', border: '1px solid rgba(0,229,200,0.12)',
  },
  liftName: {
    fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    fontFamily: 'Outfit, sans-serif',
  },
  liftValue: {
    fontSize: '18px', fontWeight: 800, color: '#00e5c8',
    fontFamily: 'JetBrains Mono, monospace',
  },
  footer: {
    position: 'relative', zIndex: 1,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  coachLabel: {
    fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Outfit, sans-serif',
  },
  poweredBy: {
    fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.25)',
    fontFamily: 'Outfit, sans-serif',
  },
  actions: {
    display: 'flex', gap: '8px', alignItems: 'center',
  },
  shareBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 20px', borderRadius: '10px',
    background: '#00e5c8', border: 'none',
    color: '#07090e', fontSize: '14px', fontWeight: 700,
    fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
    boxShadow: '0 0 16px rgba(0,229,200,0.3)',
  },
  downloadBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 20px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: '14px', fontWeight: 600,
    fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
  },
  closeBtn: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
};
