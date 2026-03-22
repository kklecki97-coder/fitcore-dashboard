import { motion } from 'framer-motion';
import {
  Calendar, ClipboardCheck, ChevronDown,
  Smile, Frown, Meh, SmilePlus, Angry,
  Moon,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getLocale } from '../lib/locale';
import { useLang } from '../i18n';
import type { Client, CheckIn } from '../types';

interface ClientDetailCheckInsProps {
  client: Client;
  checkIns: CheckIn[];
  isMobile: boolean;
  expandedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  onViewCheckIn: (ci: CheckIn) => void;
}

export default function ClientDetailCheckIns({
  client,
  checkIns,
  isMobile,
  expandedSections,
  toggleSection,
  onViewCheckIn,
}: ClientDetailCheckInsProps) {
  const { lang, t } = useLang();
  const dateLocale = getLocale(lang);

  const clientCheckIns = checkIns
    .filter(ci => ci.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const nextScheduled = clientCheckIns.find(ci => ci.status === 'scheduled');
  const completed = clientCheckIns.filter(ci => ci.status === 'completed');
  const missed = clientCheckIns.filter(ci => ci.status === 'missed');
  const avgMood = completed.length > 0
    ? (completed.reduce((s, ci) => s + (ci.mood || 0), 0) / completed.filter(ci => ci.mood).length).toFixed(1)
    : '-';
  const avgSteps = completed.length > 0
    ? Math.round(completed.reduce((s, ci) => s + (ci.steps || 0), 0) / completed.filter(ci => ci.steps).length)
    : 0;

  const moodIcons: Record<number, { icon: typeof Smile; color: string }> = {
    1: { icon: Angry, color: 'var(--accent-danger)' },
    2: { icon: Frown, color: 'var(--accent-warm)' },
    3: { icon: Meh, color: 'var(--text-secondary)' },
    4: { icon: Smile, color: 'var(--accent-success)' },
    5: { icon: SmilePlus, color: 'var(--accent-primary)' },
  };

  return (
    <GlassCard delay={0.3} style={isMobile ? { padding: '0' } : undefined}>
      <div
        onClick={isMobile ? () => toggleSection('checkIns') : undefined}
        style={{ ...styles.trainingSectionHeader, ...(isMobile ? { flexDirection: 'row' as const, gap: '8px', padding: '14px 16px', cursor: 'pointer', marginBottom: 0 } : {}) }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ ...styles.chartTitle, ...(isMobile ? { fontSize: '14px' } : {}) }}>
            <ClipboardCheck size={isMobile ? 14 : 16} color="var(--accent-primary)" style={{ marginRight: '6px' }} />
            {t.clientDetail.checkInHistory}
            {isMobile && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>{completed.length} / {missed.length}</span>}
          </h3>
          {!isMobile && nextScheduled && (
            <p style={styles.trainingSubtitle}>
              {t.clientDetail.nextLabel} {new Date(nextScheduled.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        {isMobile ? (
          <ChevronDown size={14} color="var(--text-tertiary)" style={{ transform: expandedSections.checkIns ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        ) : (
          <div style={styles.trainingStats}>
            <div style={styles.trainingStat}>
              <span style={styles.trainingStatValue}>{completed.length}</span>
              <span style={styles.trainingStatLabel}>{t.clientDetail.doneStat}</span>
            </div>
            <div style={styles.trainingStat}>
              <span style={styles.trainingStatValue}>{missed.length}</span>
              <span style={styles.trainingStatLabel}>{t.clientDetail.missedStat}</span>
            </div>
            <div style={styles.trainingStat}>
              <span style={styles.trainingStatValue}>{avgMood}</span>
              <span style={styles.trainingStatLabel}>{t.clientDetail.avgMood}</span>
            </div>
            <div style={styles.trainingStat}>
              <span style={{ ...styles.trainingStatValue, color: avgSteps >= 8000 ? 'var(--accent-success)' : avgSteps >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                {avgSteps.toLocaleString()}
              </span>
              <span style={styles.trainingStatLabel}>{t.clientDetail.avgSteps}</span>
            </div>
          </div>
        )}
      </div>

      {(!isMobile || expandedSections.checkIns) && <div style={{ ...styles.checkInList, padding: isMobile ? '0 16px 14px' : undefined }}>
        {clientCheckIns.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '18px' }}>
            {t.clientDetail.noCheckIns}
          </div>
        )}
        {clientCheckIns.map((ci, idx) => {
          const MoodIcon = ci.mood ? moodIcons[ci.mood]?.icon || Meh : null;
          const moodColor = ci.mood ? moodIcons[ci.mood]?.color || 'var(--text-secondary)' : '';
          const statusColor = ci.status === 'completed' ? 'var(--accent-success)' : ci.status === 'scheduled' ? 'var(--accent-primary)' : 'var(--accent-danger)';

          return (
            <motion.div
              key={ci.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => {
                if (ci.status === 'completed') {
                  onViewCheckIn(ci);
                }
              }}
              style={{
                padding: isMobile ? '10px' : '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderLeft: `3px solid ${statusColor}`,
                cursor: ci.status === 'completed' ? 'pointer' : 'default',
                transition: 'background 0.1s',
                marginBottom: isMobile ? '6px' : '8px',
              }}
            >
              {/* Top: date + mood icon + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ci.status === 'completed' ? (isMobile ? '6px' : '8px') : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={isMobile ? 10 : 12} color={statusColor} />
                  <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {new Date(ci.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                  </span>
                  {MoodIcon && <MoodIcon size={isMobile ? 13 : 15} color={moodColor} />}
                </div>
                <span style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>
                  {t.clientDetail.checkInStatusMap[ci.status] || ci.status}
                </span>
              </div>

              {/* Bottom: metrics grid */}
              {ci.status === 'completed' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(80px, 1fr))', gap: isMobile ? '4px' : '6px' }}>
                  {ci.weight != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.clientDetail.weight}</span>
                      <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ci.weight} kg</span>
                    </div>
                  )}
                  {ci.bodyFat != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.clientDetail.bodyFat}</span>
                      <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{ci.bodyFat}%</span>
                    </div>
                  )}
                  {ci.sleepHours != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.clientDetail.sleepLabel}</span>
                      <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}><Moon size={isMobile ? 10 : 11} style={{ opacity: 0.5 }} /> {ci.sleepHours}h</span>
                    </div>
                  )}
                  {ci.steps != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.clientDetail.stepsLabel}</span>
                      <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: ci.steps >= 8000 ? 'var(--accent-success)' : ci.steps >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>{ci.steps.toLocaleString()}</span>
                    </div>
                  )}
                  {ci.energy != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.clientDetail.energyLabel}</span>
                      <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: ci.energy >= 7 ? 'var(--accent-success)' : ci.energy >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>{ci.energy}/10</span>
                    </div>
                  )}
                  {ci.stress != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: isMobile ? '9px' : '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t.clientDetail.stressLabel}</span>
                      <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: ci.stress >= 7 ? 'var(--accent-danger)' : ci.stress >= 5 ? 'var(--accent-warm)' : 'var(--accent-success)' }}>{ci.stress}/10</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>}
    </GlassCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  chartTitle: {
    fontSize: '21px',
    fontWeight: 600,
  },
  trainingSectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  trainingSubtitle: {
    fontSize: '17px',
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
  trainingStats: {
    display: 'flex',
    gap: '16px',
  },
  trainingStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  trainingStatValue: {
    fontSize: '25px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
  },
  trainingStatLabel: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  checkInList: {
    display: 'flex',
    flexDirection: 'column',
  },
};
