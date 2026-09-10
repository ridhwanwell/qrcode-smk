import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, getRedirectResult, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

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

    // 2. Check Firebase Redirect result
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          const u: AdminUser = {
            username: res.user.email?.split('@')[0] || 'admin',
            displayName: res.user.displayName || res.user.email || 'Admin',
            role: 'Admin',
            email: res.user.email || undefined,
            photoURL: res.user.photoURL || undefined,
            avatarLetter: (res.user.displayName || res.user.email || 'A')[0].toUpperCase(),
          };
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(u));
          setUser(u);
        }
      })
      .catch((err) => {
        console.warn('Redirect login error:', err);
      });

    // 3. Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        const adminUser: AdminUser = {
          username: u.email ? u.email.split('@')[0] : 'admin',
          displayName: u.displayName || u.email || 'Admin',
          role: 'Admin',
          email: u.email || undefined,
          photoURL: u.photoURL || undefined,
          avatarLetter: (u.displayName || u.email || 'A')[0].toUpperCase(),
        };
        setUser((prev) => prev || adminUser);
      }
      setLoading(false);
    });

    return unsubscribe;
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

    // Optional background anonymous sign-in to satisfy firebase if needed
    try {
      await signInAnonymously(auth);
    } catch {
      // Non-blocking
    }

    return { success: true };
  };

  const logout = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUser(null);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

