import { createClient } from '@supabase/supabase-js';

// Frontend client: strictly uses public Anon Key from environment variables.
// Never imports service role key.
const metaEnv = (import.meta as any).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseAnonKey) {
  const missing = [];
  if (!rawUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  console.error(
    `[SupabaseClient Error] Konfigurasi environment frontend tidak lengkap. Variabel berikut belum disetel: ${missing.join(', ')}. Silakan periksa file .env Anda.`
  );
}

// Clean and normalize Supabase base URL (remove trailing /rest/v1 or trailing slashes)
const supabaseUrl = (rawUrl || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'smk_supabase_auth_token'
  }
});
