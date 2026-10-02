import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { apiFetch } from './apiClient';
import { enqueueOfflineItem, subscribePendingCount, flushOfflineQueue } from './offlineQueue';
import type { RealtimeChannel } from '@supabase/supabase-js';

const getCollectionItemKey = (i: any): string => {
  return String(i?.id || i?.sphNumber || i?.workOrderNumber || i?.bapNumber || i?.noLabel || i?.no_label || '').trim();
};

const getPersistedDeletedIds = (key: string, collName: string): Set<string> => {
  const set = new Set<string>();
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
 * Strictly uses secure backend API (apiFetch) with token authentication, offline IndexedDB queue,
 * version conflict detection, and WebSocket Broadcast channels.
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
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const dataRef = useRef<T[]>(data);
  dataRef.current = data;

  // Listen to pending offline queue count
  useEffect(() => {
    const unsubscribe = subscribePendingCount(setPendingSyncCount);
    return () => {
      unsubscribe();
    };
  }, []);

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

  // Broadcast function to notify all other clients instantly via Supabase WebSocket Broadcast
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

  // Fetch from backend API proxy
  const fetchFromServer = useCallback(async (): Promise<T[] | null> => {
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}?_t=${Date.now()}`);
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

  // Conflict notification helper
  const handleConflictWarning = useCallback((conflicts: any[]) => {
    console.warn(`[useSupabaseData] Terdeteksi konflik versi pada koleksi ${collectionName}:`, conflicts);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app_data_conflict', {
          detail: {
            collection: collectionName,
            conflicts,
            message: `Data ${collectionName} telah diperbarui oleh pengguna lain di server. Memuat versi terbaru...`
          }
        })
      );
    }
  }, [collectionName]);

  // 2. Fetch from Backend API and set up Supabase Realtime Broadcast Channel
  useEffect(() => {
    let isMounted = true;
    let debounceTimer: any = null;

    const loadData = async () => {
      try {
        const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);
        const serverItems = await fetchFromServer();

        if (serverItems !== null) {
          const cleanServerItems = serverItems.filter(it => !deletedSet.has(getCollectionItemKey(it)));
          if (isMounted) {
            updateCache(cleanServerItems);
            setLoading(false);
          }
          return;
        }

        // If not found on server yet, initialize fallback
        const isInited = localStorage.getItem(initKey) === 'true';
        if (!isInited && initialFallbackRef.current.length > 0) {
          const cleanFallback = initialFallbackRef.current.filter(it => !deletedSet.has(getCollectionItemKey(it)));
          if (isMounted) {
            updateCache(cleanFallback);
          }
        }
      } catch (err) {
        console.warn(`[useSupabaseData] Error loading ${collectionName}:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const debouncedLoadData = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) {
          loadData();
        }
      }, 200);
    };

    // Initial data fetch
    loadData();

    // 3. Supabase Realtime Broadcast Channel Subscription (No direct postgres_changes)
    const channelName = `broadcast_channel_${collectionName}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'broadcast',
        { event: `sync_${collectionName}` },
        (msg: any) => {
          if (msg?.payload?.senderId !== clientIdRef.current) {
            console.log(`[useSupabaseData] Realtime broadcast received on ${collectionName}`);
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

    // Sync when user switches back to tab
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
      channelRef.current = null;
    };
  }, [collectionName, updateCache, initKey, fetchFromServer, deletedKey]);

  // Add an item (Sends new item, server assigns official updatedAt)
  const add = async (item: T) => {
    const itemKey = getCollectionItemKey(item);
    const itemToSend: any = { ...item };

    const current = dataRef.current;
    const next = [itemToSend as T, ...current.filter(i => getCollectionItemKey(i) !== itemKey)];
    updateCache(next);

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem_add_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          items: [itemToSend],
          replaceAll: false
        })
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && Array.isArray(json.conflicts) && json.conflicts.length > 0) {
          handleConflictWarning(json.conflicts);
          await forcePullFromSupabase();
        } else if (json && Array.isArray(json.items)) {
          updateCache(json.items);
        }
      } else {
        // Enqueue to IndexedDB for offline retry
        await enqueueOfflineItem(collectionName, itemToSend, idempotencyKey, 'upsert');
      }
    } catch (e) {
      await enqueueOfflineItem(collectionName, itemToSend, idempotencyKey, 'upsert');
    }

    broadcastSync();
  };

  // Update an item (Sends item with baseUpdatedAt = server updatedAt timestamp, queues in IndexedDB if offline)
  const update = async (item: T) => {
    const current = dataRef.current;
    const targetId = getCollectionItemKey(item);
    const existing = current.find(i => getCollectionItemKey(i) === targetId);

    // baseUpdatedAt = nilai updatedAt item yang terakhir diterima DARI SERVER
    const baseUpdatedAt = (item as any).baseUpdatedAt || (item as any).updatedAt || (existing as any)?.updatedAt || undefined;
    const itemToSend: any = {
      ...item,
      baseUpdatedAt
    };

    const next = current.map(i => {
      return getCollectionItemKey(i) === targetId ? (itemToSend as T) : i;
    });
    updateCache(next);

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem_upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          items: [itemToSend],
          replaceAll: false
        })
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && Array.isArray(json.conflicts) && json.conflicts.length > 0) {
          handleConflictWarning(json.conflicts);
          await forcePullFromSupabase();
        } else if (json && Array.isArray(json.items)) {
          updateCache(json.items);
        }
      } else {
        // Enqueue to IndexedDB for offline retry
        await enqueueOfflineItem(collectionName, itemToSend, idempotencyKey, 'upsert');
      }
    } catch (e) {
      await enqueueOfflineItem(collectionName, itemToSend, idempotencyKey, 'upsert');
    }

    broadcastSync();
  };

  // Remove an item permanently with tombstone persistence and server purge
  const remove = async (id: string) => {
    persistDeletedId(deletedKey, collectionName, id);
    const deletedSet = getPersistedDeletedIds(deletedKey, collectionName);

    const current = dataRef.current;
    const next = current.filter(i => {
      const itemKey = getCollectionItemKey(i);
      return itemKey !== id && !deletedSet.has(itemKey);
    });
    
    updateCache(next);

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });

      if (!res.ok && res.status !== 404) {
        await enqueueOfflineItem(collectionName, { id }, idempotencyKey, 'delete');
      }
    } catch (e) {
      await enqueueOfflineItem(collectionName, { id }, idempotencyKey, 'delete');
    }

    // Broadcast permanent deletion to all open tabs and connected devices
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
    dataRef.current.forEach(i => {
      const key = getCollectionItemKey(i);
      if (key) persistDeletedId(deletedKey, collectionName, key);
    });

    updateCache([]);

    try {
      await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'DELETE'
      });
    } catch (_) {}

    broadcastSync();
  };

  // Force push all data currently in memory/localStorage to Supabase
  const forceSyncToSupabase = useCallback(async () => {
    try {
      const current = dataRef.current;
      if (Array.isArray(current)) {
        await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: current, replaceAll: true })
        });
        await flushOfflineQueue();
        broadcastSync();
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[useSupabaseData] forceSync error on ${collectionName}:`, e);
      return false;
    }
  }, [collectionName, broadcastSync]);

  // Force pull latest data directly from Supabase server
  const forcePullFromSupabase = useCallback(async () => {
    try {
      setLoading(true);
      const serverItems = await fetchFromServer();
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
  }, [fetchFromServer, updateCache]);

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
    isRealtimeConnected,
    pendingSyncCount
  };
}
