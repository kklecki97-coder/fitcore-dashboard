import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getScoreColor } from '../utils/engagement-score';

interface ScoreRingProps {
  score: number;
  trend?: 'up' | 'stable' | 'down';
  size?: number;
  strokeWidth?: number;
  showTrend?: boolean;
  showLabel?: boolean;
  label?: string;
}

export default function ScoreRing({
  score, trend = 'stable', size = 48, strokeWidth = 3,
  showTrend = true, showLabel = false, label,
}: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#20dba4' : trend === 'down' ? '#e8637a' : 'var(--text-tertiary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Score ring */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </svg>
        {/* Score number */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{
            fontSize: size * 0.3,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color,
            lineHeight: 1,
          }}>
            {score}
          </span>
        </div>
      </div>

      {/* Trend arrow */}
      {showTrend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <TrendIcon size={12} color={trendColor} />
        </div>
      )}

      {/* Label */}
      {showLabel && label && (
        <span style={{
          fontSize: '10px', fontWeight: 600,
          color, textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
