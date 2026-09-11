import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';

export interface AdminUser {
  username: string;
  displayName: string;
  role: string;
  avatarLetter?: string;
  email?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'smk_admin_user_session';

const VALID_ACCOUNTS: Record<string, { pass: string; name: string; role: string }> = {
  'ridhwanwell': {
    pass: 'smkjayajaya',
    name: 'Ridhwan Well',
    role: 'Super Admin',
  },
  'adminteknik': {
    pass: 'smkjayajaya',
    name: 'Admin Teknik',
    role: 'Admin Teknik',
  },
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithCredentials: async () => ({ success: false }),
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check localStorage first
    try {
      const savedUser = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.username) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading stored user session:', e);
    }

    // 2. Check Supabase session if any
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const adminUser: AdminUser = {
          username: session.user.email ? session.user.email.split('@')[0] : 'admin',
          displayName: session.user.user_metadata?.full_name || session.user.email || 'Admin',
          role: 'Admin',
          email: session.user.email,
          avatarLetter: (session.user.email || 'A')[0].toUpperCase(),
        };
        setUser(adminUser);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const adminUser: AdminUser = {
          username: session.user.email ? session.user.email.split('@')[0] : 'admin',
          displayName: session.user.user_metadata?.full_name || session.user.email || 'Admin',
          role: 'Admin',
          email: session.user.email,
          avatarLetter: (session.user.email || 'A')[0].toUpperCase(),
        };
        setUser((prev) => prev || adminUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithCredentials = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!username || !password) {
      return { success: false, error: 'Silakan isi username dan password' };
    }

    const account = VALID_ACCOUNTS[username];
    if (!account) {
      return { success: false, error: 'Username tidak terdaftar.' };
    }

    if (account.pass !== password) {
      return { success: false, error: 'Password salah. Silakan periksa kembali.' };
    }

    const adminUser: AdminUser = {
      username: username,
      displayName: account.name,
      role: account.role,
      avatarLetter: username[0].toUpperCase(),
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(adminUser));
    setUser(adminUser);

    return { success: true };
  };

  const logout = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout warning:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

