import { useState, useEffect } from 'react';
import { supabase } from './supabase.ts';

export const DEFAULT_LOGO_URL = '/logo-smk.webp';

export interface AppConfig {
  logoUrl: string;
  updatedAt?: any;
}

/**
 * Hook to retrieve app logo and config from Supabase, API & localStorage.
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
      // 1. First fetch from Supabase (unified across all devices & Vercel)
      try {
        const { data, error } = await supabase
          .from('labels')
          .select('pdforiginal_url')
          .eq('no_label', '__meta_app_config')
          .single();

        if (!error && data?.pdforiginal_url) {
          try {
            const parsed = JSON.parse(data.pdforiginal_url);
            if (parsed && parsed.logoUrl && isMounted) {
              setLogoUrlState(parsed.logoUrl);
              try {
                localStorage.setItem('smk_app_logo', parsed.logoUrl);
              } catch {}
              setLoading(false);
              return;
            }
          } catch (_) {}
        }
      } catch (sbErr) {
        console.warn('Supabase appConfig fetch warning:', sbErr);
      }

      // 2. Fallback to API if available
      try {
        const res = await fetch('/api/settings/appConfig');
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
        // quiet fallback
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
 * Save new Logo URL to Supabase, API, and localStorage so all devices update instantly.
 */
export async function saveAppLogo(newLogoUrl: string) {
  const cleanUrl = newLogoUrl.trim() || DEFAULT_LOGO_URL;
  
  // 1. Save to localStorage immediately
  try {
    localStorage.setItem('smk_app_logo', cleanUrl);
  } catch {}

  // 2. Save to Supabase (unified database)
  try {
    await supabase.from('labels').upsert({
      no_label: '__meta_app_config',
      status: 'metadata',
      pdf_source: 'app_config',
      pdforiginal_url: JSON.stringify({
        logoUrl: cleanUrl,
        updatedAt: new Date().toISOString()
      }),
      updated_at: new Date().toISOString()
    }, { onConflict: 'no_label' });
  } catch (sbErr) {
    console.warn('Supabase saveAppLogo warning:', sbErr);
  }

  // 3. Save to API backend if available
  fetch('/api/settings/appConfig', {
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
