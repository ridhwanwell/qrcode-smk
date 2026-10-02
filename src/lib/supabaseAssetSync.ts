import { apiFetch } from './apiClient';

/**
 * Fetch an asset collection via server API
 */
export async function fetchAssetCollectionFromSupabase<T>(collectionName: string): Promise<T[] | null> {
  try {
    const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.found === true && Array.isArray(json.items)) {
        return json.items as T[];
      }
    }
    return null;
  } catch (err) {
    console.warn(`[SupabaseAssetSync] Exception fetching ${collectionName}:`, err);
    return null;
  }
}

/**
 * Save an asset collection via server API
 */
export async function saveAssetCollectionToSupabase<T>(collectionName: string, items: T[]): Promise<boolean> {
  const jsonStr = JSON.stringify(items);

  // 1. Cache to localStorage for instant offline availability
  try {
    localStorage.setItem(`smk_aset_${collectionName}`, jsonStr);
  } catch (_) {}

  // 2. Persist to server API
  try {
    const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
      method: 'POST',
      body: JSON.stringify({ items, replaceAll: false })
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SupabaseAssetSync] Exception saving ${collectionName}:`, err);
    return false;
  }
}
