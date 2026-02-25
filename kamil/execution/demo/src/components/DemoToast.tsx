import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

interface DemoToastProps {
  message: string | null;
}

export default function DemoToast({ message }: DemoToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="demo-toast"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          style={styles.toast}
        >
          <Lock size={14} style={{ flexShrink: 0 }} />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 20px',
    borderRadius: 12,
    background: 'rgba(14, 18, 27, 0.95)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    backdropFilter: 'blur(20px)',
    color: '#f59e0b',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    whiteSpace: 'nowrap',
  },
};
