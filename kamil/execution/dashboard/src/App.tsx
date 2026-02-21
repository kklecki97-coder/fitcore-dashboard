import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './components/OverviewPage';
import ClientsPage from './components/ClientsPage';
import ClientDetailPage from './components/ClientDetailPage';
import MessagesPage from './components/MessagesPage';
import AnalyticsPage from './components/AnalyticsPage';
import SchedulePage from './components/SchedulePage';
import SettingsPage from './components/SettingsPage';
import AddClientPage from './components/AddClientPage';
import WorkoutProgramsPage from './components/WorkoutProgramsPage';
import ProgramBuilderPage from './components/ProgramBuilderPage';
import useIsMobile from './hooks/useIsMobile';
import { clients as initialClients, messages as initialMessages, scheduleToday, workoutPrograms as initialPrograms, exerciseLibrary } from './data';
import type { Page, Theme, Client, Message, WorkoutProgram } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // ── Shared state lifted from child pages ──
  const [allClients, setAllClients] = useState<Client[]>(initialClients);
  const [allMessages, setAllMessages] = useState<Message[]>(initialMessages);
  const [allPrograms, setAllPrograms] = useState<WorkoutProgram[]>(initialPrograms);

  const todayKey = new Date().toISOString().split('T')[0];
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, typeof scheduleToday>>({
    [todayKey]: scheduleToday,
  });

  // Settings state
  const [profileName, setProfileName] = useState('Coach Kamil');
  const [profileEmail, setProfileEmail] = useState('kamil@fitcore.io');
  const [notifications, setNotifications] = useState({
    messages: true,
    checkins: true,
    payments: true,
    weekly: false,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-theme', theme);
  }, [theme]);

  // Close sidebar on navigation (mobile)
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const handleViewClient = (id: string) => {
    setSelectedClientId(id);
    setCurrentPage('client-detail');
  };

  const handleBackFromClient = () => {
    setCurrentPage('clients');
    setSelectedClientId('');
  };

  const handleAddClient = () => {
    setCurrentPage('add-client');
  };

  const handleSaveNewClient = (client: Client) => {
    setAllClients(prev => [...prev, client]);
    setCurrentPage('clients');
  };

  const handleUpdateClient = (id: string, updates: Partial<Client>) => {
    setAllClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteClient = (id: string) => {
    setAllClients(prev => prev.filter(c => c.id !== id));
  };

  const handleSendMessage = (msg: Message) => {
    setAllMessages(prev => [...prev, msg]);
  };

  // ── Program handlers ──
  const handleAddProgram = (program: WorkoutProgram) => {
    setAllPrograms(prev => [...prev, program]);
  };

  const handleUpdateProgram = (id: string, updates: Partial<WorkoutProgram>) => {
    setAllPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteProgram = (id: string) => {
    setAllPrograms(prev => prev.filter(p => p.id !== id));
  };

  const handleDuplicateProgram = (id: string) => {
    const source = allPrograms.find(p => p.id === id);
    if (!source) return;
    const now = new Date().toISOString().split('T')[0];
    const newProgram: WorkoutProgram = {
      ...source,
      id: `wp${Date.now()}`,
      name: `${source.name} (Copy)`,
      status: 'draft',
      clientIds: [],
      createdAt: now,
      updatedAt: now,
      days: source.days.map(d => ({
        ...d,
        id: `wd${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exercises: d.exercises.map(e => ({
          ...e,
          id: `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      })),
    };
    setAllPrograms(prev => [...prev, newProgram]);
  };

  const handleViewProgram = (id: string) => {
    setSelectedProgramId(id);
    setCurrentPage('program-builder');
  };

  const handleBackFromProgram = () => {
    setCurrentPage('programs');
    setSelectedProgramId('');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage clients={allClients} messages={allMessages} programs={allPrograms} onViewClient={handleViewClient} onNavigate={handleNavigate} />;
      case 'clients':
        return (
          <ClientsPage
            clients={allClients}
            programs={allPrograms}
            onViewClient={handleViewClient}
            onAddClient={handleAddClient}
            onNavigate={handleNavigate}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        );
      case 'add-client':
        return <AddClientPage onBack={() => setCurrentPage('clients')} onSave={handleSaveNewClient} />;
      case 'client-detail':
        return (
          <ClientDetailPage
            clientId={selectedClientId}
            clients={allClients}
            programs={allPrograms}
            onBack={handleBackFromClient}
            onUpdateClient={handleUpdateClient}
            onSendMessage={handleSendMessage}
            onUpdateProgram={handleUpdateProgram}
          />
        );
      case 'messages':
        return <MessagesPage isMobile={isMobile} clients={allClients} messages={allMessages} onSendMessage={handleSendMessage} />;
      case 'analytics':
        return <AnalyticsPage clients={allClients} />;
      case 'programs':
        return (
          <WorkoutProgramsPage
            programs={allPrograms}
            clients={allClients}
            onViewProgram={handleViewProgram}
            onAddProgram={() => { setSelectedProgramId(''); setCurrentPage('program-builder'); }}
            onDeleteProgram={handleDeleteProgram}
            onDuplicateProgram={handleDuplicateProgram}
            onUpdateProgram={handleUpdateProgram}
          />
        );
      case 'program-builder':
        return (
          <ProgramBuilderPage
            program={selectedProgramId ? allPrograms.find(p => p.id === selectedProgramId) || null : null}
            clients={allClients}
            exerciseLibrary={exerciseLibrary}
            onSave={(program: WorkoutProgram) => {
              if (allPrograms.find(p => p.id === program.id)) {
                handleUpdateProgram(program.id, program);
              } else {
                handleAddProgram(program);
              }
              setCurrentPage('programs');
              setSelectedProgramId('');
            }}
            onBack={handleBackFromProgram}
          />
        );
      case 'schedule':
        return <SchedulePage clients={allClients} programs={allPrograms} sessionsByDate={sessionsByDate} onSessionsChange={setSessionsByDate} />;
      case 'settings':
        return (
          <SettingsPage
            theme={theme}
            onThemeChange={setTheme}
            profileName={profileName}
            profileEmail={profileEmail}
            onProfileChange={(name, email) => { setProfileName(name); setProfileEmail(email); }}
            notifications={notifications}
            onNotificationsChange={setNotifications}
          />
        );
      default:
        return <OverviewPage clients={allClients} messages={allMessages} programs={allPrograms} onViewClient={handleViewClient} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={styles.app}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — always rendered, slide on mobile */}
      <div style={{
        ...styles.sidebarWrap,
        ...(isMobile ? {
          position: 'fixed',
          left: sidebarOpen ? 0 : '-280px',
          top: 0,
          bottom: 0,
          width: '280px',
          zIndex: 50,
          transition: 'left 0.25s ease',
        } : {}),
      }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          profileName={profileName}
        />
      </div>

      <div style={styles.main}>
        <Header
          currentPage={currentPage}
          isMobile={isMobile}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + selectedClientId + selectedProgramId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={styles.content}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>
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
  sidebarWrap: {},
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
};

export default App;
