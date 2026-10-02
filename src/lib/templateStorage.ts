import { apiFetch } from './apiClient';

export interface TemplateConfig {
  imageUrl?: string;
  qr: { x: number; y: number; width: number; height: number };
  text: { x: number; y: number; fontSize: number; width?: number; height?: number };
}

export interface TemplateConfigs {
  kecil?: TemplateConfig | null;
  besar: TemplateConfig | null;
  besarTidakLaik: TemplateConfig | null;
}

export const DEFAULT_QR_POS = { x: 260, y: 70, width: 140, height: 140 };
export const DEFAULT_TEXT_POS = { x: 100, y: 70, fontSize: 24, width: 150, height: 40 };

const LOCAL_STORAGE_KEY = 'smk_template_configs';

/**
 * Get cached template configs synchronously from localStorage for instant render
 */
export function getCachedTemplateConfigs(): TemplateConfigs {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        kecil: parsed.kecil || null,
        besar: parsed.besar || null,
        besarTidakLaik: parsed.besarTidakLaik || null,
      };
    }
  } catch (_) {}

  return { kecil: null, besar: null, besarTidakLaik: null };
}

/**
 * Fetch template configs from server API
 */
export async function fetchTemplateConfigs(): Promise<TemplateConfigs> {
  const result: TemplateConfigs = getCachedTemplateConfigs();

  try {
    const res = await apiFetch('/api/settings/templates');
    if (res.ok) {
      const apiData = await res.json();
      if (apiData && apiData.value) {
        const val = typeof apiData.value === 'string' ? JSON.parse(apiData.value) : apiData.value;
        if (val) {
          result.kecil = val.kecil || result.kecil;
          result.besar = val.besar || result.besar;
          result.besarTidakLaik = val.besarTidakLaik || result.besarTidakLaik;
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result));
          } catch (_) {}
        }
      }
    }
  } catch (apiErr) {
    console.warn('[templateStorage] Error fetching template configs:', apiErr);
  }

  return result;
}

/**
 * Save template configs to server API
 */
export async function saveTemplateConfigs(configs: TemplateConfigs): Promise<{ success: boolean; error?: string }> {
  // 1. Cache immediately in localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configs));
  } catch (_) {}

  // 2. Persist to API backend
  try {
    const res = await apiFetch('/api/settings/templates', {
      method: 'POST',
      body: JSON.stringify({ value: configs }),
    });

    if (res.ok) {
      return { success: true };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || 'Gagal menyimpan template' };
    }
  } catch (err: any) {
    console.warn('[templateStorage] Error saving templates to server:', err);
    return { success: false, error: err?.message };
  }
}
