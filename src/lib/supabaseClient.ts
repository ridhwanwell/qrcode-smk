import { createClient } from '@supabase/supabase-js';

// Frontend client: strictly uses public Anon Key. Never imports service role key.
const metaEnv = (import.meta as any).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseAnonKey) {
  const missing = [
    !rawUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY'
  ].filter(Boolean).join(', ');
  
  console.error(
    `[Supabase Client Error] Variabel lingkungan berikut belum disetel: ${missing}. ` +
    `Pastikan file .env telah memuat VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.`
  );
  throw new Error(`[Supabase Config Error] Missing required environment variables: ${missing}`);
}

// Clean and normalize Supabase base URL (remove trailing /rest/v1 or trailing slashes)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'smk_supabase_auth_token'
  }
});
