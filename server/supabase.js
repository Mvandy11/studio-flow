import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('[supabase] SUPABASE_URL is not set.');
if (!supabaseKey) throw new Error('[supabase] SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) is not set.');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[supabase] WARNING: running with anon key — auth.admin.* calls will fail. Set SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default supabase;
