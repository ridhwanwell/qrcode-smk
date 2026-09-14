import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { useAuth } from './AuthContext';
import { 
  fetchAssetCollectionFromSupabase, 
  saveAssetCollectionToSupabase, 
  subscribeAssetCollectionFromSupabase 
} from '../lib/supabaseAssetSync.ts';

/**
 * Recursively strips keys with `undefined` values from an object or array.
 * Firestore setDoc / updateDoc rejects any object containing `undefined`.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

export function useFirestoreData<T extends { id: string }>(collectionName: string) {
  // 1. Initialize immediately from local cache so there is zero flash on refresh
  const [data, setData] = useState<T[]>(() => {
    try {
      const cached = localStorage.getItem(`smk_aset_${collectionName}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch (_) {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const isSavingRef = useRef(false);

  // 2. Fetch and synchronize from Supabase & Firestore
  useEffect(() => {
    let isMounted = true;

    // A. Fetch from Supabase
    fetchAssetCollectionFromSupabase<T>(collectionName).then((supaItems) => {
      if (!isMounted) return;
      if (supaItems !== null) {
        setData(supaItems);
        setLoading(false);
      }
    });

    // B. Subscribe to real-time changes in Supabase
    const unsubscribeSupabase = subscribeAssetCollectionFromSupabase<T>(collectionName, (newItems) => {
      if (!isMounted) return;
      setData(newItems);
      try {
        localStorage.setItem(`smk_aset_${collectionName}`, JSON.stringify(newItems));
      } catch (_) {}
    });

    // C. If user is logged into Firebase, also sync with Firestore
    let unsubscribeFirestore = () => {};
    if (user && db) {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, collectionName), (snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const fsItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
            setData(fsItems);
            saveAssetCollectionToSupabase(collectionName, fsItems);
          }
          setLoading(false);
        }, (err) => {
          console.warn(`Firestore warning for ${collectionName}:`, err?.message);
          setLoading(false);
        });
      } catch (err) {
        console.warn(`Firestore setup error for ${collectionName}:`, err);
      }
    }

    return () => {
      isMounted = false;
      unsubscribeSupabase();
      unsubscribeFirestore();
    };
  }, [collectionName, user]);

  // Helper to persist changes to Supabase & Firestore
  const persistChanges = async (nextItems: T[]) => {
    setData(nextItems);
    saveAssetCollectionToSupabase(collectionName, nextItems);
  };

  const add = async (item: T) => {
    const next = [item, ...data.filter(i => i.id !== item.id)];
    await persistChanges(next);

    // Also persist to Firestore if available
    if (user && db) {
      try {
        const sanitized = sanitizeForFirestore(item);
        await setDoc(doc(db, collectionName, item.id), sanitized);
      } catch (e) {
        console.warn(`Firestore add error (${collectionName}):`, e);
      }
    }
  };

  const update = async (item: T) => {
    const next = data.map(i => i.id === item.id ? item : i);
    await persistChanges(next);

    // Also persist to Firestore if available
    if (user && db) {
      try {
        const sanitized = sanitizeForFirestore(item);
        await setDoc(doc(db, collectionName, item.id), sanitized, { merge: true });
      } catch (e) {
        console.warn(`Firestore update error (${collectionName}):`, e);
      }
    }
  };

  const remove = async (id: string) => {
    const next = data.filter(item => item.id !== id);
    await persistChanges(next);

    // Also persist to Firestore if available
    if (user && db) {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (e) {
        console.warn(`Firestore remove error (${collectionName}):`, e);
      }
    }
  };

  const clearAll = async () => {
    await persistChanges([]);

    // Also persist to Firestore if available
    if (user && db) {
      try {
        const snap = await getDocs(collection(db, collectionName));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn(`Firestore clearAll error (${collectionName}):`, e);
      }
    }
  };

  return { data, add, update, remove, clearAll, setData, loading };
}
