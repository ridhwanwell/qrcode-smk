import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserRole = 'admin_utama' | 'admin_teknik' | 'admin_keuangan' | 'hanya_sph';

export interface UserDirectoryInfo {
  username: string;
  role: UserRole;
  fullName: string;
  roleLabel: string;
}

export const OFFICIAL_USERS_DIRECTORY: Record<string, UserDirectoryInfo> = {
  'ridhwanwell@smk.co.id': {
    username: 'ridhwanwell',
    role: 'admin_utama',
    fullName: 'Ridhwan Well',
    roleLabel: 'Admin Utama'
  },
  'hafizh@smk.co.id': {
    username: 'hafizh',
    role: 'admin_utama',
    fullName: 'Hafizh',
    roleLabel: 'Admin Utama'
  },
  'sheva@smk.co.id': {
    username: 'sheva',
    role: 'admin_utama',
    fullName: 'Sheva',
    roleLabel: 'Admin Utama'
  },
  'alinu@smk.co.id': {
    username: 'alinu',
    role: 'admin_teknik',
    fullName: 'Alinu',
    roleLabel: 'Admin Teknik'
  },
  'fitri@smk.co.id': {
    username: 'fitri',
    role: 'admin_keuangan',
    fullName: 'Fitri',
    roleLabel: 'Admin Keuangan'
  },
  'nissa@smk.co.id': {
    username: 'nissa',
    role: 'hanya_sph',
    fullName: 'Nissa',
    roleLabel: 'Hanya SPH'
  },
  'erwin@smk.co.id': {
    username: 'erwin',
    role: 'hanya_sph',
    fullName: 'Erwin',
    roleLabel: 'Hanya SPH'
  },
  'sulis@smk.co.id': {
    username: 'sulis',
    role: 'hanya_sph',
    fullName: 'Sulis',
    roleLabel: 'Hanya SPH'
  }
};

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  roleLabel?: string;
  fullName?: string;
  avatarUrl?: string;
  displayName?: string;
  username?: string;
  avatarLetter?: string;
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
 * Normalizes username inputs to their respective official login emails.
 */
function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const clean = trimmed.replace(/[\s_.-]+/g, '');

  // Check against known usernames
  for (const [email, info] of Object.entries(OFFICIAL_USERS_DIRECTORY)) {
    if (info.username.toLowerCase() === clean || clean === info.fullName.toLowerCase().replace(/\s+/g, '')) {
      return email;
    }
  }

  // Common aliases
  if (clean === 'adminutama' || clean === 'admin' || clean === 'ridhwan') {
    return 'ridhwanwell@smk.co.id';
  }
  if (clean === 'adminteknik' || clean === 'teknik') {
    return 'alinu@smk.co.id';
  }
  if (clean === 'adminkeuangan' || clean === 'keuangan') {
    return 'fitri@smk.co.id';
  }
  if (clean === 'sph' || clean === 'hanyasph') {
    return 'nissa@smk.co.id';
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

  // Fetch role and profile from public.profiles table or official directory
  const loadUserProfile = async (sbUser: User): Promise<AppUser> => {
    const emailStr = (sbUser.email || '').toLowerCase().trim();
    const matchedDir = OFFICIAL_USERS_DIRECTORY[emailStr];

    let role: UserRole = matchedDir?.role || 'admin_utama';
    let fullName = matchedDir?.fullName || sbUser.email || 'Pengguna PT SMK';
    let roleLabel = matchedDir?.roleLabel || (role === 'admin_utama' ? 'Admin Utama' : role === 'admin_keuangan' ? 'Admin Keuangan' : role === 'admin_teknik' ? 'Admin Teknik' : 'Hanya SPH');
    let username = matchedDir?.username || emailStr.split('@')[0] || 'admin';

    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (!profileErr && data) {
        if (data.role) role = data.role as UserRole;
        if (data.full_name) fullName = data.full_name;
      }
    } catch (err) {
      console.warn('Could not fetch user profile from Supabase:', err);
    }

    const displayName = fullName;
    const avatarLetter = (displayName.charAt(0) || 'A').toUpperCase();

    const appUser: AppUser = {
      id: sbUser.id,
      email: sbUser.email || emailStr,
      role,
      roleLabel,
      fullName,
      displayName,
      username,
      avatarLetter
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
