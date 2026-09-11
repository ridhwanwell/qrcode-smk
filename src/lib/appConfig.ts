import { useState, useEffect } from 'react';

export const DEFAULT_LOGO_URL = '/logo-smk.svg';

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
    fetch('/api/settings/appConfig')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.value) {
          const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (val && val.logoUrl) {
            setLogoUrlState(val.logoUrl);
            try {
              localStorage.setItem('smk_app_logo', val.logoUrl);
            } catch {}
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Error fetching appConfig:", err);
        setLoading(false);
      });
  }, []);

  return { logoUrl, loading };
}

/**
 * Save new Logo URL to API and localStorage so all clients update instantly.
 */
export async function saveAppLogo(newLogoUrl: string) {
  const cleanUrl = newLogoUrl.trim() || DEFAULT_LOGO_URL;
  
  // Save to localStorage immediately
  try {
    localStorage.setItem('smk_app_logo', cleanUrl);
  } catch {}

  // Save to API backend
  await fetch('/api/settings/appConfig', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: JSON.stringify({
        logoUrl: cleanUrl,
        updatedAt: new Date().toISOString()
      })
    })
  }).catch(() => {});
}
