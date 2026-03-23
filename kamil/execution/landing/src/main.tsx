import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { I18nProvider, useLang } from './i18n'
import { AuthProvider } from './auth'
import './index.css'
import App from './App.tsx'
import CheckoutPage from './CheckoutPage.tsx'
import RegisterPage from './RegisterPage.tsx'
import LoginPage from './LoginPage.tsx'
import AccountPage from './AccountPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import PrivacyPage from './PrivacyPage.tsx'
import TermsPage from './TermsPage.tsx'
import ContactPage from './ContactPage.tsx'
import NotFoundPage from './NotFoundPage.tsx'

function LangUrlSync() {
  const { pathname } = useLocation();
  const { lang, switchLang } = useLang();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Auto-redirect on first visit if Polish browser & no saved preference
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

    // Sync URL prefix with lang state
    const isPlUrl = pathname.startsWith('/pl');
    if (isPlUrl && lang !== 'pl') switchLang('pl');
    if (!isPlUrl && lang !== 'en') switchLang('en');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <LangUrlSync />
      <Routes>
        {/* English (default) */}
        <Route path="/" element={<App />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        {/* Polish prefix */}
        <Route path="/pl" element={<App />} />
        <Route path="/pl/" element={<App />} />
        <Route path="/pl/checkout" element={<CheckoutPage />} />
        <Route path="/pl/register" element={<RegisterPage />} />
        <Route path="/pl/login" element={<LoginPage />} />
        <Route path="/pl/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/pl/privacy" element={<PrivacyPage />} />
        <Route path="/pl/terms" element={<TermsPage />} />
        <Route path="/pl/contact" element={<ContactPage />} />
        {/* 404 */}
        <Route path="/pl/*" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
