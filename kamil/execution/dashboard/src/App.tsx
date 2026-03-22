import { useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './components/OverviewPage';
import ClientsPage from './components/ClientsPage';
import ClientDetailPage from './components/ClientDetailPage';
import MessagesPage from './components/MessagesPage';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import WorkoutProgramsPage from './components/WorkoutProgramsPage';
import ProgramBuilderPage from './components/ProgramBuilderPage';
import ProgramCreateChooser from './components/ProgramCreateChooser';
import AIProgramCreator from './components/AIProgramCreator';
import ProgramImporter from './components/ProgramImporter';
import PaymentsPage from './components/PaymentsPage';
import CheckInsPage from './components/CheckInsPage';
import LoginPage from './components/LoginPage';
import OnboardingWalkthrough from './components/OnboardingWalkthrough';
import { useToast } from './components/Toast';
import CommandPalette from './components/CommandPalette';
import Confetti from './components/Confetti';
import {
  ClientsPageSkeleton, MessagesPageSkeleton, AnalyticsPageSkeleton,
  ProgramsPageSkeleton, PaymentsPageSkeleton, CheckInsPageSkeleton,
  StatCardSkeleton,
} from './components/Skeleton';
import useIsMobile from './hooks/useIsMobile';
import { useLang } from './i18n';
import { exerciseLibrary } from './data';
import { supabase } from './lib/supabase';
import { DataProvider, useData } from './contexts/DataProvider';
import type { Page, Theme, WorkoutProgram } from './types';

// ── Inner app (has access to DataProvider context) ──

function AppInner() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const isMobile = useIsMobile();
  const data = useData();

  const [currentPage, _setCurrentPage] = useState<Page>(() => {
    try {
      const saved = sessionStorage.getItem('fitcore-page');
      const contextPages: Page[] = ['client-detail', 'program-builder', 'ai-program-creator', 'program-import'];
      if (saved && !contextPages.includes(saved as Page)) return saved as Page;
    } catch { /* ignore */ }
    return 'overview';
  });
  const setCurrentPage = (page: Page) => {
    _setCurrentPage(page);
    try { sessionStorage.setItem('fitcore-page', page); } catch { /* ignore */ }
  };
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [pendingProgram, setPendingProgram] = useState<WorkoutProgram | null>(null);
  const [previousPage, setPreviousPage] = useState<Page>('clients');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // ── Theme ──
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-theme', theme);
  }, [theme]);

  // ── Ctrl+K / Cmd+K to open Command Palette ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Navigation ──
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const getPageLabel = (page: Page): string => {
    const info = t.header.pages[page];
    return info ? info.title : page;
  };

  const handleViewClient = (id: string) => {
    setPreviousPage(currentPage);
    setSelectedClientId(id);
    setCurrentPage('client-detail');
  };

  const handleBackFromClient = () => {
    setCurrentPage(previousPage);
    setSelectedClientId('');
  };

  const handleViewProgram = (id: string) => {
    setPreviousPage(currentPage);
    setSelectedProgramId(id);
    setCurrentPage('program-builder');
  };

  const handleBackFromProgram = () => {
    setCurrentPage(previousPage);
    setSelectedProgramId('');
    setPendingProgram(null);
  };

  const handleLogout = async () => {
    try { sessionStorage.removeItem('fitcore-page'); } catch { /* ignore */ }
    await supabase.auth.signOut();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <ErrorBoundary><OverviewPage clients={data.clients} messages={data.messages} programs={data.programs} invoices={data.invoices} workoutLogs={data.workoutLogs} checkIns={data.checkIns} workoutSetLogs={data.setLogs} onViewClient={handleViewClient} onNavigate={handleNavigate} onSendMessage={data.sendMessage} onUpdateCheckIn={data.updateCheckIn} profileName={data.profileName} /></ErrorBoundary>;
      case 'clients':
        return (
          <ErrorBoundary>
            <ClientsPage
              clients={data.clients}
              programs={data.programs}
              plans={data.plans}
              workoutLogs={data.workoutLogs}
              checkIns={data.checkIns}
              messages={data.messages}
              onViewClient={handleViewClient}
              onNavigate={handleNavigate}
              onUpdateClient={data.updateClient}
              onDeleteClient={data.deleteClient}
            />
          </ErrorBoundary>
        );
      case 'client-detail':
        return (
          <ErrorBoundary>
            <ClientDetailPage
              clientId={selectedClientId}
              clients={data.clients}
              programs={data.programs}
              plans={data.plans}
              workoutLogs={data.workoutLogs}
              setLogs={data.setLogs}
              checkIns={data.checkIns}
              messages={data.messages}
              onBack={handleBackFromClient}
              backLabel={t.clientDetail.backTo(getPageLabel(previousPage))}
              onUpdateClient={data.updateClient}
              onSendMessage={data.sendMessage}
              onUpdateProgram={data.updateProgram}
              onUpdateCheckIn={data.updateCheckIn}
              onAddCheckIn={data.addCheckIn}
            />
          </ErrorBoundary>
        );
      case 'messages':
        return <ErrorBoundary><MessagesPage isMobile={isMobile} clients={data.clients} messages={data.messages} onSendMessage={data.sendMessage} /></ErrorBoundary>;
      case 'analytics':
        return <ErrorBoundary><AnalyticsPage clients={data.clients} invoices={data.invoices} workoutLogs={data.workoutLogs} checkIns={data.checkIns} onViewClient={handleViewClient} /></ErrorBoundary>;
      case 'programs':
        return (
          <ErrorBoundary>
            <WorkoutProgramsPage
              programs={data.programs}
              onViewProgram={handleViewProgram}
              onAddProgram={() => { setSelectedProgramId(''); setCurrentPage('program-create-chooser'); }}
              onDeleteProgram={data.deleteProgram}
              onDuplicateProgram={data.duplicateProgram}
              onUpdateProgram={data.updateProgram}
            />
          </ErrorBoundary>
        );
      case 'program-create-chooser':
        return (
          <ErrorBoundary>
            <ProgramCreateChooser
              onChooseManual={() => { setSelectedProgramId(''); setCurrentPage('program-builder'); }}
              onChooseAI={() => setCurrentPage('ai-program-creator')}
              onChooseImport={() => setCurrentPage('program-import')}
              onBack={() => setCurrentPage('programs')}
            />
          </ErrorBoundary>
        );
      case 'ai-program-creator':
        return (
          <ErrorBoundary>
            <AIProgramCreator
              clients={data.clients}
              onGenerated={(program: WorkoutProgram) => {
                setPendingProgram(program);
                setSelectedProgramId('');
                setCurrentPage('program-builder');
              }}
              onBack={() => setCurrentPage('program-create-chooser')}
            />
          </ErrorBoundary>
        );
      case 'program-import':
        return (
          <ErrorBoundary>
            <ProgramImporter
              onImported={(program: WorkoutProgram) => {
                setPendingProgram(program);
                setSelectedProgramId('');
                setCurrentPage('program-builder');
              }}
              onBack={() => setCurrentPage('program-create-chooser')}
            />
          </ErrorBoundary>
        );
      case 'program-builder':
        return (
          <ErrorBoundary>
            <ProgramBuilderPage
              program={selectedProgramId ? data.programs.find(p => p.id === selectedProgramId) || null : pendingProgram}
              exerciseLibrary={exerciseLibrary}
              onSave={(program: WorkoutProgram) => {
                if (data.programs.find(p => p.id === program.id)) {
                  data.updateProgram(program.id, program);
                } else {
                  data.addProgram(program);
                }
                setPendingProgram(null);
                setCurrentPage('programs');
              }}
              onBack={() => {
                if (selectedProgramId) {
                  handleBackFromProgram();
                } else {
                  setCurrentPage('program-create-chooser');
                  setPendingProgram(null);
                }
              }}
              backLabel={lang === 'pl' ? 'Powrót' : 'Back'}
            />
          </ErrorBoundary>
        );
      case 'payments':
        return (
          <ErrorBoundary>
            <PaymentsPage
              clients={data.clients}
              invoices={data.invoices}
              plans={data.plans}
              onUpdateInvoice={data.updateInvoice}
              onAddInvoice={data.addInvoice}
              onDeleteInvoice={data.deleteInvoice}
              onViewClient={handleViewClient}
            />
          </ErrorBoundary>
        );
      case 'check-ins':
        return (
          <ErrorBoundary>
            <CheckInsPage
              clients={data.clients}
              checkIns={data.checkIns}
              onUpdateCheckIn={data.updateCheckIn}
              onViewClient={handleViewClient}
              onSendMessage={data.sendMessage}
              onNavigate={handleNavigate}
              onConfetti={() => showToast(t.notifications.checkInReviewed, 'success')}
            />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary>
            <SettingsPage
              theme={theme}
              onThemeChange={setTheme}
              profileName={data.profileName}
              profileEmail={data.profileEmail}
              onProfileChange={async (name, email) => {
                data.setProfileName(name);
                data.setProfileEmail(email);
                await supabase.auth.updateUser({ data: { name } });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase.from('coaches').update({ name }).eq('id', user.id);
                }
              }}
              profilePhoto={data.profilePhoto}
              onPhotoChange={async (file: File) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const path = `avatars/${user.id}`;
                const { error: uploadErr } = await supabase.storage.from('coach-avatars').upload(path, file, { upsert: true });
                if (uploadErr) { console.error('Photo upload failed:', uploadErr); showToast('Photo upload failed. Please try again.', 'error'); return; }
                const { data: urlData } = supabase.storage.from('coach-avatars').getPublicUrl(path);
                const url = urlData.publicUrl + '?t=' + Date.now();
                await supabase.from('coaches').update({ avatar_url: url }).eq('id', user.id);
                data.setProfilePhoto(url);
              }}
              notifications={data.notifications}
              onNotificationsChange={data.setNotifications}
              plans={data.plans}
              onAddPlan={data.addPlan}
              onUpdatePlan={data.updatePlan}
              onDeletePlan={data.deletePlan}
            />
          </ErrorBoundary>
        );
      default:
        return <ErrorBoundary><OverviewPage clients={data.clients} messages={data.messages} programs={data.programs} invoices={data.invoices} workoutLogs={data.workoutLogs} checkIns={data.checkIns} workoutSetLogs={data.setLogs} onViewClient={handleViewClient} onNavigate={handleNavigate} onSendMessage={data.sendMessage} onUpdateCheckIn={data.updateCheckIn} profileName={data.profileName} /></ErrorBoundary>;
    }
  };

  const renderSkeleton = () => {
    switch (currentPage) {
      case 'clients': case 'client-detail': return <ClientsPageSkeleton isMobile={isMobile} />;
      case 'messages': return <MessagesPageSkeleton isMobile={isMobile} />;
      case 'analytics': return <AnalyticsPageSkeleton isMobile={isMobile} />;
      case 'programs': case 'program-builder': return <ProgramsPageSkeleton isMobile={isMobile} />;
      case 'payments': return <PaymentsPageSkeleton isMobile={isMobile} />;
      case 'check-ins': return <CheckInsPageSkeleton isMobile={isMobile} />;
      default:
        return (
          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
              {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
            </div>
            <StatCardSkeleton />
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
    <div style={styles.app}>
      {isMobile && sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

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
          onLogout={handleLogout}
        />
      </div>

      <div style={styles.main}>
        <Header
          currentPage={currentPage}
          isMobile={isMobile}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          notifications={data.appNotifications}
          onMarkRead={(id) => data.setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
          onMarkAllRead={() => data.setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
          onNotificationClick={(notif) => {
            data.setAppNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            if (notif.targetPage) handleNavigate(notif.targetPage);
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={data.dataLoading ? 'skeleton' : currentPage + selectedClientId + selectedProgramId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={styles.content}
          >
            {data.dataLoading ? renderSkeleton() : renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>

      {data.showOnboarding && (
        <OnboardingWalkthrough
          isMobile={isMobile}
          onSetSidebarOpen={setSidebarOpen}
          onComplete={() => {
            data.setShowOnboarding(false);
            setSidebarOpen(false);
            localStorage.setItem('fitcore-onboarding-done', 'true');
            data.triggerConfetti();
          }}
          onSkip={() => {
            data.setShowOnboarding(false);
            setSidebarOpen(false);
            localStorage.setItem('fitcore-onboarding-done', 'true');
          }}
        />
      )}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onViewClient={handleViewClient}
        clients={data.clients}
      />
      <Confetti key={data.confettiKey} active={data.confettiKey > 0} />
    </div>
    </ErrorBoundary>
  );
}

// ── Root App: Auth + DataProvider wrapper ──

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  // @ts-ignore - scaffolded for MFA verification UI (blocks login via checkAal, UI prompt coming)
  const [needsMfa, setNeedsMfa] = useState(false);

  const checkAal = async (hasSession: boolean) => {
    if (!hasSession) { setIsLoggedIn(false); setNeedsMfa(false); return; }
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
      setIsLoggedIn(false);
      setNeedsMfa(true);
    } else {
      setIsLoggedIn(hasSession);
      setNeedsMfa(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAal(!!session).then(() => setAuthLoading(false));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAal(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (_remember: boolean) => {
    checkAal(true);
  };

  if (authLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DataProvider isLoggedIn={isLoggedIn}>
      <AppInner />
    </DataProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    height: '100vh',
    width: '100%',
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
