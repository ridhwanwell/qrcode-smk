import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserRole = 'admin_utama' | 'admin_teknik' | 'admin_keuangan';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AppUser | null;
  supabaseUser: User | null;
  session: Session | null;
  isAdmin: boolean;
  role: UserRole;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithCredentials: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  session: null,
  isAdmin: false,
  role: 'admin_utama',
  loading: true,
  error: null,
  setError: () => {},
  login: async () => ({ success: false }),
  loginWithCredentials: async () => ({ success: false }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * Normalizes username inputs like "admin utama", "adminteknik", "adminkeuangan"
 * to their respective official login emails.
 */
function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const clean = trimmed.replace(/[\s_-]+/g, '');
  if (clean === 'adminutama' || clean === 'ridhwanwell' || clean === 'admin') {
    return 'admin.utama@smk.co.id';
  }
  if (clean === 'adminteknik' || clean === 'teknik') {
    return 'admin.teknik@smk.co.id';
  }
  if (clean === 'adminkeuangan' || clean === 'keuangan') {
    return 'admin.keuangan@smk.co.id';
  }
  return `${clean}@smk.co.id`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem('smk_cached_profile');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch role and profile from public.profiles table
  const loadUserProfile = async (sbUser: User): Promise<AppUser> => {
    let role: UserRole = 'admin_utama';
    let fullName = sbUser.email || 'Admin PT SMK';

    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (!profileErr && data && data.role) {
        role = data.role as UserRole;
        if (data.full_name) fullName = data.full_name;
      } else {
        // Fallback role deduction from verified email if profile record hasn't been created yet
        const email = (sbUser.email || '').toLowerCase();
        if (email.includes('teknik')) {
          role = 'admin_teknik';
          fullName = 'Admin Teknik PT SMK';
        } else if (email.includes('keuangan')) {
          role = 'admin_keuangan';
          fullName = 'Admin Keuangan PT SMK';
        } else {
          role = 'admin_utama';
          fullName = 'Admin Utama (Pemilik)';
        }
      }
    } catch (err) {
      console.warn('Could not fetch user profile from Supabase:', err);
    }

    const appUser: AppUser = {
      id: sbUser.id,
      email: sbUser.email || '',
      role,
      fullName
    };

    try {
      localStorage.setItem('smk_cached_profile', JSON.stringify(appUser));
    } catch (_) {}

    return appUser;
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        setSupabaseUser(initialSession.user);
        const profile = await loadUserProfile(initialSession.user);
        if (isMounted) setUser(profile);
      } else {
        setUser(null);
        setSupabaseUser(null);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession?.user) {
        setSupabaseUser(newSession.user);
        const profile = await loadUserProfile(newSession.user);
        if (isMounted) setUser(profile);
      } else {
        setUser(null);
        setSupabaseUser(null);
        localStorage.removeItem('smk_cached_profile');
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    try {
      const email = normalizeEmail(usernameOrEmail);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        const msg = authError.message.includes('Invalid login credentials')
          ? 'Email/Username atau Password tidak sesuai dengan akun Supabase Auth Anda.'
          : authError.message;
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      if (data.user) {
        setSupabaseUser(data.user);
        setSession(data.session);
        const profile = await loadUserProfile(data.user);
        setUser(profile);
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'User tidak ditemukan.' };
    } catch (err: any) {
      const msg = err?.message || 'Gagal login ke Supabase Authentication.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    localStorage.removeItem('smk_cached_profile');
    localStorage.removeItem('smk_auth_user');
    localStorage.removeItem('smk_admin_user_session');
  };

  const role: UserRole = user?.role || 'admin_utama';
  const isAdmin = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAdmin,
        role,
        loading,
        error,
        setError,
        login,
        loginWithCredentials: login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
