import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      return process.env[key];
    }
  } catch (_) {}
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta?.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (_) {}
  return undefined;
};

const rawUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || 'https://auzpctxhltcdzdhcaetb.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_8OiRZ-N5CqysP7etk1w0yA_P0L3geP9';

export const supabase = createClient(supabaseUrl, supabaseKey);

