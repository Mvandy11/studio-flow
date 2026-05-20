/**
 * Supabase Admin client — always uses the service role key.
 * Use this in server-side code that needs to bypass RLS (webhooks, admin routes).
 * Never expose this client or its key to the browser.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('[supabaseAdmin] SUPABASE_URL is not set.');
}
if (!serviceRoleKey) {
  console.warn(
    '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set — ' +
    'admin operations will use the anon key and may be blocked by RLS.',
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey || process.env.VITE_SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  },
);

export default supabaseAdmin;
