/**
 * Membership Activation
 * Mounted at /api/membership by app.js.
 *
 * POST /api/membership/activate
 *   Body: { tier: "member_30" | "creator_50" }
 *   Auth: Bearer token required
 *
 *   Called by the frontend success page after a Stripe Payment Link
 *   redirects back with ?tier=<tier> in the URL.
 *
 *   Updates profiles:
 *     membership_active       boolean
 *     membership_tier         text  ('free' | 'member_30' | 'creator_50')
 *     membership_started_at   timestamptz
 */

import { Router } from 'express';
import supabase from '../supabase/supabaseClient.js';        // ⭐ FIXED — use client for auth
import supabaseAdmin from '../supabase/supabaseAdmin.js';    // still used for DB writes
import { logError } from '../utils/logError.js';

const router = Router();

const VALID_TIERS = new Set(['member_30', 'creator_50']);

// ── POST /api/membership/activate ──────────────────────────────────────────
router.post('/activate', async (req, res) => {
  try {
    // Auth
    const authHeader = req.headers.authorization || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return res.status(401).json({ error: 'Authentication required.' });

    // ⭐ FIXED — decode user using client auth, not admin
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const { tier } = req.body || {};

    let payload;

    if (tier && VALID_TIERS.has(tier)) {
      payload = {
        membership_active:     true,
        membership_tier:       tier,
        membership_started_at: new Date().toISOString(),
        subscription_active:   true, // backward compatibility
      };
    } else {
      // No tier or unknown tier → reset to free
      payload = {
        membership_active: false,
        membership_tier:   'free',
      };
    }

    // Update profile using admin client
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    // Add revenue pool entry for creator_50
    if (tier === 'creator_50') {
      await supabaseAdmin.from('revenue_pool_entries').insert({
        creator_id: user.id,
        amount:     25,
        source:     'subscription',
      });
    }

    console.log(`[membership/activate] ✅ user=${user.id} tier=${tier ?? '(none → free)'}`);
    res.json({ success: true, tier: payload.membership_tier });

  } catch (err) {
    console.error('[membership/activate] error:', err.message);
    await logError(err, '/api/membership/activate');
    res.status(500).json({ error: err.message });
  }
});

export default router;
