import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const DEFAULT_LOGO_URL = '/logo-smk.svg';

export interface AppConfig {
  logoUrl: string;
  updatedAt?: any;
}

/**
 * Hook to retrieve app logo and config real-time from Firestore.
 * Fallbacks to localStorage for instant client rendering.
 */
export function useAppConfig() {
  const getInitialLogo = () => {
    try {
      const stored = localStorage.getItem('smk_app_logo');
      if (stored && stored.trim().length > 0) {
        return stored;
      }
    } catch {}
    return DEFAULT_LOGO_URL;
  };

  const [logoUrl, setLogoUrlState] = useState<string>(getInitialLogo);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const configDocRef = doc(db, 'settings', 'appConfig');
    
    const unsubscribe = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppConfig;
        if (data && data.logoUrl && data.logoUrl.trim().length > 0) {
          setLogoUrlState(data.logoUrl);
          try {
            localStorage.setItem('smk_app_logo', data.logoUrl);
          } catch {}
        } else {
          setLogoUrlState(DEFAULT_LOGO_URL);
        }
      } else {
        setLogoUrlState(DEFAULT_LOGO_URL);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Realtime appConfig listener warning:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { logoUrl, loading };
}

/**
 * Save new Logo URL to Firestore and localStorage so all clients update instantly.
 */
export async function saveAppLogo(newLogoUrl: string) {
  const cleanUrl = newLogoUrl.trim() || DEFAULT_LOGO_URL;
  
  // Save to localStorage immediately
  try {
    localStorage.setItem('smk_app_logo', cleanUrl);
  } catch {}

  // Save to Firestore for cross-device sync
  const configDocRef = doc(db, 'settings', 'appConfig');
  await setDoc(configDocRef, {
    logoUrl: cleanUrl,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
