import { motion } from 'framer-motion';
import { getEngagementColor, getTrendArrow } from '../utils/engagement';

interface EngagementRingProps {
  score: number;
  trend?: 'up' | 'stable' | 'down';
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  delay?: number;
}

export default function EngagementRing({
  score,
  trend,
  size = 48,
  strokeWidth = 4,
  showLabel = false,
  delay = 0,
}: EngagementRingProps) {
  const color = getEngagementColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : 'var(--text-tertiary)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {/* Score text */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: size >= 80 ? '22px' : size >= 48 ? '14px' : '11px',
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1,
        }}>
          {score}
        </span>
        {trend && size >= 40 && (
          <span style={{
            fontSize: size >= 80 ? '14px' : '10px',
            color: trendColor,
            lineHeight: 1,
            marginTop: 1,
          }}>
            {getTrendArrow(trend)}
          </span>
        )}
      </div>
      {/* Label below */}
      {showLabel && (
        <div style={{
          textAlign: 'center',
          marginTop: 4,
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          ENG
        </div>
      )}
    </div>
  );
}
