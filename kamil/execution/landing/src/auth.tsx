import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

// ── Types ──

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  coachingNiche?: string;
  clientCount?: string;
  plan: 'trial' | 'pro' | 'cancelled';
  trialStartDate: string;
  trialEndDate: string;
  createdAt: string;
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
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
}

// ── Helpers ──

function computeTrialDays(trialEndDate: string): number {
  const end = new Date(trialEndDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function buildAuthUser(
  authId: string,
  email: string,
  meta: Record<string, unknown>,
  coachRow?: Record<string, unknown> | null,
): AuthUser {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  return {
    id: authId,
    fullName: (coachRow?.name as string) || (meta?.name as string) || email.split('@')[0],
    email,
    coachingNiche: (meta?.coaching_niche as string) || undefined,
    clientCount: (meta?.client_count as string) || undefined,
    plan: 'trial',
    trialStartDate: (coachRow?.created_at as string) || now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    createdAt: (coachRow?.created_at as string) || now.toISOString(),
  };
}

// ── Context ──

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from coach row
  const loadUser = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Skip client users — they shouldn't log into the landing/dashboard
    if (session.user.user_metadata?.role === 'client') {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const authUser = buildAuthUser(
      session.user.id,
      session.user.email || '',
      session.user.user_metadata || {},
      coach,
    );
    setUser(authUser);
    setLoading(false);
  }, []);

  // Init: check current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  const isLoggedIn = user !== null;
  const trialDaysRemaining = user ? computeTrialDays(user.trialEndDate) : 0;
  const isTrialActive = user?.plan === 'trial' && trialDaysRemaining > 0;

  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.fullName,
          coaching_niche: data.coachingNiche || null,
          client_count: data.clientCount || null,
        },
      },
    });

    if (error) {
      if (error.message?.includes('already registered')) {
        return { success: false, error: 'emailExists' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, error: 'invalidCredentials' };
    }

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<AuthUser, 'fullName' | 'coachingNiche' | 'clientCount'>>) => {
    if (!user) return;

    // Update coach row in DB
    const updates: Record<string, unknown> = {};
    if (data.fullName !== undefined) updates.name = data.fullName;
    if (Object.keys(updates).length > 0) {
      await supabase.from('coaches').update(updates).eq('id', user.id);
    }

    // Update user metadata
    const metaUpdates: Record<string, unknown> = {};
    if (data.fullName !== undefined) metaUpdates.name = data.fullName;
    if (data.coachingNiche !== undefined) metaUpdates.coaching_niche = data.coachingNiche;
    if (data.clientCount !== undefined) metaUpdates.client_count = data.clientCount;
    if (Object.keys(metaUpdates).length > 0) {
      await supabase.auth.updateUser({ data: metaUpdates });
    }

    // Update local state
    setUser(prev => prev ? { ...prev, ...data } : null);
  }, [user]);

  const changePassword = useCallback(async (_currentPassword: string, newPassword: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }, []);

  // Show nothing while loading initial session
  if (loading) {
    return (
      <AuthContext.Provider value={{ user: null, isLoggedIn: false, isTrialActive: false, trialDaysRemaining: 0, login, register, logout, updateProfile, changePassword }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isTrialActive, trialDaysRemaining, login, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
