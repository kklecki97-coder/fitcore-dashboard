import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={styles.container}>
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: <CheckCircle size={18} color="#20dba4" />,
    error: <AlertTriangle size={18} color="#e8637a" />,
    info: <Info size={18} color="#3b82f6" />,
  };

  const borderColors = {
    success: 'rgba(32,219,164,0.3)',
    error: 'rgba(232,99,122,0.3)',
    info: 'rgba(59,130,246,0.3)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        ...styles.toast,
        borderLeft: `3px solid ${borderColors[toast.type]}`,
      }}
    >
      <div style={styles.iconWrap}>{icons[toast.type]}</div>
      <span style={styles.message}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} style={styles.closeBtn}>
        <X size={14} />
      </button>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 20000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '380px',
    width: '100%',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#0c1017',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 12px rgba(0,229,200,0.04)',
    pointerEvents: 'auto',
    cursor: 'default',
  },
  iconWrap: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.4,
  },
  closeBtn: {
    flexShrink: 0,
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};
