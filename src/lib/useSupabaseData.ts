import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Universal React Hook for durable data persistence and live Realtime cross-device sync.
 * Uses supabase.channel to automatically synchronize data between connected clients in real-time
 * without needing manual page reloads, combined with backend API persistence to Supabase.
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
          // If already initialized, respect whatever is cached (including empty array [])
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

  // 2. Fetch from Backend / Supabase and set up Supabase Realtime channel
  useEffect(() => {
    let isMounted = true;
    let debounceTimer: any = null;

    const loadData = async () => {
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(collectionName)}?_t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.found === true && Array.isArray(json.items)) {
            const serverItems = json.items as T[];
            
            // Check if local cache has items that the server does not have (e.g. entered on laptop)
            let localItems: T[] = [];
            try {
              const raw = localStorage.getItem(storageKey);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) localItems = parsed;
              }
            } catch (_) {}

            const getItemKey = (i: any) => i?.id || i?.sphNumber || i?.workOrderNumber || i?.noLabel || i?.no_label;
            
            const localOnlyItems = localItems.filter(loc => {
              const lk = getItemKey(loc);
              return lk && !serverItems.some(srv => getItemKey(srv) === lk);
            });

            if (localOnlyItems.length > 0) {
              console.log(`[useSupabaseData] Auto-syncing ${localOnlyItems.length} laptop-local items to Supabase for ${collectionName}...`);
              const merged = [...serverItems, ...localOnlyItems];
              if (isMounted) {
                updateCache(merged);
                setLoading(false);
              }
              // Push laptop-exclusive items up to Supabase so other devices receive them
              await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: localOnlyItems })
              });
              broadcastSync();
            } else {
              if (isMounted) {
                updateCache(serverItems);
                setLoading(false);
              }
            }
            return;
          }
        }

        // If not found in database yet, check if initialized locally
        const isInited = localStorage.getItem(initKey) === 'true';
        if (!isInited && initialFallbackRef.current.length > 0) {
          if (isMounted) {
            updateCache(initialFallbackRef.current);
          }
          fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: initialFallbackRef.current, replaceAll: true })
          }).catch(() => {});
        }
      } catch (err) {
        console.warn(`[useSupabaseData] Error loading ${collectionName}:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Debounced loader to prevent thundering herd when multiple events arrive simultaneously
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
    // Subscribes to Postgres table changes (INSERT/UPDATE/DELETE on labels)
    // and Realtime Broadcast messages across clients
    const channelName = `realtime_coll_${collectionName}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labels'
        },
        (payload: any) => {
          const row = (payload.new || payload.old) as any;
          // Check if changed row belongs to this collection
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
          // If update came from another device/tab, reload immediately without page reload
          if (msg?.payload?.senderId !== clientIdRef.current) {
            debouncedLoadData();
          }
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        }
      });

    // Fallback polling every 5 seconds to ensure absolute consistency even during network transitions
    const pollInterval = setInterval(() => {
      loadData();
    }, 5000);

    // Sync immediately when user switches back to this tab/window
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
  }, [collectionName, updateCache, initKey]);

  // Add an item
  const add = async (item: T) => {
    const current = dataRef.current;
    const next = [item, ...current.filter(i => {
      const curId = i.id || (i as any).noLabel || (i as any).sphNumber;
      const targetId = item.id || (item as any).noLabel || (item as any).sphNumber;
      return curId !== targetId;
    })];
    updateCache(next);

    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.items && Array.isArray(json.items)) {
          updateCache(json.items as T[]);
        }
        broadcastSync();
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Add error on ${collectionName}:`, e);
    }
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

    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.items && Array.isArray(json.items)) {
          updateCache(json.items as T[]);
        }
        broadcastSync();
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Update error on ${collectionName}:`, e);
    }
  };

  // Remove an item
  const remove = async (id: string) => {
    console.log(`[useSupabaseData] Deleting item ${id} from ${collectionName}`);
    const current = dataRef.current;
    const next = current.filter(i => {
      const itemKey = i.id || (i as any).noLabel || (i as any).no_label || (i as any).sphNumber || (i as any).workOrderNumber;
      return itemKey !== id;
    });
    
    // Update local state and cache immediately
    updateCache(next);

    try {
      // Direct deletion endpoint
      await fetch(`/api/collections/${encodeURIComponent(collectionName)}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      // Synchronize exact state to prevent any stale reads
      await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next })
      });
      broadcastSync();
    } catch (e) {
      console.warn(`[useSupabaseData] Delete error on ${collectionName}:`, e);
    }
  };

  // Clear all items in collection
  const clearAll = async () => {
    console.log(`[useSupabaseData] Clearing all items from ${collectionName}`);
    updateCache([]);

    try {
      await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'DELETE'
      });
      broadcastSync();
    } catch (e) {
      console.warn(`[useSupabaseData] ClearAll error on ${collectionName}:`, e);
    }
  };

  // Force push all data currently in memory/localStorage to Supabase
  const forceSyncToSupabase = useCallback(async () => {
    try {
      const current = dataRef.current;
      if (Array.isArray(current) && current.length > 0) {
        console.log(`[useSupabaseData] Force-pushing ${current.length} items to Supabase for ${collectionName}...`);
        await fetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: current, replaceAll: true })
        });
        broadcastSync();
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[useSupabaseData] forceSync error on ${collectionName}:`, e);
      return false;
    }
  }, [collectionName, broadcastSync]);

  return { data, add, update, remove, clearAll, forceSyncToSupabase, setData: updateCache, loading, isRealtimeConnected };
}
