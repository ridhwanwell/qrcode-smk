import { createClient } from '@supabase/supabase-js';

// Backend server client: runs exclusively on server.ts with Node.js
// Uses Service Role Key for administrative operations or Anon Key if not set
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://auzpctxhltcdzdhcaetb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8OiRZ-N5CqysP7etk1w0yA_P0L3geP9';

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
