/**
 * Stripe Customer Portal
 * Mounted at /api/stripe by app.js.
 *
 * POST /api/stripe/create-portal-session
 *   - Requires Bearer auth
 *   - Looks up profiles.stripe_customer_id
 *   - Falls back to creating a new customer if none exists
 *   - Returns { url } for the Stripe-hosted portal
 */

import { Router } from 'express';
import Stripe from 'stripe';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
}

function getSiteUrl() {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  return domain ? `https://${domain}` : 'http://localhost:5173';
}

// ── POST /api/stripe/create-portal-session ─────────────────────────────────
router.post('/create-portal-session', async (req, res) => {
  try {
    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authErr || !user) return res.status(401).json({ error: 'Authentication required.' });

    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured on this server.' });
    }

    // Fetch profile to get stripe_customer_id
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    let customerId = profile.stripe_customer_id;

    // If no customer ID exists yet, create a Stripe customer and save it
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      console.log(`[stripe-portal] Created new Stripe customer ${customerId} for user ${user.id}`);
    }

    // Create the portal session
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${getSiteUrl()}/membership`,
    });

    console.log(`[stripe-portal] ✅ portal session for customer=${customerId} user=${user.id}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe-portal] error:', err.message);
    await logError(err, '/api/stripe/create-portal-session');
    res.status(500).json({ error: err.message });
  }
});

export default router;
