import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[supabase] Missing env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set. " +
    "Auth and database calls will fail. Check your Replit Secrets."
  );
}

export const supabase = createClient(
  supabaseUrl     || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export default supabase;
