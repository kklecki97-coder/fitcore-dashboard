import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import ProgramPage from './components/ProgramPage';
import CheckInPage from './components/CheckInPage';
import ProgressPage from './components/ProgressPage';
import MessagesPage from './components/MessagesPage';
import useIsMobile from './hooks/useIsMobile';
import { clientUser, coachName, myProgram, myCheckIns, myMessages, myWorkoutLogs, initialSetLogs } from './data';
import type { ClientPage, Theme, Message, CheckIn, WorkoutSetLog } from './types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('fitcore-client-auth') === 'true'
      || sessionStorage.getItem('fitcore-client-auth') === 'true';
  });

  const handleLogin = (remember: boolean) => {
    if (remember) {
      localStorage.setItem('fitcore-client-auth', 'true');
    } else {
      sessionStorage.setItem('fitcore-client-auth', 'true');
    }
    setIsLoggedIn(true);
  };

  const [currentPage, setCurrentPage] = useState<ClientPage>('home');
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-client-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Data state
  const [checkIns, setCheckIns] = useState<CheckIn[]>(myCheckIns);
  const [messages, setMessages] = useState<Message[]>(myMessages);
  const [setLogs, setSetLogs] = useState<WorkoutSetLog[]>(initialSetLogs);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-client-theme', theme);
  }, [theme]);

  const handleSendMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSubmitCheckIn = (ci: CheckIn) => {
    setCheckIns(prev => [...prev, ci]);
  };

  const handleLogSet = (log: WorkoutSetLog) => {
    setSetLogs(prev => [...prev, log]);
  };

  const handleRemoveLog = (exerciseId: string, setNumber: number, date: string) => {
    setSetLogs(prev => prev.filter(l => !(l.exerciseId === exerciseId && l.setNumber === setNumber && l.date === date)));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            client={clientUser}
            program={myProgram}
            workoutLogs={myWorkoutLogs}
            checkIns={checkIns}
            messages={messages}
            coachName={coachName}
            onNavigate={setCurrentPage}
          />
        );
      case 'program':
        return (
          <ProgramPage
            program={myProgram}
            setLogs={setLogs}
            onLogSet={handleLogSet}
            onRemoveLog={handleRemoveLog}
            workoutLogs={myWorkoutLogs}
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
      case 'progress':
        return (
          <ProgressPage
            client={clientUser}
            workoutLogs={myWorkoutLogs}
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
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={styles.app}>
      {/* Desktop side nav */}
      {!isMobile && (
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={false} />
      )}

      <div style={styles.main}>
        <Header clientName={clientUser.name} theme={theme} onThemeChange={setTheme} />

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
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} isMobile={true} />
      )}
    </div>
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

export default App;
