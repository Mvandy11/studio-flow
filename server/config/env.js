/**
 * Centralized environment variable access for the Express API server.
 * Import named exports from this file instead of reading process.env directly.
 */

export const SUPABASE_URL              = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Studio Flow 2.0: Stripe Payment Links only — no server-side Stripe SDK.

export const REPLICATE_API_TOKEN       = process.env.REPLICATE_API_TOKEN;

export const REPLIT_DOMAINS            = process.env.REPLIT_DOMAINS;

export const PORT                      = Number(process.env.PORT) || 3001;
