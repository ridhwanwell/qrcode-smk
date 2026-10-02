import { apiFetch } from './apiClient';

export interface PendingQueueItem {
  id?: number;
  collection: string;
  item: any;
  action: 'upsert' | 'delete';
  idempotencyKey: string;
  timestamp: number;
}

const DB_NAME = 'smk_offline_store';
const DB_VERSION = 1;
const STORE_NAME = 'pending_queue';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung pada lingkungan ini'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('collection', 'collection', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Gagal membuka database antrean offline:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// Event emitter for pending queue count changes
const countListeners = new Set<(count: number) => void>();

function notifyCountListeners(count: number) {
  countListeners.forEach((listener) => {
    try {
      listener(count);
    } catch (_) {}
  });
}

export function subscribePendingCount(listener: (count: number) => void): () => void {
  countListeners.add(listener);
  getPendingCount().then(listener).catch(() => {});
  return () => {
    countListeners.delete(listener);
  };
}

/**
 * Memasukkan item perubahan ke dalam antrean IndexedDB jika gagal dikirim langsung.
 */
export async function enqueueOfflineItem(
  collection: string,
  item: any,
  idempotencyKey?: string,
  action: 'upsert' | 'delete' = 'upsert'
): Promise<number> {
  try {
    const db = await getDB();
    const finalKey = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const queueEntry: PendingQueueItem = {
        collection,
        item,
        action,
        idempotencyKey: finalKey,
        timestamp: Date.now()
      };

      const request = store.add(queueEntry);

      request.onsuccess = () => {
        const generatedId = request.result as number;
        getPendingCount().then(notifyCountListeners).catch(() => {});
        resolve(generatedId);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('[IndexedDB Enqueue Error]:', err);
    return -1;
  }
}

/**
 * Mengambil semua antrean yang menunggu sinkronisasi dari IndexedDB.
 */
export async function getPendingQueue(): Promise<PendingQueueItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB GetAll Warning]:', err);
    return [];
  }
}

/**
 * Menghapus item dari antrean setelah sukses disinkronkan ke server.
 */
export async function dequeueOfflineItem(id: number): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        getPendingCount().then(notifyCountListeners).catch(() => {});
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB Dequeue Warning]:', err);
  }
}

/**
 * Menghitung jumlah perubahan yang menunggu sinkronisasi ke server.
 */
export async function getPendingCount(collection?: string): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      if (collection) {
        const index = store.index('collection');
        const request = index.count(IDBKeyRange.only(collection));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  } catch (_) {
    return 0;
  }
}

let isFlushing = false;

/**
 * Mengirim ulang seluruh antrean offline ke server.
 * Dipanggil otomatis saat event 'online' dan setiap interval 30 detik.
 */
export async function flushOfflineQueue(
  onConflict?: (conflict: any, collection: string) => void
): Promise<{ successCount: number; errorCount: number; conflicts: any[] }> {
  if (isFlushing || typeof navigator !== 'undefined' && !navigator.onLine) {
    return { successCount: 0, errorCount: 0, conflicts: [] };
  }

  isFlushing = true;
  let successCount = 0;
  let errorCount = 0;
  const conflicts: any[] = [];

  try {
    const queue = await getPendingQueue();
    if (queue.length === 0) {
      isFlushing = false;
      return { successCount: 0, errorCount: 0, conflicts: [] };
    }

    console.info(`[OfflineQueue] Memproses ${queue.length} perubahan tertunda ke server...`);

    for (const entry of queue) {
      if (!entry.id) continue;

      try {
        if (entry.action === 'delete') {
          const itemId = entry.item?.id || entry.item;
          const res = await apiFetch(`/api/collections/${encodeURIComponent(entry.collection)}/${encodeURIComponent(itemId)}`, {
            method: 'DELETE',
            headers: {
              'Idempotency-Key': entry.idempotencyKey
            }
          });

          if (res.ok || res.status === 404) {
            await dequeueOfflineItem(entry.id);
            successCount++;
          } else if ([400, 403].includes(res.status)) {
            // Unrecoverable permission / validation error, drop from queue
            await dequeueOfflineItem(entry.id);
            errorCount++;
          } else {
            errorCount++;
          }
        } else {
          // Upsert single item
          const res = await apiFetch(`/api/collections/${encodeURIComponent(entry.collection)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': entry.idempotencyKey
            },
            body: JSON.stringify({
              items: [entry.item],
              replaceAll: false
            })
          });

          if (res.ok) {
            const json = await res.json().catch(() => ({}));
            if (json && Array.isArray(json.conflicts) && json.conflicts.length > 0) {
              conflicts.push(...json.conflicts);
              if (onConflict) {
                json.conflicts.forEach((c: any) => onConflict(c, entry.collection));
              }
            }
            await dequeueOfflineItem(entry.id);
            successCount++;
          } else if ([400, 403].includes(res.status)) {
            // Unrecoverable permission error, drop to avoid queue poison
            await dequeueOfflineItem(entry.id);
            errorCount++;
          } else {
            errorCount++;
          }
        }
      } catch (itemErr) {
        console.warn(`[OfflineQueue] Gagal menyinkronkan item id=${entry.id}:`, itemErr);
        errorCount++;
      }
    }
  } catch (err) {
    console.error('[OfflineQueue Flush Error]:', err);
  } finally {
    isFlushing = false;
    getPendingCount().then(notifyCountListeners).catch(() => {});
  }

  return { successCount, errorCount, conflicts };
}

// Global auto-sync trigger: listener online dan timer setiap 30 detik
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[OfflineQueue] Perangkat kembali online. Memulai sinkronisasi otomatis...');
    flushOfflineQueue().catch(() => {});
  });

  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushOfflineQueue().catch(() => {});
    }
  }, 30 * 1000);
}
