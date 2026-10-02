import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { apiFetch } from './apiClient';

export type UserRole = 'admin_utama' | 'admin_teknik' | 'admin_keuangan' | 'hanya_sph';

export const OFFICIAL_ROLES: readonly UserRole[] = [
  'admin_utama',
  'admin_teknik',
  'admin_keuangan',
  'hanya_sph'
] as const;

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
  role: UserRole | '';
  isOnline: boolean;
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
  role: '',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  loading: true,
  error: null,
  setError: () => {},
  login: async () => ({ success: false }),
  loginWithCredentials: async () => ({ success: false }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function normalizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const clean = trimmed.replace(/[\s_.-]+/g, '');

  if (clean === 'adminutama' || clean === 'admin' || clean === 'ridhwan') {
    return 'ridhwanwell@smk.co.id';
  }
  if (clean === 'adminteknik' || clean === 'teknik' || clean === 'alinu') {
    return 'alinu@smk.co.id';
  }
  if (clean === 'adminkeuangan' || clean === 'keuangan' || clean === 'fitri') {
    return 'fitri@smk.co.id';
  }
  if (clean === 'sph' || clean === 'hanyasph' || clean === 'nissa') {
    return 'nissa@smk.co.id';
  }

  return `${clean}@smk.co.id`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      supabase.auth.getSession().catch(() => {});
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  /**
   * ATURAN WAJIB (Point 5):
   * Selalu ambil role dari server (public.profiles).
   * Jangan gunakan localStorage sebagai sumber kebenaran.
   * Jika profil tidak ditemukan atau role bukan 4 role resmi:
   * JANGAN pakai role default 'admin_utama' -> tampilkan pesan "Akun belum diaktifkan, hubungi Admin Utama" dan logout.
   */
  const loadUserProfile = async (sbUser: User): Promise<AppUser | null> => {
    const emailStr = (sbUser.email || '').toLowerCase().trim();

    try {
      // Fetch authenticated profile and verified role from backend
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data && data.role && OFFICIAL_ROLES.includes(data.role as UserRole)) {
          const role = data.role as UserRole;
          const fullName = data.fullName || emailStr.split('@')[0] || 'Pengguna PT SMK';
          const roleLabel = role === 'admin_utama'
            ? 'Admin Utama'
            : role === 'admin_keuangan'
              ? 'Admin Keuangan'
              : role === 'admin_teknik'
                ? 'Admin Teknik'
                : 'Hanya SPH';

          const username = emailStr.split('@')[0] || 'pengguna';
          const displayName = fullName;
          const avatarLetter = (displayName.charAt(0) || 'P').toUpperCase();

          const appUser: AppUser = {
            id: data.id || sbUser.id,
            email: data.email || sbUser.email || emailStr,
            role,
            roleLabel,
            fullName,
            displayName,
            username,
            avatarLetter
          };

          return appUser;
        }
      }

      if (res.status === 403) {
        console.warn(`[AuthContext] Akun ${sbUser.id} (${emailStr}) tidak memiliki profil/role resmi di database.`);
        const unactivatedMsg = 'Akun belum diaktifkan, hubungi Admin Utama';
        setError(unactivatedMsg);
        await logout();
        return null;
      }

      // Fallback to direct profiles query if backend was temporarily unreachable
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (profileErr || !profile || !profile.role || !OFFICIAL_ROLES.includes(profile.role as UserRole)) {
        console.warn(`[AuthContext] Akun ${sbUser.id} (${emailStr}) tidak memiliki profil/role resmi di database.`);
        const unactivatedMsg = 'Akun belum diaktifkan, hubungi Admin Utama';
        setError(unactivatedMsg);
        await logout();
        return null;
      }

      const role = profile.role as UserRole;
      const fullName = profile.full_name || emailStr.split('@')[0] || 'Pengguna PT SMK';
      const roleLabel = role === 'admin_utama'
        ? 'Admin Utama'
        : role === 'admin_keuangan'
          ? 'Admin Keuangan'
          : role === 'admin_teknik'
            ? 'Admin Teknik'
            : 'Hanya SPH';

      const username = emailStr.split('@')[0] || 'pengguna';
      const displayName = fullName;
      const avatarLetter = (displayName.charAt(0) || 'P').toUpperCase();

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

      return appUser;
    } catch (err: any) {
      console.error('[AuthContext] Gagal memuat profil pengguna:', err);
      setError('Layanan autentikasi sedang bermasalah, silakan coba lagi.');
      await logout();
      return null;
    }
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
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSupabaseUser(null);
        localStorage.removeItem('smk_cached_profile');
      }
      setLoading(false);
    });

    // 3. Listen to session expired event from apiClient
    const handleExpired = () => {
      setError('Sesi login telah kedaluwarsa, silakan login kembali.');
      logout();
    };
    window.addEventListener('auth_session_expired', handleExpired);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('auth_session_expired', handleExpired);
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
        if (!profile) {
          setLoading(false);
          return { success: false, error: 'Akun belum diaktifkan, hubungi Admin Utama' };
        }
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

  const role: UserRole | '' = user?.role || '';
  const isAdmin = user?.role === 'admin_utama';

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAdmin,
        role,
        isOnline,
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
