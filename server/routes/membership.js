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
 *
 *   Inserts pool contribution records:
 *     reward_pool_contributions
 *     event_creator_pool_contributions
 */

import { Router } from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';

const router = Router();

const VALID_TIERS = new Set(['member_30', 'creator_50']);

const POOL_CONTRIBUTIONS = {
  member_30:  { rewardPool: 10, eventCreatorPool: 0  },
  creator_50: { rewardPool: 10, eventCreatorPool: 15 },
};

// ── POST /api/membership/activate ──────────────────────────────────────────
router.post('/activate', async (req, res) => {
  try {
    // Auth
    const authHeader = req.headers.authorization || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return res.status(401).json({ error: 'Authentication required.' });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

    const { tier } = req.body || {};

    let payload;

    if (tier && VALID_TIERS.has(tier)) {
      payload = {
        membership_active:     true,
        membership_tier:       tier,
        membership_started_at: new Date().toISOString(),
        subscription_active:   true,
      };
    } else {
      payload = {
        membership_active: false,
        membership_tier:   'free',
      };
    }

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    // Pool contributions
    if (tier && VALID_TIERS.has(tier)) {
      const { rewardPool, eventCreatorPool } = POOL_CONTRIBUTIONS[tier];

      await supabaseAdmin.from('reward_pool_contributions').insert({
        user_id: user.id,
        amount:  rewardPool,
        tier,
      }).maybeSingle();

      if (eventCreatorPool > 0) {
        await supabaseAdmin.from('event_creator_pool_contributions').insert({
          user_id: user.id,
          amount:  eventCreatorPool,
          tier,
        }).maybeSingle();
      }
    }

    res.json({ success: true, tier: payload.membership_tier });
  } catch (err) {
    await logError(err, '/api/membership/activate');
    res.status(500).json({ error: err.message });
  }
});

export default router;
