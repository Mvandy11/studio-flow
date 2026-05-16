/**
 * GET /api/auth/profile
 *
 * Returns the caller's profile row using the Supabase SERVICE ROLE key so
 * RLS never blocks the read. The caller must supply a valid Supabase JWT in
 * the Authorization header.
 */
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Lazy service-role client — created on first request so the module never
// crashes at import time if the env vars haven't been set yet.
let _adminSupabase = null;
function getAdminClient() {
  if (_adminSupabase) return _adminSupabase;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }

  _adminSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminSupabase;
}

router.get('/profile', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    return res.status(401).json({ error: 'Authorization header is required.' });
  }

  let adminClient;
  try {
    adminClient = getAdminClient();
  } catch (err) {
    console.error('[auth/profile] Supabase client init failed:', err.message);
    return res.status(503).json({ error: 'Database not configured.' });
  }

  try {
    // Verify the JWT and get the Supabase user
    const { data: { user }, error: authErr } = await adminClient.auth.getUser(jwt);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Read the profile with service-role key (RLS bypassed)
    const { data: profile, error: dbErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (dbErr) {
      console.error('[auth/profile] DB error:', dbErr.message);
      return res.status(500).json({ error: 'Failed to read profile.' });
    }

    if (!profile) {
      // No profile row — synthesise one from auth user metadata
      console.warn('[auth/profile] No profile row for userId:', user.id);
      return res.json({
        id:           user.id,
        email:        user.email,
        role:         user.app_metadata?.role || user.user_metadata?.role || 'user',
        display_name: user.user_metadata?.full_name || null,
        avatar_url:   user.user_metadata?.avatar_url || null,
        _source:      'auth_user_fallback',
      });
    }

    return res.json({ ...profile, _source: 'profiles_table' });
  } catch (err) {
    console.error('[auth/profile] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
