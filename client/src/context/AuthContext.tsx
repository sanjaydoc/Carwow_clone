import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../api/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(session: any): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    name: meta.name || meta.full_name || (u.email ? u.email.split('@')[0] : 'Patient'),
    email: u.email || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(toUser(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Sign-in is not available.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const register = async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error('Sign-up is not available.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  };

  const loginWithGoogle = async () => {
    if (!supabase) throw new Error('Google sign-in is not available.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
    if (error) throw new Error(error.message);
  };

  const logout = () => {
    supabase?.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
