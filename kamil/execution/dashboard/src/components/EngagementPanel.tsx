import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MessageSquare, Phone, Settings2, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import GlassCard from './GlassCard';
import EngagementRing from './EngagementRing';
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
    goalProgress: string;
    trend8Weeks: string;
    aiInsight: string;
    suggestedAction: string;
    last14Days: string;
  };
}

export default function EngagementPanel({ score, insight, suggestedAction, onAction, t }: EngagementPanelProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const color = getEngagementColor(score.total);

  const breakdownItems = [
    { key: 'workoutCompletion', label: t.workoutCompletion, value: score.breakdown.workoutCompletion, weight: '35%' },
    { key: 'checkInRate', label: t.checkInRate, value: score.breakdown.checkInRate, weight: '20%' },
    { key: 'messageResponsiveness', label: t.messageResponsiveness, value: score.breakdown.messageResponsiveness, weight: '15%' },
    { key: 'streakLength', label: t.streakLength, value: score.breakdown.streakLength, weight: '15%' },
    { key: 'goalProgress', label: t.goalProgress, value: score.breakdown.goalProgress, weight: '15%' },
  ];

  const chartData = score.history.map((val, i) => ({
    week: `W${i + 1}`,
    score: val,
  }));

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {trendIcon}
        </div>
      </div>

      <div style={styles.content}>
        {/* Left: Big ring + breakdown */}
        <div style={styles.left}>
          <EngagementRing score={score.total} trend={score.trend} size={100} strokeWidth={6} delay={0.2} />

          <div style={styles.breakdownList}>
            {breakdownItems.map((item) => (
              <div
                key={item.key}
                style={styles.breakdownItem}
                onMouseEnter={() => setHoveredBar(item.key)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div style={styles.breakdownHeader}>
                  <span style={styles.breakdownLabel}>{item.label}</span>
                  <span style={{
                    ...styles.breakdownValue,
                    color: getEngagementColor(item.value),
                  }}>
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
        </div>

        {/* Right: Chart + Insight + Action */}
        <div style={styles.right}>
          <div style={styles.chartSection}>
            <div style={styles.chartLabel}>{t.trend8Weeks}</div>
            <div style={{ width: '100%', height: 120 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(value) => [`${value}`, 'Score']}
                  />
                  <ReferenceLine y={50} stroke="var(--glass-border)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color, stroke: color }}
                    activeDot={{ r: 5, fill: color, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insight */}
          <div style={styles.insightBox}>
            <Sparkles size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={styles.insightLabel}>{t.aiInsight}</div>
              <div style={styles.insightText}>{insight}</div>
            </div>
          </div>

          {/* Suggested Action */}
          <button
            style={styles.actionBtn}
            onClick={() => onAction?.(suggestedAction.type)}
          >
            {actionIcon}
            {suggestedAction.label}
          </button>
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
  content: {
    display: 'flex',
    gap: '28px',
    flexWrap: 'wrap' as const,
  },
  left: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '18px',
    minWidth: '200px',
    flex: '0 0 auto',
  },
  right: {
    flex: 1,
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
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
  chartSection: {
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
  },
  chartLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    fontFamily: 'var(--font-display)',
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
