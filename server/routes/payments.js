/**
 * /api/payments — Studio Flow 2.0 payment endpoints.
 *
 * Membership is handled exclusively via Stripe Payment Links.
 * After payment, Stripe redirects to /membership/success?tier=<tier>
 * which calls POST /api/membership/activate — no subscription objects needed.
 *
 * Webhooks here are kept as receive-and-acknowledge endpoints only.
 * No subscription sync is performed server-side.
 */
import express from 'express';
import Stripe from 'stripe';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';
import { donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// ── Stripe client ─────────────────────────────────────────────────────────────
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAuth(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  return user;
}

// ── Webhook parser ────────────────────────────────────────────────────────────
function parseWebhookEvent(req) {
  const sig           = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe        = getStripe();

  if (stripe && sig && webhookSecret) {
    return stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  }

  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

// ── SUBSCRIPTION WEBHOOK ──────────────────────────────────────────────────────
//
// Studio Flow 2.0 uses Payment Links only — no Stripe Subscription objects.
// Membership is activated by the frontend redirect hitting POST /api/membership/activate.
// This endpoint exists only to acknowledge Stripe pings and prevent retries.
//
router.post('/subscription-webhook', async (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    parseWebhookEvent(req); // validates signature if STRIPE_WEBHOOK_SECRET is set
  } catch (err) {
    console.error(`[${timestamp}] [subscription-webhook] ❌ Signature error:`, err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Membership activation is handled client-side via /api/membership/activate.
  // All subscription lifecycle events are intentionally ignored.
  console.log(`[${timestamp}] [subscription-webhook] ℹ️ Acknowledged (no-op — Payment Links model)`);
  res.json({ received: true });
});

// ── DONATIONS ─────────────────────────────────────────────────────────────────

router.post('/create-donation', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ url: donationLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donation webhook — acknowledge only; donation records are inserted by the
// /donate/success page which has full event_id + creator_id context.
router.post('/donation-webhook', async (req, res) => {
  try {
    parseWebhookEvent(req);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
  res.json({ received: true });
});

// ── CUSTOM EVENT PAYMENTS ─────────────────────────────────────────────────────

router.post('/create-event-payment', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { event_slot_id, amount } = req.body;
    if (!event_slot_id) return res.status(400).json({ error: 'event_slot_id is required.' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'A positive amount is required.' });

    const { data: slot } = await supabaseAdmin
      .from('event_slots')
      .select('id, title')
      .eq('id', event_slot_id)
      .maybeSingle();

    if (!slot) return res.status(404).json({ error: 'Event slot not found.' });

    const sessionUrl = eventPaymentBaseLink === 'REPLACE_WITH_EVENT_PAYMENT_LINK'
      ? eventPaymentBaseLink
      : `${eventPaymentBaseLink}?client_reference_id=${event_slot_id}&amount=${Math.round(Number(amount) * 100)}`;

    res.json({ url: sessionUrl, slot });
  } catch (err) {
    console.error('[payments] create-event-payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event-webhook', async (req, res) => {
  let event;
  try {
    event = parseWebhookEvent(req);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session      = event.data?.object;
      const eventSlotId  = session?.client_reference_id;
      const amount       = session?.amount_total ? session.amount_total / 100 : 0;
      const creatorShare = Math.round(amount * 0.98 * 100) / 100;
      const studioFee    = Math.round(amount * 0.02 * 100) / 100;

      const { error } = await supabaseAdmin.from('event_payments').insert({
        id:                    randomUUID(),
        event_slot_id:         eventSlotId || null,
        amount,
        stripe_payment_id:     session?.payment_intent || session?.id,
        creator_payout_amount: creatorShare,
        studio_fee_amount:     studioFee,
      });
      if (error) console.error('[payments] event-webhook insert error:', error.message);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[payments] event-webhook error:', err.message);
    await logError(err, '/api/payments/event-webhook');
    res.status(500).json({ error: err.message });
  }
});

export default router;
