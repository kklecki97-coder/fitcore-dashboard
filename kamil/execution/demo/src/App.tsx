import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DemoProvider } from './context/DemoContext';
import ViewToggle from './components/ViewToggle';
import DemoModeBadge from './components/DemoModeBadge';
import DemoToast from './components/DemoToast';
import DashboardApp from './dashboard/DashboardApp';
import ClientApp from './portal/ClientApp';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function App() {
  const [view, setView] = useState<'coach' | 'client'>('coach');
  const [toast, setToast] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const showDemoToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <DemoProvider showDemoToast={showDemoToast}>
      <div style={styles.root}>
        <ViewToggle view={view} onSwitch={setView} isMobile={isMobile} />

        <div style={styles.viewContainer}>
          <AnimatePresence mode="wait">
            {view === 'coach' ? (
              <motion.div
                key="coach"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={styles.viewInner}
              >
                <DashboardApp />
              </motion.div>
            ) : (
              <motion.div
                key="client"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={styles.viewInner}
              >
                <ClientApp />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DemoModeBadge />
        <DemoToast message={toast} />
      </div>
    </DemoProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  viewContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  viewInner: {
    height: '100%',
    width: '100%',
  },
};

export default App;
