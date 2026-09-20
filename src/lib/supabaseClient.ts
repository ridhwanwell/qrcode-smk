import { createClient } from '@supabase/supabase-js';

// Frontend client: strictly uses public Anon Key. Never imports service role key.
const metaEnv = (import.meta as any).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL || 'https://auzpctxhltcdzdhcaetb.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1enBjdHhobHRjZHpkaGNhZXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMjA4NTEsImV4cCI6MjEwNDY5Njg1MX0.Hvx58qmrzp5aIylyw1_2C53-h-yYRpvrc00aH-MYI1o';

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
