import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { useAuth } from './AuthContext';

/**
 * Recursively strips keys with `undefined` values from an object or array.
 * Firestore setDoc / updateDoc rejects any object containing `undefined` with:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
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
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
      // Strictly load existing documents. NEVER automatically re-seed!
      // When empty or deleted, it stays completely empty (0 items).
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, collectionName]);

  const add = async (item: T) => {
    // Optimistic addition
    setData(prev => [item, ...prev.filter(i => i.id !== item.id)]);
    if (!user) return;
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(db, collectionName, item.id), sanitized);
    } catch (e) {
      console.error(`Error adding to ${collectionName}:`, e);
    }
  };

  const update = async (item: T) => {
    // Optimistic update
    setData(prev => prev.map(i => i.id === item.id ? item : i));
    if (!user) return;
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(db, collectionName, item.id), sanitized, { merge: true });
    } catch (e) {
      console.error(`Error updating ${collectionName}:`, e);
    }
  };

  const remove = async (id: string) => {
    // Optimistic instant removal - disappear immediately from UI
    setData(prev => prev.filter(item => item.id !== id));
    if (!user) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error(`Error removing from ${collectionName}:`, e);
    }
  };

  const clearAll = async () => {
    setData([]);
    if (!user) return;
    try {
      const snap = await getDocs(collection(db, collectionName));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.error(`Error clearing ${collectionName}:`, e);
    }
  };

  return { data, add, update, remove, clearAll, setData, loading };
}
