import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Tema tampilan portal:
 *  - 'light' : tema terang (palet 1C658C · 398AB9 · DCDFE3 · EEEEEE)
 *  - 'dark'  : tema "Hitam Kaca" (palet 1B262C · 0F4C75 · 3282B8 · BBE1FA)
 *
 * Murni tampilan (UI). Tidak menyentuh data, login, atau server.
 */
export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'smk_theme';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function readStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage bisa diblokir (mode privat) — abaikan
  }
  return 'dark';
}

/** Perangkat lemah (tablet lama) → efek kaca diringankan agar tidak patah-patah. */
function detectLiteGlass(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
    const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
    const reduceTransparency = window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
    return Boolean(lowMemory || lowCpu || reduceTransparency);
  } catch {
    return false;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => (typeof window === 'undefined' ? 'dark' : readStoredTheme()));

  useEffect(() => {
    if (detectLiteGlass()) document.documentElement.classList.add('lite-glass');
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // abaikan
    }
  }, []);

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
      const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (!doc.startViewTransition || reduceMotion || !origin) {
        setTheme(next);
        return;
      }
      const { x, y } = origin;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = doc.startViewTransition(() => {
        // Terapkan langsung ke <html> agar snapshot "sesudah" sudah bertema baru
        document.documentElement.dataset.theme = next;
        setTheme(next);
      });
      transition.ready
        .then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' } as KeyframeAnimationOptions
          );
        })
        .catch(() => {});
    },
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

const LABEL_QUERY_KEYS = ['noLabel', 'nolabel', 'label', 'cert', 'no_label'];

/** Halaman publik hasil scan QR selalu tema terang (tampilan sertifikat untuk pihak RS). */
export function isPublicScanPath(pathname: string, search: string): boolean {
  const p = pathname || '/';
  if (p === '/' || p === '') {
    const sp = new URLSearchParams(search);
    return LABEL_QUERY_KEYS.some((k) => sp.has(k));
  }
  if (p === '/portal-aset' || p.startsWith('/admin')) return false;
  return true;
}

/** Menulis atribut data-theme ke <html> sesuai halaman yang sedang dibuka. */
export const ThemeRouteSync: React.FC<{ pathname: string; search: string }> = ({ pathname, search }) => {
  const { theme } = useTheme();
  useEffect(() => {
    const effective: ThemeMode = isPublicScanPath(pathname, search) ? 'light' : theme;
    const root = document.documentElement;
    root.dataset.theme = effective;
    root.style.colorScheme = effective;
  }, [theme, pathname, search]);
  return null;
};
