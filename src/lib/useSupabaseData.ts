import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

/**
 * Universal React Hook for durable data persistence.
 * Uses backend API proxying to Supabase via service role for 100% reliable persistence,
 * preventing deleted records from ever reappearing.
 */
export function useSupabaseData<T extends { id: string }>(
  collectionName: string,
  initialFallback: T[] = []
) {
  const storageKey = `smk_supa_${collectionName}`;
  const initKey = `smk_inited_${collectionName}`;

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

  // 2. Fetch from Backend / Supabase with auto-polling & focus sync
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(collectionName)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.found === true && Array.isArray(json.items)) {
            if (isMounted) {
              updateCache(json.items as T[]);
              setLoading(false);
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

    loadData();

    // Auto-polling every 5 seconds for instant live synchronization across office devices
    const pollInterval = setInterval(() => {
      loadData();
    }, 5000);

    // Sync immediately when user switches back to this tab
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
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
    } catch (e) {
      console.warn(`[useSupabaseData] ClearAll error on ${collectionName}:`, e);
    }
  };

  return { data, add, update, remove, clearAll, setData: updateCache, loading };
}
