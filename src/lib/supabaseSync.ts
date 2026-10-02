import { apiFetch } from './apiClient';

/**
 * Robust helper to upsert labels via backend API (POST /api/labels/bulk).
 */
export async function upsertLabelsToSupabase(items: any[]): Promise<{ success: boolean; count: number; error?: any }> {
  if (!items || items.length === 0) return { success: true, count: 0 };

  try {
    const res = await apiFetch('/api/labels/bulk', {
      method: 'POST',
      body: JSON.stringify({ items })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, count: 0, error: errJson.error || 'Gagal menyimpan label ke server' };
    }

    const data = await res.json();
    return { success: true, count: data.count || items.length };
  } catch (err: any) {
    console.warn('[supabaseSync] Error upserting labels:', err);
    return { success: false, count: 0, error: err?.message };
  }
}

/**
 * Fetches folder hospital names metadata from server API
 */
export async function fetchFolderRsFromSupabase(): Promise<Record<string, string>> {
  try {
    const res = await apiFetch('/api/folders/nama-rs');
    if (res.ok) {
      const map = await res.json();
      return map || {};
    }
    return {};
  } catch (err) {
    console.warn('[supabaseSync] Error fetching folder RS from server:', err);
    return {};
  }
}

/**
 * Saves folder hospital name metadata into server API
 */
export async function saveFolderRsToSupabase(prefix: string, namaRs: string): Promise<void> {
  try {
    await apiFetch('/api/folders/nama-rs', {
      method: 'POST',
      body: JSON.stringify({ prefix, namaRs })
    });
  } catch (err) {
    console.warn('[supabaseSync] Error saving folder RS to server:', err);
  }
}

/**
 * Deletes a label via server API
 */
export async function deleteLabelFromSupabase(noLabel: string): Promise<void> {
  try {
    await apiFetch(`/api/labels/${encodeURIComponent(noLabel)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('[supabaseSync] Error deleting label from server:', err);
  }
}

/**
 * Bulk sync labels via server API
 */
export async function bulkSyncLabelsToSupabase(items: any[]): Promise<{ success: boolean; count: number }> {
  return await upsertLabelsToSupabase(items);
}
