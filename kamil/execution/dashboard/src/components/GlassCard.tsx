import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  delay?: number;
}

export default function GlassCard({ children, style, hover = false, onClick, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { y: -2, borderColor: 'rgba(255,255,255,0.12)' } : undefined}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, background 0.2s',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
