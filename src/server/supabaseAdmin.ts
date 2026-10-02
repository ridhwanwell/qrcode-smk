import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Backend server client: runs exclusively on server.ts with Node.js
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!rawUrl) {
  console.error('[Supabase Admin Fatal] Environment variable SUPABASE_URL belum disetel di server.');
  process.exit(1);
}

// ATURAN WAJIB: Kunci SUPABASE_SERVICE_ROLE_KEY hanya boleh dipakai di server.
// JANGAN PERNAH ada fallback ke anon key di supabaseAdmin; jika service role key tidak ada,
// server harus berhenti dengan pesan error yang jelas.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey || serviceRoleKey.trim() === '') {
  console.error('[Supabase Admin Fatal] Environment variable SUPABASE_SERVICE_ROLE_KEY belum disetel di server. Server dihentikan demi keamanan.');
  process.exit(1);
}

// Clean and normalize Supabase base URL (remove trailing /rest/v1 or trailing slashes)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

