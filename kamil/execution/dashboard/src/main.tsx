import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { I18nProvider, useLang } from './i18n'
import './index.css'
import App from './App.tsx'

function LangUrlSync() {
  const { pathname } = useLocation();
  const { lang, switchLang } = useLang();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!hasRedirected.current && !localStorage.getItem('fitcore-lang')) {
      hasRedirected.current = true;
      const browserLang = navigator.language?.toLowerCase() ?? '';
      if (browserLang.startsWith('pl') && !pathname.startsWith('/pl')) {
        const plPath = '/pl' + (pathname === '/' ? '/' : pathname);
        navigate(plPath, { replace: true });
        switchLang('pl');
        return;
      }
    }

    const isPlUrl = pathname.startsWith('/pl');
    if (isPlUrl && lang !== 'pl') switchLang('pl');
    if (!isPlUrl && lang !== 'en') switchLang('en');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <LangUrlSync />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pl" element={<App />} />
        <Route path="/pl/" element={<App />} />
        <Route path="/pl/*" element={<Navigate to="/pl/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
)
