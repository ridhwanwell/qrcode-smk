import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

/**
 * Maps frontend collection names to their respective native Supabase SQL table names
 */
const TABLE_MAPPING: Record<string, string> = {
  schedules: 'schedules',
  sphDocuments: 'sph_documents',
  calibratorAssets: 'calibrators',
  financialAssets: 'financial_assets',
  financialTransactions: 'financial_transactions',
  hospitals: 'hospitals',
  technicians: 'technicians',
  tabletAssets: 'tablet_devices',
  tabletLoans: 'tablet_loans',
  marketingStaff: 'marketing_staff',
  bapDocuments: 'bap_documents'
};

/**
 * Universal React Hook for Supabase real-time data persistence,
 * replacing Firestore with 100% native Supabase Postgres operations, RLS security,
 * and zero-flash offline local caching.
 */
export function useSupabaseData<T extends { id: string }>(collectionName: string) {
  const tableName = TABLE_MAPPING[collectionName] || collectionName;
  const storageKey = `smk_supa_${collectionName}`;

  // 1. Instant load from local cache for 0ms initial render
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
  const { user } = useAuth();
  const dataRef = useRef<T[]>(data);
  dataRef.current = data;

  const updateCache = useCallback((nextItems: T[]) => {
    setData(nextItems);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextItems));
    } catch (_) {}
  }, [storageKey]);

  // 2. Fetch and Subscribe from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // Try querying native table first
        const { data: records, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && records) {
          if (isMounted) {
            // Transform snake_case columns to camelCase if needed, or use as is
            const formatted = records.map((r: any) => {
              if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
                return { id: r.id, ...r.data, ...r };
              }
              return r as T;
            });
            updateCache(formatted);
            setLoading(false);
          }
          return;
        }

        // Fallback: If specific table is not found, check generic collection backup in settings
        if (error && (error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
          const { data: settingData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', `coll_${collectionName}`)
            .maybeSingle();

          if (settingData?.value) {
            try {
              const parsed = JSON.parse(settingData.value);
              if (Array.isArray(parsed) && isMounted) {
                updateCache(parsed);
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn(`[useSupabaseData] Error loading ${collectionName}:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Setup Supabase Realtime Channel
    const channel = supabase
      .channel(`realtime_${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [collectionName, tableName, updateCache]);

  // Log activity to audit log table
  const logAudit = async (action: string, recordId: string) => {
    if (!user) return;
    try {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action,
        table_name: tableName,
        record_id: recordId,
        created_at: new Date().toISOString()
      });
    } catch (_) {
      // Non-fatal audit log failure
    }
  };

  const add = async (item: T) => {
    const next = [item, ...dataRef.current.filter(i => i.id !== item.id)];
    updateCache(next);

    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(item as any);

      if (error) {
        // Fallback to settings collection backup if table doesn't exist
        await supabase
          .from('settings')
          .upsert({ key: `coll_${collectionName}`, value: JSON.stringify(next) });
      } else {
        await logAudit('INSERT', item.id);
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Add error on ${tableName}:`, e);
    }
  };

  const update = async (item: T) => {
    const next = dataRef.current.map(i => i.id === item.id ? item : i);
    updateCache(next);

    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(item as any);

      if (error) {
        await supabase
          .from('settings')
          .upsert({ key: `coll_${collectionName}`, value: JSON.stringify(next) });
      } else {
        await logAudit('UPDATE', item.id);
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Update error on ${tableName}:`, e);
    }
  };

  const remove = async (id: string) => {
    const next = dataRef.current.filter(i => i.id !== id);
    updateCache(next);

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        await supabase
          .from('settings')
          .upsert({ key: `coll_${collectionName}`, value: JSON.stringify(next) });
      } else {
        await logAudit('DELETE', id);
      }
    } catch (e) {
      console.warn(`[useSupabaseData] Delete error on ${tableName}:`, e);
    }
  };

  const clearAll = async () => {
    updateCache([]);
    try {
      await supabase.from(tableName).delete().neq('id', '___non_existent___');
      await supabase.from('settings').delete().eq('key', `coll_${collectionName}`);
      await logAudit('CLEAR_ALL', '*');
    } catch (e) {
      console.warn(`[useSupabaseData] ClearAll error on ${tableName}:`, e);
    }
  };

  return { data, add, update, remove, clearAll, setData: updateCache, loading };
}
