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
import { messages } from './data';
import useIsMobile from './hooks/useIsMobile';
import type { Page, Theme } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
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

  const unreadCount = messages.filter(m => !m.isRead && !m.isFromCoach).length;

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

  const handleSaveNewClient = (client: import('./types').Client) => {
    // In a real app this would POST to an API.
    // For now, just navigate back to clients list.
    console.log('New client created:', client);
    setCurrentPage('clients');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onViewClient={handleViewClient} onNavigate={handleNavigate} />;
      case 'clients':
        return <ClientsPage onViewClient={handleViewClient} onAddClient={handleAddClient} />;
      case 'add-client':
        return <AddClientPage onBack={() => setCurrentPage('clients')} onSave={handleSaveNewClient} />;
      case 'client-detail':
        return <ClientDetailPage clientId={selectedClientId} onBack={handleBackFromClient} />;
      case 'messages':
        return <MessagesPage isMobile={isMobile} />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'settings':
        return <SettingsPage theme={theme} onThemeChange={setTheme} />;
      default:
        return <OverviewPage onViewClient={handleViewClient} onNavigate={handleNavigate} />;
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
          unreadCount={unreadCount}
        />
      </div>

      <div style={styles.main}>
        <Header
          currentPage={currentPage}
          unreadCount={unreadCount}
          isMobile={isMobile}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + selectedClientId}
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
