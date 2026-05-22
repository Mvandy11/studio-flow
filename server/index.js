// ─────────────────────────────────────────────────────────────────────────────
// Normalize Vite-prefixed env vars so server-side code can use standard names.
// Vite exposes VITE_* vars to the browser; the server shares the same Replit
// secret store, so we alias them here before any module imports them.
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

import app from './app.js';

const PORT = process.env.PORT || 3001;

// ── Startup diagnostics ───────────────────────────────────────────────────────
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const OPTIONAL = ['SUPABASE_ANON_KEY'];
REQUIRED.forEach(v => {
  if (!process.env[v]) console.error(`[server] ❌ MISSING required env var: ${v}`);
  else                  console.log(`[server] ✅ ${v} is set`);
});
OPTIONAL.forEach(v => {
  if (!process.env[v]) console.warn(`[server] ⚠️  Optional env var not set: ${v}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Studio Flow API running on port ${PORT}`);
});

export default app;
