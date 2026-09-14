import { createClient } from '@supabase/supabase-js';

// Backend server client: runs exclusively on server.ts with Node.js
// Requires SUPABASE_SERVICE_ROLE_KEY for server-side operations
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rawUrl) {
  throw new Error('[Supabase Admin Error] SUPABASE_URL atau VITE_SUPABASE_URL harus disetel di environment variables server.');
}

if (!serviceRoleKey) {
  console.error('[CRITICAL SECURITY WARNING] SUPABASE_SERVICE_ROLE_KEY tidak disetel di server! Operasi backend memerlukan Service Role Key.');
  throw new Error('[Supabase Admin Error] SUPABASE_SERVICE_ROLE_KEY is required for server admin operations. Server cannot start without it.');
}

// Clean and normalize Supabase base URL (remove trailing /rest/v1 or trailing slashes)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
