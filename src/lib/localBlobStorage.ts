// IndexedDB Helper for storing large template files locally when Base64 is used

const DB_NAME = 'SMK_Template_Blobs_DB';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveLocalBlob(id: string, dataUrl: string): Promise<string> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(dataUrl, id);
      request.onsuccess = () => resolve(`idb://${id}`);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save blob to IndexedDB, fallback to localStorage:', err);
    try {
      localStorage.setItem(`tmpl_blob_${id}`, dataUrl);
      return `idb://${id}`;
    } catch {
      return dataUrl;
    }
  }
}

export async function getLocalBlob(refUrl: string): Promise<string> {
  if (!refUrl.startsWith('idb://')) return refUrl;
  const id = refUrl.replace('idb://', '');

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Check localStorage fallback
          const local = localStorage.getItem(`tmpl_blob_${id}`);
          resolve(local || refUrl);
        }
      };
      request.onerror = () => {
        const local = localStorage.getItem(`tmpl_blob_${id}`);
        resolve(local || refUrl);
      };
    });
  } catch {
    const local = localStorage.getItem(`tmpl_blob_${id}`);
    return local || refUrl;
  }
}
