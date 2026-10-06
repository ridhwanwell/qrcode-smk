import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { apiFetch } from './apiClient';
import { enqueueOfflineItem, subscribePendingCount, flushOfflineQueue, getPendingEntries } from './offlineQueue';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * ATURAN DATA (versi Oktober 2026 — database ditata ulang):
 * 1. SERVER (Supabase) adalah satu-satunya sumber kebenaran. Data dari server SELALU
 *    ditampilkan apa adanya di semua perangkat.
 * 2. Tidak ada lagi "daftar hapus" yang disimpan permanen di browser. Hapus dicatat di server.
 * 3. Browser hanya menyimpan:
 *    - salinan terakhir dari server (cache) agar tetap bisa dibuka saat internet RS putus;
 *    - antrean perubahan yang belum terkirim (IndexedDB, lihat offlineQueue.ts).
 *    Perubahan yang masih di antrean tetap ditampilkan di atas data server sampai terkirim.
 */

const getCollectionItemKey = (i: any): string => {
  return String(i?.id || i?.sphNumber || i?.workOrderNumber || i?.bapNumber || i?.noLabel || i?.no_label || '').trim();
};

const newIdempotencyKey = (prefix: string) =>
  typeof crypto !== 'undefined' && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/** Tumpuk perubahan yang belum terkirim (antrean offline) di atas data server. */
async function applyPendingChanges<T>(collectionName: string, serverItems: T[]): Promise<T[]> {
  let pending: Awaited<ReturnType<typeof getPendingEntries>> = [];
  try {
    pending = await getPendingEntries(collectionName);
  } catch (_) {
    return serverItems;
  }
  if (pending.length === 0) return serverItems;

  const map = new Map<string, T>();
  const order: string[] = [];
  serverItems.forEach(it => {
    const k = getCollectionItemKey(it);
    if (!map.has(k)) order.push(k);
    map.set(k, it);
  });

  for (const entry of pending) {
    if (entry.action === 'delete') {
      const delId = String(entry.item?.id || entry.item || '').trim();
      map.delete(delId);
    } else if (entry.item) {
      const k = getCollectionItemKey(entry.item);
      if (!k) continue;
      if (!map.has(k)) order.unshift(k);
      map.set(k, entry.item as T);
    }
  }
  return order.filter(k => map.has(k)).map(k => map.get(k) as T);
}

/**
 * Hook universal untuk data portal aset (jadwal, SPH, BAP, kalibrator, RS, teknisi, dll).
 * Nama fungsi & isi yang dikembalikan sama seperti versi lama agar komponen lain tidak perlu diubah.
 */
export function useSupabaseData<T extends { id: string }>(
  collectionName: string,
  // Parameter lama (data contoh). Sengaja TIDAK dipakai lagi agar data contoh tidak pernah
  // muncul atau terkirim ulang ke server.
  _initialFallback: T[] = []
) {
  const storageKey = `smk_supa_${collectionName}`;

  const clientIdRef = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. Tampilkan cache terakhir dari server dulu (cepat, tetap jalan saat offline)
  const [data, setData] = useState<T[]>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch (_) {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const dataRef = useRef<T[]>(data);
  dataRef.current = data;

  useEffect(() => {
    const unsubscribe = subscribePendingCount(setPendingSyncCount);
    return () => {
      unsubscribe();
    };
  }, []);

  // Tampilkan di layar (tanpa menyimpan ke cache)
  const showItems = useCallback((nextItems: T[]) => {
    setData(nextItems);
    dataRef.current = nextItems;
  }, []);

  // Simpan salinan data SERVER ke cache browser
  const saveServerCache = useCallback((serverItems: T[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(serverItems));
    } catch (_) {}
  }, [storageKey]);

  const broadcastSync = useCallback(() => {
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: `sync_${collectionName}`,
        payload: { senderId: clientIdRef.current, timestamp: Date.now() }
      });
    } catch (e) {
      console.warn(`[useSupabaseData] Broadcast error on ${collectionName}:`, e);
    }
  }, [collectionName]);

  // Ambil data dari server. null = gagal (internet putus / server error)
  const fetchFromServer = useCallback(async (): Promise<T[] | null> => {
    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.items)) {
          return json.items as T[];
        }
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Gagal mengambil ${collectionName} dari server:`, e);
    }
    return null;
  }, [collectionName]);

  // Terima data server -> simpan cache -> tampilkan (plus perubahan yang belum terkirim)
  const acceptServerItems = useCallback(async (serverItems: T[]) => {
    saveServerCache(serverItems);
    const merged = await applyPendingChanges(collectionName, serverItems);
    showItems(merged);
  }, [collectionName, saveServerCache, showItems]);

  const handleConflictWarning = useCallback((conflicts: any[]) => {
    console.warn(`[useSupabaseData] Konflik versi pada ${collectionName}:`, conflicts);
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

  const forcePullFromSupabase = useCallback(async () => {
    try {
      setLoading(true);
      const serverItems = await fetchFromServer();
      if (serverItems !== null) {
        await acceptServerItems(serverItems);
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[useSupabaseData] forcePull error on ${collectionName}:`, e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchFromServer, acceptServerItems, collectionName]);

  // 2. Muat dari server + dengarkan perubahan dari perangkat lain
  useEffect(() => {
    let isMounted = true;
    let debounceTimer: any = null;

    const loadData = async () => {
      try {
        const serverItems = await fetchFromServer();
        if (serverItems !== null && isMounted) {
          await acceptServerItems(serverItems);
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
        if (isMounted) loadData();
      }, 300);
    };

    loadData();

    const channel = supabase.channel(`broadcast_channel_${collectionName}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: `sync_${collectionName}` }, (msg: any) => {
        if (msg?.payload?.senderId !== clientIdRef.current) debouncedLoadData();
      })
      .on('broadcast', { event: `deleted_${collectionName}` }, (msg: any) => {
        if (msg?.payload?.senderId !== clientIdRef.current) debouncedLoadData();
      })
      .subscribe((status) => {
        if (isMounted) setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    const handleFocus = () => {
      if (document.visibilityState === 'visible') debouncedLoadData();
    };
    const handleOnline = () => debouncedLoadData();
    const handleFlushed = (ev: any) => {
      const cols: string[] = ev?.detail?.collections || [];
      if (cols.includes(collectionName)) debouncedLoadData();
    };
    const handleExternalSync = (ev: any) => {
      if (!ev?.detail?.collection || ev.detail.collection === collectionName) debouncedLoadData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('smk_offline_flushed', handleFlushed);
    window.addEventListener('supabase_collection_sync', handleExternalSync);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('smk_offline_flushed', handleFlushed);
      window.removeEventListener('supabase_collection_sync', handleExternalSync);
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
      channelRef.current = null;
    };
  }, [collectionName, fetchFromServer, acceptServerItems]);

  // Kirim satu item ke server. Jika gagal karena jaringan -> masuk antrean offline.
  const sendItem = useCallback(async (itemToSend: any) => {
    const idempotencyKey = newIdempotencyKey('idem_save');
    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ items: [itemToSend] })
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (Array.isArray(json?.conflicts) && json.conflicts.length > 0) {
          handleConflictWarning(json.conflicts);
          await forcePullFromSupabase();
        } else if (Array.isArray(json?.rejected) && json.rejected.length > 0) {
          window.dispatchEvent(new CustomEvent('app_data_conflict', {
            detail: { collection: collectionName, conflicts: json.rejected, message: json.rejected[0]?.reason || 'Perubahan ditolak server' }
          }));
          await forcePullFromSupabase();
        } else if (Array.isArray(json?.items)) {
          await acceptServerItems(json.items);
        } else {
          await forcePullFromSupabase();
        }
      } else if (res.status === 400 || res.status === 403) {
        // Ditolak permanen (izin / format). Jangan diantrekan, tampilkan lagi data server.
        const json = await res.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent('app_data_conflict', {
          detail: { collection: collectionName, conflicts: [], message: json?.error || 'Perubahan ditolak server' }
        }));
        await forcePullFromSupabase();
      } else {
        await enqueueOfflineItem(collectionName, itemToSend, idempotencyKey, 'upsert');
      }
    } catch (e) {
      await enqueueOfflineItem(collectionName, itemToSend, idempotencyKey, 'upsert');
    }
    broadcastSync();
  }, [collectionName, handleConflictWarning, forcePullFromSupabase, acceptServerItems, broadcastSync]);

  // Tambah item baru (bila id sudah ada, diperlakukan sebagai ubah)
  const add = async (item: T) => {
    const itemKey = getCollectionItemKey(item);
    const existing = dataRef.current.find(i => getCollectionItemKey(i) === itemKey) as any;
    const itemToSend: any = { ...item };
    if (existing?.updatedAt) itemToSend.baseUpdatedAt = existing.updatedAt;

    showItems([itemToSend as T, ...dataRef.current.filter(i => getCollectionItemKey(i) !== itemKey)]);
    await sendItem(itemToSend);
  };

  // Ubah item. baseUpdatedAt = updatedAt terakhir yang diterima DARI SERVER (deteksi konflik)
  const update = async (item: T) => {
    const targetId = getCollectionItemKey(item);
    const existing = dataRef.current.find(i => getCollectionItemKey(i) === targetId) as any;
    const baseUpdatedAt = (item as any).baseUpdatedAt || existing?.updatedAt || (item as any).updatedAt || undefined;
    const itemToSend: any = { ...item, baseUpdatedAt };

    showItems(dataRef.current.map(i => (getCollectionItemKey(i) === targetId ? (itemToSend as T) : i)));
    await sendItem(itemToSend);
  };

  // Hapus item: dicatat di SERVER, sehingga hilang di semua perangkat
  const remove = async (id: string) => {
    const delId = String(id).trim();
    showItems(dataRef.current.filter(i => getCollectionItemKey(i) !== delId));

    const idempotencyKey = newIdempotencyKey('idem_del');
    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}/${encodeURIComponent(delId)}`, {
        method: 'DELETE',
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      if (res.ok || res.status === 404) {
        await forcePullFromSupabase();
      } else if (res.status === 400 || res.status === 403) {
        const json = await res.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent('app_data_conflict', {
          detail: { collection: collectionName, conflicts: [], message: json?.error || 'Penghapusan ditolak server' }
        }));
        await forcePullFromSupabase();
      } else {
        await enqueueOfflineItem(collectionName, { id: delId }, idempotencyKey, 'delete');
      }
    } catch (e) {
      await enqueueOfflineItem(collectionName, { id: delId }, idempotencyKey, 'delete');
    }

    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: `deleted_${collectionName}`,
        payload: { deletedId: delId, senderId: clientIdRef.current, timestamp: Date.now() }
      });
    } catch (_) {}
    broadcastSync();
  };

  // Kosongkan seluruh koleksi (server hanya mengizinkan admin_utama)
  const clearAll = async () => {
    try {
      const res = await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent('app_data_conflict', {
          detail: { collection: collectionName, conflicts: [], message: json?.error || 'Gagal mengosongkan data' }
        }));
      }
    } catch (_) {}
    await forcePullFromSupabase();
    broadcastSync();
  };

  // "Kirim ulang data perangkat ke server" — AMAN: hanya menambah item yang belum ada di server.
  // Item yang sudah ada di server tidak ditimpa (server menolak sebagai konflik versi),
  // dan item yang sudah dihapus di server tidak akan hidup lagi.
  const forceSyncToSupabase = useCallback(async () => {
    try {
      await flushOfflineQueue();
      const serverItems = await fetchFromServer();
      if (serverItems === null) return false;
      const serverKeys = new Set(serverItems.map(getCollectionItemKey));
      const missing = dataRef.current.filter(it => {
        const k = getCollectionItemKey(it);
        return k && !serverKeys.has(k);
      });
      if (missing.length > 0) {
        for (let i = 0; i < missing.length; i += 200) {
          const chunk = missing.slice(i, i + 200).map((it: any) => {
            const copy = { ...it };
            delete copy.baseUpdatedAt;
            return copy;
          });
          await apiFetch(`/api/collections/${encodeURIComponent(collectionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': newIdempotencyKey('idem_sync') },
            body: JSON.stringify({ items: chunk })
          });
        }
      }
      await forcePullFromSupabase();
      broadcastSync();
      return true;
    } catch (e) {
      console.warn(`[useSupabaseData] forceSync error on ${collectionName}:`, e);
      return false;
    }
  }, [collectionName, broadcastSync, forcePullFromSupabase, fetchFromServer]);

  return {
    data,
    add,
    update,
    remove,
    clearAll,
    forceSyncToSupabase,
    forcePullFromSupabase,
    setData: showItems,
    loading,
    isRealtimeConnected,
    pendingSyncCount
  };
}
