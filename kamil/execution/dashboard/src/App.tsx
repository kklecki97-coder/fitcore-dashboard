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
import { messages } from './data';
import type { Page, Theme } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fitcore-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitcore-theme', theme);
  }, [theme]);

  const unreadCount = messages.filter(m => !m.isRead && !m.isFromCoach).length;

  const handleViewClient = (id: string) => {
    setSelectedClientId(id);
    setCurrentPage('client-detail');
  };

  const handleBackFromClient = () => {
    setCurrentPage('clients');
    setSelectedClientId('');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onViewClient={handleViewClient} onNavigate={setCurrentPage} />;
      case 'clients':
        return <ClientsPage onViewClient={handleViewClient} />;
      case 'client-detail':
        return <ClientDetailPage clientId={selectedClientId} onBack={handleBackFromClient} />;
      case 'messages':
        return <MessagesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'settings':
        return <SettingsPage theme={theme} onThemeChange={setTheme} />;
      default:
        return <OverviewPage onViewClient={handleViewClient} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div style={styles.app}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        unreadCount={unreadCount}
      />
      <div style={styles.main}>
        <Header currentPage={currentPage} unreadCount={unreadCount} />
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
