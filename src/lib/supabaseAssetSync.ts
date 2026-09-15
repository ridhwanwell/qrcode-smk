import { supabase } from './supabase.ts';

/**
 * Prefix used for storing asset management collections in Supabase
 */
const ASSET_PREFIX = '__aset_coll_';

/**
 * Fetch a collection from Supabase
 */
export async function fetchAssetCollectionFromSupabase<T>(collectionName: string): Promise<T[] | null> {
  try {
    const metaKey = `${ASSET_PREFIX}${collectionName}`;
    const { data, error } = await supabase
      .from('labels')
      .select('pdf_url')
      .eq('no_label', metaKey)
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseAssetSync] Error fetching ${collectionName}:`, error.message);
      return null;
    }

    if (data && data.pdf_url) {
      try {
        const parsed = JSON.parse(data.pdf_url);
        if (Array.isArray(parsed)) {
          return parsed as T[];
        }
      } catch (err) {
        console.warn(`[SupabaseAssetSync] JSON parse error for ${collectionName}:`, err);
      }
    }
    return null;
  } catch (err) {
    console.warn(`[SupabaseAssetSync] Exception fetching ${collectionName}:`, err);
    return null;
  }
}

/**
 * Save a collection to Supabase (and backup to local server / localStorage)
 */
export async function saveAssetCollectionToSupabase<T>(collectionName: string, items: T[]): Promise<boolean> {
  const jsonStr = JSON.stringify(items);
  const metaKey = `${ASSET_PREFIX}${collectionName}`;

  // 1. Cache to localStorage for instant 0ms offline availability
  try {
    localStorage.setItem(`smk_aset_${collectionName}`, jsonStr);
  } catch (_) {}

  // 2. Backup to server-side Cloud SQL database via API
  try {
    fetch(`/api/settings/aset_${encodeURIComponent(collectionName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: jsonStr })
    }).catch(() => {});
  } catch (_) {}

  // 3. Persist to Supabase
  try {
    const { error } = await supabase.from('labels').upsert({
      no_label: metaKey,
      status: 'asset_data',
      pdf_source: collectionName,
      pdf_name: `Collection: ${collectionName} (${items.length} items)`,
      pdf_url: jsonStr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'no_label' });

    if (error) {
      console.warn(`[SupabaseAssetSync] Error saving ${collectionName} to Supabase:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[SupabaseAssetSync] Exception saving ${collectionName} to Supabase:`, err);
    return false;
  }
}

/**
 * Subscribe to real-time changes on Supabase for a specific asset collection
 */
export function subscribeAssetCollectionFromSupabase<T>(
  collectionName: string, 
  onUpdate: (items: T[]) => void
): () => void {
  const metaKey = `${ASSET_PREFIX}${collectionName}`;

  const channelId = `asset_sync_${collectionName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let channel: any = null;
  try {
    channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labels',
          filter: `no_label=eq.${metaKey}`
        },
        (payload) => {
          try {
            if (payload.new && (payload.new as any).pdf_url) {
              const parsed = JSON.parse((payload.new as any).pdf_url);
              if (Array.isArray(parsed)) {
                onUpdate(parsed as T[]);
              }
            }
          } catch (err) {
            console.warn(`[SupabaseAssetSync] Realtime payload error for ${collectionName}:`, err);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn(`[SupabaseAssetSync] Channel subscribe error for ${collectionName}:`, err);
  }

  return () => {
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    }
  };
}
