import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,   // store session in localStorage across reloads
    autoRefreshToken:   true,   // auto-renew JWT before it expires
    detectSessionInUrl: true,   // handle OAuth / magic-link redirects
  },
});

export default supabase;
