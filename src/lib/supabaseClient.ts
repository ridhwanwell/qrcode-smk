import { createClient } from '@supabase/supabase-js';

// Frontend client: strictly uses public Anon Key. Never imports service role key.
const metaEnv = (import.meta as any).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

if (!metaEnv.VITE_SUPABASE_URL || !metaEnv.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    `[Supabase Client Warning] Variabel VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum disetel di Vercel. ` +
    `Aplikasi akan menggunakan penyimpanan lokal (localStorage) tanpa mengalami crash.`
  );
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
