import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// ── Types ──

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string; // btoa() — demo only, not secure
  coachingNiche?: string;
  clientCount?: string;
  plan: 'trial' | 'pro' | 'cancelled';
  trialStartDate: string;
  trialEndDate: string;
  createdAt: string;
}

interface AuthSession {
  userId: string;
  email: string;
  loggedInAt: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  coachingNiche?: string;
  clientCount?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<AuthUser, 'fullName' | 'coachingNiche' | 'clientCount'>>) => void;
}

// ── localStorage keys ──

const USERS_KEY = 'fitcore-demo-users';
const SESSION_KEY = 'fitcore-demo-session';

// ── Helpers ──

function getUsers(): AuthUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function computeTrialDays(trialEndDate: string): number {
  const end = new Date(trialEndDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ── Context ──

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const session = getSession();
    if (!session) return null;
    const users = getUsers();
    return users.find(u => u.id === session.userId) || null;
  });

  const isLoggedIn = user !== null;
  const trialDaysRemaining = user ? computeTrialDays(user.trialEndDate) : 0;
  const isTrialActive = user?.plan === 'trial' && trialDaysRemaining > 0;

  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    // Simulate async
    await new Promise(r => setTimeout(r, 600));

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'emailExists' };
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const newUser: AuthUser = {
      id: crypto.randomUUID(),
      fullName: data.fullName,
      email: data.email,
      passwordHash: btoa(data.password),
      coachingNiche: data.coachingNiche,
      clientCount: data.clientCount,
      plan: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      createdAt: now.toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    saveSession({ userId: newUser.id, email: newUser.email, loggedInAt: now.toISOString() });
    setUser(newUser);

    return { success: true };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    await new Promise(r => setTimeout(r, 400));

    const users = getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!found || found.passwordHash !== btoa(password)) {
      return { success: false, error: 'invalidCredentials' };
    }

    saveSession({ userId: found.id, email: found.email, loggedInAt: new Date().toISOString() });
    setUser(found);

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback((data: Partial<Pick<AuthUser, 'fullName' | 'coachingNiche' | 'clientCount'>>) => {
    if (!user) return;
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return;

    const updated = { ...users[idx], ...data };
    users[idx] = updated;
    saveUsers(users);
    setUser(updated);
  }, [user]);

  // Sync user state if localStorage changes in another tab
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        if (!e.newValue) {
          setUser(null);
        } else {
          const session: AuthSession = JSON.parse(e.newValue);
          const users = getUsers();
          setUser(users.find(u => u.id === session.userId) || null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isTrialActive, trialDaysRemaining, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
