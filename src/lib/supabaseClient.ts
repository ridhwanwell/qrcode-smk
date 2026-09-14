import { createClient } from '@supabase/supabase-js';

// Frontend client: strictly uses public Anon Key. Never imports service role key.
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://auzpctxhltcdzdhcaetb.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8OiRZ-N5CqysP7etk1w0yA_P0L3geP9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'smk_supabase_auth_token'
  }
});
