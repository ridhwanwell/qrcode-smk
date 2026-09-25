import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const getCollectionItemKey = (i: any): string => {
  return String(i?.id || i?.sphNumber || i?.workOrderNumber || i?.noLabel || i?.no_label || '').trim();
};

const getPersistedDeletedIds = (key: string, collName: string): Set<string> => {
  const set = new Set<string>();
  // Pre-seed known explicitly deleted schedule IDs requested by user
  if (collName === 'schedules') {
    set.add('SCH-007241');
    set.add('SCH-594702');
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(id => set.add(String(id).trim()));
      }
    }
  } catch (_) {}
  return set;
};

const persistDeletedId = (key: string, collName: string, id: string) => {
  try {
    const set = getPersistedDeletedIds(key, collName);
    set.add(String(id).trim());
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (_) {}
};

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
  const deletedKey = `smk_deleted_${collectionName}`;

  // Unique client instance ID to identify broadcast origin and avoid redundant self-refetches
  const clientIdRef = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. Instant load from local cache or initialFallback with strict tombstone filtering
  const [data, setData] = useState<T[]>(() => {
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
    const filterDeleted = (items: T[]) => items.filter(it => !deletedSet.has(getCollectionItemKey(it)));
    try {
      const isInited = localStorage.getItem(initKey) === 'true';
      const cached = localStorage.getItem(storageKey);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleaned = filterDeleted(parsed as T[]);
          // If already initialized, respect whatever is cached
          if (isInited || cleaned.length > 0) {
            return cleaned;
          }
        }
      }
    } catch (_) {}
    return filterDeleted(initialFallback);
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const { user } = useAuth();
  const dataRef = useRef<T[]>(data);
  dataRef.current = data;

  const updateCache = useCallback((nextItems: T[]) => {
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
    const cleanItems = nextItems.filter(it => !deletedSet.has(getCollectionItemKey(it)));
    setData(cleanItems);
    dataRef.current = cleanItems;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cleanItems));
      localStorage.setItem(initKey, 'true');
    } catch (_) {}
  }, [storageKey, initKey, deletedKey, collectionName]);

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
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
    // 1. First priority: Direct Supabase client query
    try {
      const { data: supaRow, error } = await supabase
        .from('app_collections')
        .select('data')
        .eq('collection_name', collectionName)
        .maybeSingle();

      if (!error && supaRow && Array.isArray(supaRow.data)) {
        return (supaRow.data as T[]).filter(it => !deletedSet.has(getCollectionItemKey(it)));
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
          return (json.items as T[]).filter(it => !deletedSet.has(getCollectionItemKey(it)));
        }
      }
    } catch (e) {
      console.warn(`[useSupabaseData] API proxy fetch failed for ${collectionName}:`, e);
    }

    return null;
  }, [collectionName, deletedKey]);

  // Direct write to Supabase (Writes to both direct Supabase cloud table AND backend proxy)
  const saveToSupabase = useCallback(async (items: T[]) => {
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
    const cleanItems = items.filter(it => !deletedSet.has(getCollectionItemKey(it)));

    // 1. Direct Supabase Cloud Table Upsert
    try {
      await supabase.from('app_collections').upsert({
        collection_name: collectionName,
        data: cleanItems,
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
        body: JSON.stringify({ items: cleanItems, replaceAll: true })
      });
    } catch (e) {
      console.warn(`[useSupabaseData] API Proxy save error on ${collectionName}:`, e);
    }

    // 3. Realtime Broadcast
    broadcastSync();
  }, [collectionName, broadcastSync, deletedKey]);

  // 2. Fetch from Supabase and set up Supabase Realtime channel
  useEffect(() => {
    let isMounted = true;
    let debounceTimer: any = null;

    const loadData = async () => {
      try {
        const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
        const serverItems = await fetchDirectFromSupabase();

        if (serverItems !== null) {
          // Server is the authoritative single source of truth across all devices.
          // Filter out any permanently deleted IDs and strictly update local cache.
          const cleanServerItems = serverItems.filter(it => !deletedSet.has(getCollectionItemKey(it)));
          if (isMounted) {
            updateCache(cleanServerItems);
            setLoading(false);
          }
          return;
        }

        // If not found in database yet, check if initialized locally
        const isInited = localStorage.getItem(initKey) === 'true';
        if (!isInited && initialFallbackRef.current.length > 0) {
          const cleanFallback = initialFallbackRef.current.filter(it => !deletedSet.has(getCollectionItemKey(it)));
          if (isMounted) {
            updateCache(cleanFallback);
          }
          await saveToSupabase(cleanFallback);
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
              const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
              const cleanData = row.data.filter((it: any) => !deletedSet.has(getCollectionItemKey(it)));
              if (isMounted) {
                updateCache(cleanData);
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
      .on(
        'broadcast',
        { event: `deleted_${collectionName}` },
        (msg: any) => {
          const delId = msg?.payload?.deletedId;
          if (delId) {
            console.log(`[useSupabaseData] Broadcast delete received for ${delId} in ${collectionName}`);
            persistDeletedId(deletedKey, collectionName, delId);
            const current = dataRef.current;
            const next = current.filter(i => getCollectionItemKey(i) !== delId);
            if (isMounted) {
              updateCache(next);
            }
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
  }, [collectionName, updateCache, initKey, fetchDirectFromSupabase, saveToSupabase, deletedKey]);

  // Add an item
  const add = async (item: T) => {
    const current = dataRef.current;
    const targetId = getCollectionItemKey(item);
    const next = [item, ...current.filter(i => getCollectionItemKey(i) !== targetId)];
    updateCache(next);
    await saveToSupabase(next);
  };

  // Update an item
  const update = async (item: T) => {
    const current = dataRef.current;
    const targetId = getCollectionItemKey(item);
    const next = current.map(i => {
      return getCollectionItemKey(i) === targetId ? item : i;
    });
    updateCache(next);
    await saveToSupabase(next);
  };

  // Remove an item permanently with tombstone persistence and server purge
  const remove = async (id: string) => {
    console.log(`[useSupabaseData] Permanently deleting item ${id} from ${collectionName}`);
    // 1. Record tombstone locally immediately so it can never be resurrected
    persistDeletedId(deletedKey, collectionName, id);
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);

    const current = dataRef.current;
    const next = current.filter(i => {
      const itemKey = getCollectionItemKey(i);
      return itemKey !== id && !deletedSet.has(itemKey);
    });
    
    updateCache(next);

    // 2. Call backend DELETE API proxy to remove from both labels and app_collections table
    try {
      await fetch(`/api/collections/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn(`[useSupabaseData] Server DELETE API proxy error for ${id} in ${collectionName}:`, e);
    }

    // 3. Direct Supabase cloud table upsert
    try {
      await supabase.from('app_collections').upsert({
        collection_name: collectionName,
        data: next,
        updated_at: new Date().toISOString()
      }, { onConflict: 'collection_name' });
    } catch (e) {
      console.warn(`[useSupabaseData] Direct Supabase upsert error on delete in ${collectionName}:`, e);
    }

    // 4. Broadcast permanent deletion to all open tabs and connected devices
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: `deleted_${collectionName}`,
          payload: {
            deletedId: id,
            senderId: clientIdRef.current,
            timestamp: Date.now()
          }
        });
      }
    } catch (_) {}

    broadcastSync();
  };

  // Clear all items in collection
  const clearAll = async () => {
    console.log(`[useSupabaseData] Clearing all items from ${collectionName}`);
    // Record all current items as deleted
    dataRef.current.forEach(i => {
      const key = getCollectionItemKey(i);
      if (key) persistDeletedId(deletedKey, collectionName, key);
    });

    updateCache([]);

    try {
      await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'DELETE'
      });
    } catch (_) {}

    try {
      await supabase.from('app_collections').upsert({
        collection_name: collectionName,
        data: [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'collection_name' });
    } catch (_) {}

    broadcastSync();
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
