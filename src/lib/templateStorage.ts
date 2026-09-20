import { supabase } from './supabase.ts';
import { upsertLabelsToSupabase } from './supabaseSync';

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
 * Fetch template configs from unified Supabase database
 */
export async function fetchTemplateConfigs(): Promise<TemplateConfigs> {
  const result: TemplateConfigs = getCachedTemplateConfigs();

  try {
    // 1. Fetch directly from Supabase (unified across all devices & accounts)
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .in('no_label', ['__meta_template_kecil', '__meta_template_besar', '__meta_template_besar_tidak_laik']);

    if (!error && data && data.length > 0) {
      for (const row of data as any[]) {
        const rawJson = row.pdforiginal_url || row.pdf_original_url || row.pdf_url;
        if (rawJson) {
          if (row.no_label === '__meta_template_kecil') {
            try { result.kecil = JSON.parse(rawJson); } catch (_) {}
          }
          if (row.no_label === '__meta_template_besar') {
            try { result.besar = JSON.parse(rawJson); } catch (_) {}
          }
          if (row.no_label === '__meta_template_besar_tidak_laik') {
            try { result.besarTidakLaik = JSON.parse(rawJson); } catch (_) {}
          }
        }
      }

      // Save to localStorage cache
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result));
      } catch (_) {}

      return result;
    }
  } catch (sbErr) {
    console.warn('Supabase fetchTemplateConfigs warning:', sbErr);
  }

  // 2. Fallback to API if Supabase call didn't yield results
  try {
    const res = await fetch('/api/settings/templates');
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
    console.warn('API fetchTemplateConfigs fallback warning:', apiErr);
  }

  return result;
}

/**
 * Save template configs to unified Supabase database
 */
export async function saveTemplateConfigs(configs: TemplateConfigs): Promise<{ success: boolean; error?: string }> {
  // 1. Cache immediately in localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configs));
  } catch (_) {}

  let supabaseSuccess = false;
  let lastError = '';

  // 2. Persist to Supabase so EVERY device and account immediately has it
  try {
    const payloadItems: any[] = [];

    if (configs.kecil) {
      payloadItems.push({
        no_label: '__meta_template_kecil',
        status: 'metadata',
        pdf_source: 'template_kecil',
        pdforiginal_url: JSON.stringify(configs.kecil),
        pdf_original_url: JSON.stringify(configs.kecil),
        updated_at: new Date().toISOString(),
      });
    }

    if (configs.besar) {
      payloadItems.push({
        no_label: '__meta_template_besar',
        status: 'metadata',
        pdf_source: 'template_besar',
        pdforiginal_url: JSON.stringify(configs.besar),
        pdf_original_url: JSON.stringify(configs.besar),
        updated_at: new Date().toISOString(),
      });
    }

    if (configs.besarTidakLaik) {
      payloadItems.push({
        no_label: '__meta_template_besar_tidak_laik',
        status: 'metadata',
        pdf_source: 'template_besar_tidak_laik',
        pdforiginal_url: JSON.stringify(configs.besarTidakLaik),
        pdf_original_url: JSON.stringify(configs.besarTidakLaik),
        updated_at: new Date().toISOString(),
      });
    }

    if (payloadItems.length > 0) {
      const res = await upsertLabelsToSupabase(payloadItems);
      if (res.success) {
        supabaseSuccess = true;
      } else {
        lastError = res.error?.message || 'Gagal menyimpan template ke Supabase';
        console.warn('Supabase saveTemplateConfigs error:', lastError);
      }
    } else {
      supabaseSuccess = true;
    }
  } catch (err: any) {
    lastError = err?.message || 'Gagal menyimpan ke database Supabase';
    console.warn('Supabase saveTemplateConfigs exception:', err);
  }

  // 3. Background sync to local Express/Cloud SQL API if running
  fetch('/api/settings/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: configs }),
  }).catch(() => {});

  if (supabaseSuccess) {
    return { success: true };
  }

  return { success: true, error: lastError || undefined };
}
