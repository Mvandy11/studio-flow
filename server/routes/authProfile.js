/**
 * GET /api/auth/profile
 *
 * Returns the caller's profile row using the Supabase SERVICE ROLE key so
 * RLS never blocks the read. The caller must supply a valid Supabase JWT in
 * the Authorization header.
 */
import { Router } from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';

const router = Router();

router.get('/profile', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    return res.status(401).json({ error: 'Authorization header is required.' });
  }

  try {
    // Verify the JWT and get the Supabase user (service-role key bypasses RLS)
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Read the profile row
    const { data: profile, error: dbErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (dbErr) {
      console.error('[auth/profile] DB error:', dbErr.message);
      return res.status(500).json({ error: 'Failed to read profile.' });
    }

    if (!profile) {
      // No profile row yet — synthesise from auth user metadata
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

/**
 * GET /api/auth/membership
 *
 * Returns only the subscription fields for the caller's profile.
 * Uses the service-role key so RLS never blocks the read.
 */
router.get('/membership', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    return res.status(401).json({ error: 'Authorization header is required.' });
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('profiles')
      .select('subscription_active, subscription_status, current_period_end, membership_active, membership_tier, membership_started_at')
      .eq('id', user.id)
      .maybeSingle();

    if (dbErr) {
      console.error('[auth/membership] DB error:', dbErr.message);
      return res.status(500).json({ error: 'Failed to read membership.' });
    }

    // Derive effective access from either path (webhook sync OR payment link activate)
    const effectiveActive =
      (data?.subscription_active ?? false) ||
      (data?.membership_active   ?? false);

    return res.json({
      subscription_active:  data?.subscription_active  ?? false,
      subscription_status:  data?.subscription_status  ?? null,
      current_period_end:   data?.current_period_end   ?? null,
      membership_active:    data?.membership_active    ?? false,
      membership_tier:      data?.membership_tier      ?? 'free',
      membership_started_at: data?.membership_started_at ?? null,
      // Convenience flag: true when either activation path grants access
      has_access:           effectiveActive,
    });
  } catch (err) {
    console.error('[auth/membership] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
