import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Backend server client: runs exclusively on server.ts with Node.js
// Gracefully handles missing keys so the dev server starts reliably without crashing
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://auzpctxhltcdzdhcaetb.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.warn('[Supabase Admin Warning] SUPABASE_URL atau VITE_SUPABASE_URL belum disetel di environment variables server. Menggunakan fallback.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase Admin Warning] SUPABASE_SERVICE_ROLE_KEY belum disetel di server. Server berjalan dengan fallback key.');
}

// Clean and normalize Supabase base URL (remove trailing /rest/v1 or trailing slashes)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

