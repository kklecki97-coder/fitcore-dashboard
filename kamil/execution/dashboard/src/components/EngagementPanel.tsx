import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Phone, Settings2, Sparkles, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react';
import GlassCard from './GlassCard';
import EngagementRing from './EngagementRing';
import useIsMobile from '../hooks/useIsMobile';
import { getEngagementColor } from '../utils/engagement';
import type { EngagementScore } from '../utils/engagement';

interface EngagementPanelProps {
  score: EngagementScore;
  insight: string;
  suggestedAction: { label: string; type: 'motivation' | 'call' | 'adjust' };
  onAction?: (type: 'motivation' | 'call' | 'adjust') => void;
  t: {
    title: string;
    subtitle: string;
    workoutCompletion: string;
    checkInRate: string;
    messageResponsiveness: string;
    streakLength: string;
    trend8Weeks: string;
    aiInsight: string;
    suggestedAction: string;
    last14Days: string;
    actionLocked?: string;
  };
}

export default function EngagementPanel({ score, insight, suggestedAction, onAction, t }: EngagementPanelProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [showLockedTooltip, setShowLockedTooltip] = useState(false);
  const isMobile = useIsMobile();
  const isActionLocked = score.total > 60;

  const breakdownItems = [
    { key: 'workoutCompletion', label: t.workoutCompletion, value: score.breakdown.workoutCompletion, weight: '45%' },
    { key: 'checkInRate', label: t.checkInRate, value: score.breakdown.checkInRate, weight: '25%' },
    { key: 'streakLength', label: t.streakLength, value: score.breakdown.streakLength, weight: '20%' },
    { key: 'messageResponsiveness', label: t.messageResponsiveness, value: score.breakdown.messageResponsiveness, weight: '10%' },
  ];

  const trendIcon = score.trend === 'up'
    ? <TrendingUp size={14} color="#22c55e" />
    : score.trend === 'down'
      ? <TrendingDown size={14} color="#ef4444" />
      : <Minus size={14} color="var(--text-tertiary)" />;

  const actionIcon = suggestedAction.type === 'motivation'
    ? <MessageSquare size={14} />
    : suggestedAction.type === 'call'
      ? <Phone size={14} />
      : <Settings2 size={14} />;

  return (
    <GlassCard delay={0.18}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{t.title}</h3>
          <p style={styles.subtitle}>{t.subtitle}</p>
        </div>
        {trendIcon}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '16px' : '20px' }}>
        {/* Ring */}
        <EngagementRing score={score.total} trend={score.trend} size={isMobile ? 80 : 100} strokeWidth={isMobile ? 5 : 6} delay={0.2} />

        {/* Breakdown */}
        <div style={{ ...styles.breakdownList, maxWidth: '400px' }}>
          {breakdownItems.map((item) => (
            <div
              key={item.key}
              style={styles.breakdownItem}
              onMouseEnter={() => setHoveredBar(item.key)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div style={styles.breakdownHeader}>
                <span style={{ ...styles.breakdownLabel, fontSize: isMobile ? '11px' : '12px' }}>{item.label}</span>
                <span style={{ ...styles.breakdownValue, color: getEngagementColor(item.value), fontSize: isMobile ? '12px' : '13px' }}>
                  {item.value}
                  <span style={styles.breakdownWeight}>{item.weight}</span>
                </span>
              </div>
              <div style={styles.breakdownBar}>
                <motion.div
                  style={{
                    ...styles.breakdownFill,
                    background: getEngagementColor(item.value),
                    opacity: hoveredBar === item.key ? 1 : 0.7,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        <div style={{ ...styles.insightBox, width: '100%', maxWidth: '400px' }}>
          <Sparkles size={isMobile ? 12 : 14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={styles.insightLabel}>{t.aiInsight}</div>
            <div style={{ ...styles.insightText, fontSize: isMobile ? '12px' : '13px' }}>{insight}</div>
          </div>
        </div>

        {/* Suggested Action — locked above 75 */}
        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <button
            style={{
              ...styles.actionBtn,
              ...(isActionLocked ? {
                background: 'var(--bg-subtle-hover)',
                color: 'var(--text-tertiary)',
                cursor: 'default',
              } : {}),
              fontSize: isMobile ? '12px' : '13px',
              padding: isMobile ? '8px 14px' : '10px 18px',
            }}
            onClick={() => {
              if (isActionLocked) {
                setShowLockedTooltip(true);
                setTimeout(() => setShowLockedTooltip(false), 2500);
              } else {
                onAction?.(suggestedAction.type);
              }
            }}
          >
            {isActionLocked ? <Lock size={isMobile ? 12 : 14} /> : actionIcon}
            {suggestedAction.label}
          </button>
          <AnimatePresence>
            {showLockedTooltip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  overflow: 'hidden',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                }}
              >
                {t.actionLocked || 'Available when engagement drops below 75%'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    margin: '2px 0 0',
  },
  breakdownList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  breakdownItem: {
    cursor: 'default',
  },
  breakdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  breakdownLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
  },
  breakdownValue: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  breakdownWeight: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    fontWeight: 400,
  },
  breakdownBar: {
    height: '4px',
    borderRadius: '2px',
    background: 'var(--glass-border)',
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'opacity 0.15s',
  },
  insightBox: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(0, 229, 200, 0.04)',
    border: '1px solid rgba(0, 229, 200, 0.1)',
  },
  insightLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '3px',
    fontFamily: 'var(--font-display)',
  },
  insightText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
    color: '#000',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    width: '100%',
  },
};
