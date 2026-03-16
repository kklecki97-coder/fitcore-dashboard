import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLang } from '../i18n';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, hasAccess } = useAuth();
  const { lang } = useLang();
  const { pathname } = useLocation();

  if (!isLoggedIn) {
    const loginPath = lang === 'pl' ? '/pl/login' : '/login';
    return <Navigate to={loginPath} state={{ from: pathname }} replace />;
  }

  // Account page is always accessible (so coaches can upgrade/manage subscription)
  const isAccountPage = pathname.includes('/account');
  if (!hasAccess && !isAccountPage) {
    const accountPath = lang === 'pl' ? '/pl/account' : '/account';
    return <Navigate to={accountPath} replace />;
  }

  return <>{children}</>;
}
