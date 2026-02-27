import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLang } from '../i18n';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const { pathname } = useLocation();

  if (!isLoggedIn) {
    const loginPath = lang === 'pl' ? '/pl/login' : '/login';
    return <Navigate to={loginPath} state={{ from: pathname }} replace />;
  }

  return <>{children}</>;
}
