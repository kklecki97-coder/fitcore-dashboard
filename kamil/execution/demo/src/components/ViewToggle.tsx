import { motion } from 'framer-motion';
import { Monitor, User } from 'lucide-react';

interface ViewToggleProps {
  view: 'coach' | 'client';
  onSwitch: (view: 'coach' | 'client') => void;
  isMobile: boolean;
}

export default function ViewToggle({ view, onSwitch, isMobile }: ViewToggleProps) {
  return (
    <div style={styles.bar}>
      <div style={styles.inner}>
        <div style={styles.pillContainer}>
          {/* Sliding background indicator */}
          <motion.div
            layoutId="view-toggle-indicator"
            style={{
              ...styles.indicator,
              left: view === 'coach' ? 3 : '50%',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          <button
            onClick={() => onSwitch('coach')}
            style={{
              ...styles.button,
              color: view === 'coach' ? '#07090e' : 'var(--text-secondary)',
            }}
          >
            <Monitor size={15} />
            {isMobile ? 'Coach' : 'Coach Dashboard'}
          </button>

          <button
            onClick={() => onSwitch('client')}
            style={{
              ...styles.button,
              color: view === 'client' ? '#07090e' : 'var(--text-secondary)',
            }}
          >
            <User size={15} />
            {isMobile ? 'Client' : 'Client Portal'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    height: 'var(--toggle-height)',
    minHeight: 48,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px',
    position: 'relative',
    zIndex: 100,
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  pillContainer: {
    display: 'flex',
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 3,
    border: '1px solid var(--glass-border)',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: 'calc(50% - 3px)',
    background: 'var(--accent-primary)',
    borderRadius: 8,
    zIndex: 0,
  },
  button: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 18px',
    border: 'none',
    background: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 8,
    transition: 'color 0.2s ease',
    whiteSpace: 'nowrap',
  },
};
