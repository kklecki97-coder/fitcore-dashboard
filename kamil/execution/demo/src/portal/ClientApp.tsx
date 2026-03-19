import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import ProgramPage from './components/ProgramPage';
import CheckInPage from './components/CheckInPage';
import MessagesPage from './components/MessagesPage';
import CalendarPage from './components/CalendarPage';
import ProgressPage from './components/ProgressPage';
import SettingsPage from './components/SettingsPage';
import InvoicesPage from './components/InvoicesPage';
import useIsMobile from './hooks/useIsMobile';
import { mockClient, mockCoachName, mockProgram, mockWorkoutLogs, mockCheckIns, mockMessages, mockSetLogs, mockWeeklySchedule } from './mockData';
import type { ClientPage, Theme, Client, Message, CheckIn, WorkoutSetLog, WorkoutLog, WeeklySchedule } from './types';

export default function ClientApp() {
  const isMobile = useIsMobile();

  const [currentPage, setCurrentPage] = useState<ClientPage>('home');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-client-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // All state from mock data
  const [clientUser, setClientUser] = useState<Client>(mockClient);
  const [coachName] = useState(mockCoachName);
  const [myProgram] = useState(mockProgram);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(mockWorkoutLogs);
  const [setLogs, setSetLogs] = useState<WorkoutSetLog[]>(mockSetLogs);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(mockCheckIns);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(mockWeeklySchedule);
  const [invoices] = useState([
    { id: 'inv-1', clientId: mockClient.id, amount: 122, status: 'paid' as const, dueDate: '2026-02-01', paidDate: '2026-02-01', period: 'Feb 2026', plan: 'Premium' as const, paymentUrl: null },
    { id: 'inv-2', clientId: mockClient.id, amount: 122, status: 'paid' as const, dueDate: '2026-03-01', paidDate: '2026-03-02', period: 'Mar 2026', plan: 'Premium' as const, paymentUrl: null },
    { id: 'inv-3', clientId: mockClient.id, amount: 122, status: 'pending' as const, dueDate: '2026-04-01', paidDate: null, period: 'Apr 2026', plan: 'Premium' as const, paymentUrl: null },
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-client-theme', theme);
  }, [theme]);

  // Mark messages as read when opening messages
  useEffect(() => {
    if (currentPage === 'messages') {
      setMessages(prev => prev.map(m => m.isFromCoach && !m.isRead ? { ...m, isRead: true } : m));
    }
  }, [currentPage]);

  // ── Handlers (all local, no backend) ──
  const handleSendMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSubmitCheckIn = (ci: CheckIn) => {
    setCheckIns(prev => [...prev, ci]);
    if (ci.weight != null || ci.bodyFat != null) {
      setClientUser(prev => {
        const newWeight = ci.weight != null ? [...prev.metrics.weight, ci.weight] : prev.metrics.weight;
        const newBodyFat = ci.bodyFat != null ? [...prev.metrics.bodyFat, ci.bodyFat] : prev.metrics.bodyFat;
        return { ...prev, metrics: { ...prev.metrics, weight: newWeight, bodyFat: newBodyFat } };
      });
    }
  };

  const handleLogWorkout = (type: string, date: string) => {
    const newLog: WorkoutLog = {
      id: crypto.randomUUID(),
      clientId: clientUser.id,
      clientName: clientUser.name,
      type,
      duration: 0,
      date,
      completed: true,
    };
    setWorkoutLogs(prev => [...prev, newLog]);
  };

  const handleRemoveWorkout = (type: string, date: string) => {
    const toRemove = workoutLogs.find(l => l.type === type && l.date === date && l.completed);
    if (toRemove) setWorkoutLogs(prev => prev.filter(l => l.id !== toRemove.id));
  };

  const handleLogSet = (log: WorkoutSetLog) => {
    setSetLogs(prev => [...prev, log]);
  };

  const handleRemoveLog = (exerciseId: string, setNumber: number, date: string) => {
    setSetLogs(prev => prev.filter(l => !(l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date)));
  };

  const handleUpdateLog = (exerciseId: string, setNumber: number, date: string, updates: Partial<WorkoutSetLog>) => {
    setSetLogs(prev => prev.map(l => {
      if (l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date) {
        return { ...l, ...updates };
      }
      return l;
    }));
  };

  const handleUpdateSchedule = (assignments: Record<string, string>) => {
    setWeeklySchedule(ws => ({
      id: ws?.id ?? 'demo-schedule',
      clientId: clientUser.id,
      weekStart: new Date().toISOString().split('T')[0],
      dayAssignments: assignments,
    }));
  };

  const handleLogout = () => {
    // Demo: do nothing
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            client={clientUser}
            program={myProgram}
            workoutLogs={workoutLogs}
            checkIns={checkIns}
            messages={messages}
            coachName={coachName}
            onNavigate={setCurrentPage}
            weeklySchedule={weeklySchedule}
            onUpdateSchedule={handleUpdateSchedule}
          />
        );
      case 'program':
        return (
          <ProgramPage
            program={myProgram}
            setLogs={setLogs}
            onLogSet={handleLogSet}
            onLogWorkout={handleLogWorkout}
            onRemoveWorkout={handleRemoveWorkout}
            onRemoveLog={handleRemoveLog}
            onUpdateLog={handleUpdateLog}
            workoutLogs={workoutLogs}
            weeklySchedule={weeklySchedule}
          />
        );
      case 'check-in':
        return (
          <CheckInPage
            checkIns={checkIns}
            onSubmitCheckIn={handleSubmitCheckIn}
            clientId={clientUser.id}
            clientName={clientUser.name}
          />
        );
      case 'messages':
        return (
          <MessagesPage
            messages={messages}
            onSendMessage={handleSendMessage}
            coachName={coachName}
            clientId={clientUser.id}
            clientName={clientUser.name}
          />
        );
      case 'calendar':
        return (
          <CalendarPage
            program={myProgram}
            workoutLogs={workoutLogs}
            weeklySchedule={weeklySchedule}
            onUpdateSchedule={handleUpdateSchedule}
          />
        );
      case 'progress':
        return (
          <ProgressPage
            client={clientUser}
            workoutLogs={workoutLogs}
            checkIns={checkIns}
          />
        );
      case 'invoices':
        return (
          <InvoicesPage invoices={invoices} />
        );
      case 'settings':
        return (
          <SettingsPage
            client={clientUser}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
            onClientUpdate={(updates) => setClientUser(prev => ({ ...prev, ...updates }))}
            onNavigate={setCurrentPage}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div style={styles.app}>
        {/* Desktop side nav */}
        {!isMobile && (
          <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={false} onLogout={handleLogout} unreadCount={messages.filter(m => m.isFromCoach && !m.isRead).length} />
        )}

        <div style={styles.main}>
          <Header clientName={clientUser.name} currentPage={currentPage} onNavigate={setCurrentPage} />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                ...styles.content,
                paddingBottom: isMobile ? 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' : '0px',
              }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={true} onLogout={handleLogout} unreadCount={messages.filter(m => m.isFromCoach && !m.isRead).length} />
        )}
      </div>
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    paddingBottom: '0px',
  },
};
