/**
 * /api/stripe-connect
 *
 * POST /onboard          — creator: start Stripe Express onboarding
 * POST /complete         — creator: save connect ID after onboarding
 * GET  /status           — creator: check their connect status
 */
import { Router } from 'express';
import Stripe from 'stripe';
import { supabase as supabaseAdmin } from '../supabase/client.js';

const router  = Router();
const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const BASE_URL = process.env.VITE_API_BASE_URL || 'https://studioflow.club';

async function getUser(req) {
  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
  return user ?? null;
}

// ── POST /api/stripe-connect/onboard ─────────────────────────────────────────
// Creates a Stripe Express account and returns the onboarding URL.
router.post('/onboard', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  try {
    // Check if already has a connect ID
    const { data: settings } = await supabaseAdmin
      .from('creator_settings')
      .select('stripe_connect_id, stripe_connect_onboarded')
      .eq('creator_id', user.id)
      .maybeSingle();

    let accountId = settings?.stripe_connect_id;

    // Create new Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true } },
        metadata: { supabase_user_id: user.id },
      });
      accountId = account.id;

      // Save immediately so we don't create duplicates on retry
      await supabaseAdmin
        .from('creator_settings')
        .upsert(
          { creator_id: user.id, stripe_connect_id: accountId },
          { onConflict: 'creator_id' }
        );
    }

    // Generate fresh onboarding link
    const link = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${BASE_URL}/settings/payout?connect=refresh`,
      return_url:  `${BASE_URL}/settings/payout?connect=success`,
      type:        'account_onboarding',
    });

    return res.json({ url: link.url, accountId });
  } catch (err) {
    console.error('[stripe-connect/onboard]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/stripe-connect/complete ────────────────────────────────────────
// Called by the frontend after the creator returns from Stripe onboarding.
// Verifies the account is charges_enabled and marks onboarded = true.
router.post('/complete', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data: settings } = await supabaseAdmin
      .from('creator_settings')
      .select('stripe_connect_id')
      .eq('creator_id', user.id)
      .maybeSingle();

    if (!settings?.stripe_connect_id) {
      return res.status(400).json({ error: 'No Stripe Connect account found. Start onboarding first.' });
    }

    const account = await stripe.accounts.retrieve(settings.stripe_connect_id);
    const onboarded = account.details_submitted && account.charges_enabled;

    await supabaseAdmin
      .from('creator_settings')
      .update({ stripe_connect_onboarded: onboarded })
      .eq('creator_id', user.id);

    return res.json({ onboarded, accountId: settings.stripe_connect_id });
  } catch (err) {
    console.error('[stripe-connect/complete]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stripe-connect/status ───────────────────────────────────────────
router.get('/status', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { data: settings } = await supabaseAdmin
    .from('creator_settings')
    .select('stripe_connect_id, stripe_connect_onboarded')
    .eq('creator_id', user.id)
    .maybeSingle();

  return res.json({
    connected:  !!settings?.stripe_connect_id,
    onboarded:  settings?.stripe_connect_onboarded ?? false,
    accountId:  settings?.stripe_connect_id ?? null,
  });
});

export default router;
