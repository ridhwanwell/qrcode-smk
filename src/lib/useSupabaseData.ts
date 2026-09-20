import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Universal React Hook for durable data persistence and live Realtime cross-device sync.
 * Connects directly to Supabase cloud table 'app_collections' from any device (laptop, mobile phone, tablet)
 * with instant WebSocket postgres_changes and fallback backend proxy synchronization.
 */
export function useSupabaseData<T extends { id: string }>(
  collectionName: string,
  initialFallback: T[] = []
) {
  const storageKey = `smk_supa_${collectionName}`;
  const initKey = `smk_inited_${collectionName}`;

  // Unique client instance ID to identify broadcast origin and avoid redundant self-refetches
  const clientIdRef = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. Instant load from local cache or initialFallback
  const [data, setData] = useState<T[]>(() => {
    try {
      const isInited = localStorage.getItem(initKey) === 'true';
      const cached = localStorage.getItem(storageKey);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // If already initialized, respect whatever is cached
          if (isInited || parsed.length > 0) {
            return parsed as T[];
          }
        }
      }
    } catch (_) {}
    return initialFallback;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const { user } = useAuth();
  const dataRef = useRef<T[]>(data);
  dataRef.current = data;

  const updateCache = useCallback((nextItems: T[]) => {
    setData(nextItems);
    dataRef.current = nextItems;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextItems));
      localStorage.setItem(initKey, 'true');
    } catch (_) {}
  }, [storageKey, initKey]);

  const initialFallbackRef = useRef(initialFallback);
  initialFallbackRef.current = initialFallback;

  // Broadcast function to notify all other clients instantly via Supabase WebSocket
  const broadcastSync = useCallback(() => {
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: `sync_${collectionName}`,
          payload: {
            senderId: clientIdRef.current,
            timestamp: Date.now()
          }
        });
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Broadcast error on ${collectionName}:`, e);
    }
  }, [collectionName]);

  // Direct fetch from Supabase (Works everywhere: mobile, tablet, laptop, Vercel, etc.)
  const fetchDirectFromSupabase = useCallback(async (): Promise<T[] | null> => {
    // 1. First priority: Direct Supabase client query
    try {
      const { data: supaRow, error } = await supabase
        .from('app_collections')
        .select('data')
        .eq('collection_name', collectionName)
        .maybeSingle();

      if (!error && supaRow && Array.isArray(supaRow.data)) {
        return supaRow.data as T[];
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Direct fetch failed for ${collectionName}:`, e);
    }

    // 2. Second priority: Backend API proxy
    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(collectionName)}?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.found === true && Array.isArray(json.items)) {
          return json.items as T[];
        }
      }
    } catch (e) {
      console.warn(`[useSupabaseData] API proxy fetch failed for ${collectionName}:`, e);
    }

    return null;
  }, [collectionName]);

  // Direct write to Supabase (Writes to both direct Supabase cloud table AND backend proxy)
  const saveToSupabase = useCallback(async (items: T[]) => {
    // 1. Direct Supabase Cloud Table Upsert
    try {
      await supabase.from('app_collections').upsert({
        collection_name: collectionName,
        data: items,
        updated_at: new Date().toISOString()
      }, { onConflict: 'collection_name' });
    } catch (e) {
      console.warn(`[useSupabaseData] Direct Supabase upsert error on ${collectionName}:`, e);
    }

    // 2. Backend API Proxy as backup
    try {
      await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, replaceAll: true })
      });
    } catch (e) {
      console.warn(`[useSupabaseData] API Proxy save error on ${collectionName}:`, e);
    }

    // 3. Realtime Broadcast
    broadcastSync();
  }, [collectionName, broadcastSync]);

  // 2. Fetch from Supabase and set up Supabase Realtime channel
  useEffect(() => {
    let isMounted = true;
    let debounceTimer: any = null;

    const loadData = async () => {
      try {
        const serverItems = await fetchDirectFromSupabase();

        if (serverItems !== null) {
          // If server has data, or server was explicitly initialized:
          // Check if local cache has items that the server does not have
          let localItems: T[] = [];
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) localItems = parsed;
            }
          } catch (_) {}

          const getItemKey = (i: any) => i?.id || i?.sphNumber || i?.workOrderNumber || i?.noLabel || i?.no_label;
          
          // Identify any local items created on this device that are not yet on the server
          const localOnlyItems = localItems.filter(loc => {
            const lk = getItemKey(loc);
            if (!lk) return false;
            return !serverItems.some(srv => getItemKey(srv) === lk);
          });

          if (localOnlyItems.length > 0) {
            // Local device has items that server doesn't have yet -> MERGE them together so no device loses input
            console.log(`[useSupabaseData] Auto-merging ${localOnlyItems.length} local items with ${serverItems.length} server items for ${collectionName}...`);
            const merged = [...serverItems, ...localOnlyItems];
            if (isMounted) {
              updateCache(merged);
              setLoading(false);
            }
            await saveToSupabase(merged);
          } else {
            // Server has authentic data -> Server is the single source of truth across all devices
            if (isMounted) {
              updateCache(serverItems);
              setLoading(false);
            }
          }
          return;
        }

        // If not found in database yet, check if initialized locally
        const isInited = localStorage.getItem(initKey) === 'true';
        if (!isInited && initialFallbackRef.current.length > 0) {
          if (isMounted) {
            updateCache(initialFallbackRef.current);
          }
          await saveToSupabase(initialFallbackRef.current);
        }
      } catch (err) {
        console.warn(`[useSupabaseData] Error loading ${collectionName}:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Debounced loader to prevent thundering herd
    const debouncedLoadData = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) {
          loadData();
        }
      }, 150);
    };

    // Initial data fetch
    loadData();

    // 3. Supabase Realtime Channel Subscription
    // Subscribes directly to Postgres table changes on 'app_collections' AND 'labels'
    const channelName = `realtime_coll_${collectionName}_${Math.random().toString(36).substring(2, 6)}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_collections'
        },
        (payload: any) => {
          const row = (payload.new || payload.old) as any;
          if (row && row.collection_name === collectionName) {
            console.log(`[useSupabaseData] Realtime postgres_changes on app_collections for ${collectionName}`);
            if (Array.isArray(row.data)) {
              if (isMounted) {
                updateCache(row.data);
                setLoading(false);
              }
            } else {
              debouncedLoadData();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labels'
        },
        (payload: any) => {
          const row = (payload.new || payload.old) as any;
          if (
            row &&
            (row.pdf_source === collectionName ||
             row.no_label === `__aset_coll_${collectionName}` ||
             (typeof row.no_label === 'string' && (
               row.no_label.startsWith(`__item_${collectionName}_`) ||
               row.no_label.includes(`_${collectionName}_`) ||
               row.no_label.endsWith(`_${collectionName}`)
             )))
          ) {
            debouncedLoadData();
          }
        }
      )
      .on(
        'broadcast',
        { event: `sync_${collectionName}` },
        (msg: any) => {
          if (msg?.payload?.senderId !== clientIdRef.current) {
            console.log(`[useSupabaseData] Broadcast received on ${collectionName} from other device`);
            debouncedLoadData();
          }
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        }
      });

    // Fallback polling every 5 seconds to ensure absolute consistency
    const pollInterval = setInterval(() => {
      loadData();
    }, 5000);

    // Sync immediately when user switches back to this tab/window (mobile app switch / tab switch)
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
      channelRef.current = null;
    };
  }, [collectionName, updateCache, initKey, fetchDirectFromSupabase, saveToSupabase]);

  // Add an item
  const add = async (item: T) => {
    const current = dataRef.current;
    const targetId = item.id || (item as any).noLabel || (item as any).sphNumber;
    const next = [item, ...current.filter(i => {
      const curId = i.id || (i as any).noLabel || (i as any).sphNumber;
      return curId !== targetId;
    })];
    updateCache(next);
    await saveToSupabase(next);
  };

  // Update an item
  const update = async (item: T) => {
    const current = dataRef.current;
    const targetId = item.id || (item as any).noLabel || (item as any).sphNumber;
    const next = current.map(i => {
      const curId = i.id || (i as any).noLabel || (i as any).sphNumber;
      return curId === targetId ? item : i;
    });
    updateCache(next);
    await saveToSupabase(next);
  };

  // Remove an item
  const remove = async (id: string) => {
    console.log(`[useSupabaseData] Deleting item ${id} from ${collectionName}`);
    const current = dataRef.current;
    const next = current.filter(i => {
      const itemKey = i.id || (i as any).noLabel || (i as any).no_label || (i as any).sphNumber || (i as any).workOrderNumber;
      return itemKey !== id;
    });
    
    updateCache(next);
    await saveToSupabase(next);
  };

  // Clear all items in collection
  const clearAll = async () => {
    console.log(`[useSupabaseData] Clearing all items from ${collectionName}`);
    updateCache([]);
    await saveToSupabase([]);
  };

  // Force push all data currently in memory/localStorage to Supabase
  const forceSyncToSupabase = useCallback(async () => {
    try {
      const current = dataRef.current;
      if (Array.isArray(current)) {
        console.log(`[useSupabaseData] Force-pushing ${current.length} items to Supabase for ${collectionName}...`);
        await saveToSupabase(current);
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[useSupabaseData] forceSync error on ${collectionName}:`, e);
      return false;
    }
  }, [collectionName, saveToSupabase]);

  // Force pull latest data directly from Supabase server (overwrites any local state)
  const forcePullFromSupabase = useCallback(async () => {
    try {
      setLoading(true);
      const serverItems = await fetchDirectFromSupabase();
      if (serverItems !== null) {
        updateCache(serverItems);
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (e) {
      console.warn(`[useSupabaseData] forcePull error on ${collectionName}:`, e);
      setLoading(false);
      return false;
    }
  }, [fetchDirectFromSupabase, updateCache]);

  return { 
    data, 
    add, 
    update, 
    remove, 
    clearAll, 
    forceSyncToSupabase, 
    forcePullFromSupabase,
    setData: updateCache, 
    loading, 
    isRealtimeConnected 
  };
}
