import { motion } from 'framer-motion';

interface StreakFlameProps {
  streak: number;
  size?: number;
}

/**
 * Animated flame icon that grows with streak length.
 * Only shows for 3+ day streaks. Flame gets larger and more intense.
 */
export default function StreakFlame({ streak, size = 24 }: StreakFlameProps) {
  if (streak < 3) return null;

  // Scale flame size: 3-day = 1x, 7-day = 1.3x, 14+ = 1.6x
  const scale = Math.min(1 + (streak - 3) * 0.05, 1.6);
  // Intensity: more particles, brighter glow at higher streaks
  const intensity = Math.min(streak / 14, 1);
  const flameSize = size * scale;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      style={{
        position: 'relative',
        width: flameSize,
        height: flameSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: `drop-shadow(0 0 ${4 + intensity * 8}px rgba(249,115,22,${0.3 + intensity * 0.4}))`,
      }}
    >
      {/* Base flame */}
      <motion.svg
        width={flameSize}
        height={flameSize}
        viewBox="0 0 24 24"
        fill="none"
        animate={{
          y: [0, -1.5, 0, -1, 0],
          scaleY: [1, 1.04, 1, 1.02, 1],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <path
          d="M12 2C12 2 7 8 7 13C7 16.3137 9.23858 19 12 19C14.7614 19 17 16.3137 17 13C17 8 12 2 12 2Z"
          fill="url(#flameGradient)"
        />
        <path
          d="M12 9C12 9 10 12 10 14.5C10 16.1569 10.8954 17.5 12 17.5C13.1046 17.5 14 16.1569 14 14.5C14 12 12 9 12 9Z"
          fill="url(#flameInner)"
        />
        <defs>
          <linearGradient id="flameGradient" x1="12" y1="2" x2="12" y2="19" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f97316" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="flameInner" x1="12" y1="9" x2="12" y2="17.5" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Spark particles for high streaks */}
      {streak >= 7 && (
        <>
          {[0, 1, 2].slice(0, Math.min(Math.floor((streak - 5) / 3), 3)).map(i => (
            <motion.div
              key={i}
              animate={{
                y: [-2, -12 - i * 4, -2],
                x: [(i - 1) * 3, (i - 1) * 5, (i - 1) * 3],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 1 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                top: 2,
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: '#fbbf24',
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}
