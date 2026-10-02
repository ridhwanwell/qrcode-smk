import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Backend server client: runs exclusively on server / serverless function with Node.js
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!rawUrl) {
  const errMsg = '[Supabase Admin Fatal] Environment variable SUPABASE_URL (atau VITE_SUPABASE_URL) belum disetel di server.';
  console.error(errMsg);
  throw new Error(errMsg);
}

// ATURAN WAJIB: Kunci SUPABASE_SERVICE_ROLE_KEY hanya boleh dipakai di server.
// JANGAN PERNAH ada fallback ke anon key di supabaseAdmin; jika service role key tidak ada,
// lempar error yang jelas agar terlihat di log Vercel / Cloud server.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey || serviceRoleKey.trim() === '') {
  const errMsg = '[Supabase Admin Fatal] Environment variable SUPABASE_SERVICE_ROLE_KEY belum disetel di server. Akses backend diblokir demi keamanan.';
  console.error(errMsg);
  throw new Error(errMsg);
}

// Clean and normalize Supabase base URL (remove trailing /rest/v1 or trailing slashes)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

