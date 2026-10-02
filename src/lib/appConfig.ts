import { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export const DEFAULT_LOGO_URL = '/logo-smk.webp';

export interface AppConfig {
  logoUrl: string;
  updatedAt?: any;
}

/**
 * Hook to retrieve app logo and config from API & localStorage.
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
    let isMounted = true;

    async function loadConfig() {
      try {
        const res = await apiFetch('/api/settings/appConfig');
        if (res.ok) {
          const data = await res.json();
          if (data && data.value && isMounted) {
            const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            if (val && val.logoUrl) {
              setLogoUrlState(val.logoUrl);
              try {
                localStorage.setItem('smk_app_logo', val.logoUrl);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('[appConfig] Error fetching app config:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return { logoUrl, loading };
}

/**
 * Save new Logo URL to server API and localStorage.
 */
export async function saveAppLogo(newLogoUrl: string) {
  const cleanUrl = newLogoUrl.trim() || DEFAULT_LOGO_URL;
  
  // 1. Save to localStorage immediately
  try {
    localStorage.setItem('smk_app_logo', cleanUrl);
  } catch {}

  // 2. Save to API backend
  try {
    await apiFetch('/api/settings/appConfig', {
      method: 'POST',
      body: JSON.stringify({
        value: JSON.stringify({
          logoUrl: cleanUrl,
          updatedAt: new Date().toISOString()
        })
      })
    });
  } catch (err) {
    console.warn('[appConfig] Error saving logo to API:', err);
  }
}
