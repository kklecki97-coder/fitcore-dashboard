import { createContext, useContext, useCallback, type ReactNode } from 'react';

interface DemoContextType {
  isDemo: true;
  guardAction: (actionName: string) => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemo(): DemoContextType {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}

export function DemoProvider({ showDemoToast, children }: { showDemoToast: (msg: string) => void; children: ReactNode }) {
  const guardAction = useCallback((actionName: string) => {
    showDemoToast(`${actionName} is disabled in demo mode`);
  }, [showDemoToast]);

  return (
    <DemoContext.Provider value={{ isDemo: true, guardAction }}>
      {children}
    </DemoContext.Provider>
  );
}
