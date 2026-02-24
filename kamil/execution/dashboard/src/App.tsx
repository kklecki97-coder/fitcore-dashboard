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
import PaymentsPage from './components/PaymentsPage';
import CheckInsPage from './components/CheckInsPage';
import LoginPage from './components/LoginPage';
import useIsMobile from './hooks/useIsMobile';
import { clients as initialClients, messages as initialMessages, scheduleToday, workoutPrograms as initialPrograms, exerciseLibrary, workoutLogs, invoices as initialInvoices, checkIns as initialCheckIns } from './data';
import type { Page, Theme, Client, Message, WorkoutProgram, Invoice, CheckIn, AppNotification } from './types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('fitcore-auth') === 'true'
      || sessionStorage.getItem('fitcore-auth') === 'true';
  });

  const handleLogin = (remember: boolean) => {
    if (remember) {
      localStorage.setItem('fitcore-auth', 'true');
    } else {
      sessionStorage.setItem('fitcore-auth', 'true');
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('fitcore-auth');
    sessionStorage.removeItem('fitcore-auth');
    setIsLoggedIn(false);
  };

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
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(initialInvoices);
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>(initialCheckIns);

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

  // App notifications (bell icon)
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(() => {
    const now = Date.now();
    return [
      { id: 'n1', type: 'message', title: 'New message from Marcus Johnson', description: 'Hey coach, I hit a new PR on bench today! 225lbs!', timestamp: new Date(now - 5 * 60000).toISOString(), isRead: false, clientId: 'c1', targetPage: 'messages' as const },
      { id: 'n2', type: 'checkin', title: 'Sarah Chen submitted a check-in', description: 'Weekly check-in completed — all metrics updated', timestamp: new Date(now - 35 * 60000).toISOString(), isRead: false, clientId: 'c2', targetPage: 'check-ins' as const },
      { id: 'n3', type: 'payment', title: 'Payment received — $150', description: 'David Park paid invoice #INV-2024-012', timestamp: new Date(now - 2 * 3600000).toISOString(), isRead: false, clientId: 'c3', targetPage: 'payments' as const },
      { id: 'n4', type: 'program', title: "Alex Rivera's program starts tomorrow", description: 'Hypertrophy Phase 2 — 4 days/week begins Monday', timestamp: new Date(now - 4 * 3600000).toISOString(), isRead: false, clientId: 'c4', targetPage: 'programs' as const },
      { id: 'n5', type: 'message', title: 'New message from Emma Wilson', description: "Can we reschedule Thursday's session?", timestamp: new Date(now - 8 * 3600000).toISOString(), isRead: true, clientId: 'c5', targetPage: 'messages' as const },
      { id: 'n6', type: 'checkin', title: 'Lisa Thompson missed check-in', description: 'Weekly check-in was due yesterday — no submission', timestamp: new Date(now - 24 * 3600000).toISOString(), isRead: true, clientId: 'c6', targetPage: 'check-ins' as const },
      { id: 'n7', type: 'payment', title: 'Payment overdue — $200', description: 'Mike Chen invoice #INV-2024-009 is 5 days overdue', timestamp: new Date(now - 48 * 3600000).toISOString(), isRead: true, clientId: 'c7', targetPage: 'payments' as const },
      { id: 'n8', type: 'client', title: 'Welcome to FitCore!', description: 'Your dashboard is set up and ready to go', timestamp: new Date(now - 72 * 3600000).toISOString(), isRead: true, targetPage: 'overview' as const },
    ];
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

  // ── Invoice handlers ──
  const handleUpdateInvoice = (id: string, updates: Partial<Invoice>) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
  };

  const handleAddInvoice = (invoice: Invoice) => {
    setAllInvoices(prev => [...prev, invoice]);
  };

  // ── Check-in handlers ──
  const handleUpdateCheckIn = (id: string, updates: Partial<CheckIn>) => {
    setAllCheckIns(prev => prev.map(ci => ci.id === id ? { ...ci, ...updates } : ci));
  };

  const handleAddCheckIn = (checkIn: CheckIn) => {
    setAllCheckIns(prev => [...prev, checkIn]);
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
            workoutLogs={workoutLogs}
            checkIns={allCheckIns}
            onBack={handleBackFromClient}
            onUpdateClient={handleUpdateClient}
            onSendMessage={handleSendMessage}
            onUpdateProgram={handleUpdateProgram}
            onUpdateCheckIn={handleUpdateCheckIn}
            onAddCheckIn={handleAddCheckIn}
          />
        );
      case 'messages':
        return <MessagesPage isMobile={isMobile} clients={allClients} messages={allMessages} onSendMessage={handleSendMessage} />;
      case 'analytics':
        return <AnalyticsPage clients={allClients} invoices={allInvoices} workoutLogs={workoutLogs} checkIns={allCheckIns} onViewClient={handleViewClient} />;
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
      case 'payments':
        return (
          <PaymentsPage
            clients={allClients}
            invoices={allInvoices}
            onUpdateInvoice={handleUpdateInvoice}
            onAddInvoice={handleAddInvoice}
            onViewClient={handleViewClient}
          />
        );
      case 'check-ins':
        return (
          <CheckInsPage
            clients={allClients}
            checkIns={allCheckIns}
            onUpdateCheckIn={handleUpdateCheckIn}
            onViewClient={handleViewClient}
            onNavigate={handleNavigate}
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

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
          onLogout={handleLogout}
        />
      </div>

      <div style={styles.main}>
        <Header
          currentPage={currentPage}
          isMobile={isMobile}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          notifications={appNotifications}
          onMarkRead={(id) => setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
          onMarkAllRead={() => setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
          onNotificationClick={(notif) => {
            setAppNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            if (notif.targetPage) handleNavigate(notif.targetPage);
          }}
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
