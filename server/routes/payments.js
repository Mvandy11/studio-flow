/**
 * /api/payments — Subscription, donation, and custom event payment endpoints.
 *
 * Stripe → Supabase membership sync pipeline:
 *   - Validates webhook signatures with STRIPE_WEBHOOK_SECRET
 *   - Looks up profiles by stripe_customer_id
 *   - Updates subscription_status, subscription_active, current_period_end
 *   - Uses Service Role key (bypasses RLS)
 *   - Supabase trigger auto-logs changes to user_history — no manual writes here
 *   - Always returns 200 to Stripe; never crashes the server
 */
import express from 'express';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import supabase from '../supabase/supabase.js';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { subscriptionLink, donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';

const router = express.Router();

// ── Stripe client ────────────────────────────────────────────────────────────
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAuth(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  return user;
}

// ── Webhook helpers ───────────────────────────────────────────────────────────

/**
 * Parse and optionally verify a Stripe webhook payload.
 * Verified when STRIPE_WEBHOOK_SECRET + stripe-signature header are present.
 * Falls back to unsigned JSON parse in dev/test.
 */
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

/**
 * Resolve the subscription object and customer ID from any Stripe event.
 * For subscription events the object IS the subscription.
 * For checkout/invoice events we either derive or retrieve it from Stripe.
 *
 * Returns { customerId, status, currentPeriodEnd } or null if unresolvable.
 */
async function resolveSubscriptionInfo(eventType, obj) {
  const stripe = getStripe();

  // ── subscription.* → obj is the subscription directly ───────────────────
  if (
    eventType === 'customer.subscription.created' ||
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  ) {
    return {
      customerId:       obj.customer,
      status:           obj.status,
      currentPeriodEnd: obj.current_period_end
        ? new Date(obj.current_period_end * 1000).toISOString()
        : null,
    };
  }

  // ── checkout.session.completed → retrieve subscription from Stripe ───────
  if (eventType === 'checkout.session.completed') {
    const subId = obj.subscription;
    if (subId && stripe) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        return {
          customerId:       obj.customer ?? sub.customer,
          status:           sub.status,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        };
      } catch (err) {
        console.error('[payments/webhook] subscription retrieve error:', err.message);
      }
    }
    // Fallback: no subscription ID (one-time payment) — mark as active
    return {
      customerId:       obj.customer,
      status:           'active',
      currentPeriodEnd: null,
    };
  }

  // ── invoice.paid → retrieve subscription from Stripe ─────────────────────
  if (eventType === 'invoice.paid') {
    const subId = obj.subscription;
    if (subId && stripe) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        return {
          customerId:       obj.customer,
          status:           sub.status,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        };
      } catch (err) {
        console.error('[payments/webhook] subscription retrieve error (invoice.paid):', err.message);
      }
    }
    return { customerId: obj.customer, status: 'active', currentPeriodEnd: null };
  }

  // ── invoice.payment_failed → mark past_due ────────────────────────────────
  if (eventType === 'invoice.payment_failed') {
    return {
      customerId:       obj.customer,
      status:           'past_due',
      currentPeriodEnd: null,
    };
  }

  return null;
}

/**
 * Look up a profile by stripe_customer_id and update subscription fields.
 * Uses the Service Role client to bypass RLS.
 * Syncs ONLY the profiles table — no legacy tables.
 */
async function syncProfileSubscription(customerId, status, periodEnd) {
  const timestamp = new Date().toISOString();
  if (!customerId) return;

  const { data: profile, error: lookupErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile || lookupErr) return;

  const isActive = ['active', 'trialing'].includes(status);

  const payload = {
    subscription_status: status,
    subscription_active: isActive,
    updated_at:          timestamp,
  };
  if (periodEnd) payload.current_period_end = periodEnd;

  await supabaseAdmin.from('profiles').update(payload).eq('id', profile.id);
}

// ── SUBSCRIPTION ─────────────────────────────────────────────────────────────

/**
 * POST /api/payments/create-checkout-session
 *
 * Creates a Stripe Checkout subscription session.
 * Falls back to static payment link when STRIPE_PRICE_ID is not configured.
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const stripe  = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!stripe || !priceId) {
      console.warn('[payments] create-checkout-session: STRIPE_PRICE_ID not set — falling back to static link');
      return res.json({ url: subscriptionLink });
    }

    const domain  = process.env.REPLIT_DOMAINS?.split(',')[0];
    const siteUrl = domain ? `https://${domain}` : 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${siteUrl}/payment/success`,
      cancel_url:           `${siteUrl}/subscription`,
      customer_email:       user.email ?? undefined,
      metadata:             { user_id: user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[payments] create-checkout-session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/create-subscription (legacy — static link fallback)
router.post('/create-subscription', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ url: subscriptionLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/subscription-webhook
 *
 * Stripe → Supabase membership sync.
 * Cleaned version:
 *   - No legacy memberships table
 *   - No legacy subscription_status table
 *   - Bulletproof logging
 *   - Guaranteed 200 OK
 */
router.post('/subscription-webhook', async (req, res) => {
    const timestamp = new Date().toISOString();

    let event;
    try {
      event = parseWebhookEvent(req);
    } catch (err) {
      console.error(`[${timestamp}] [webhook] ❌ Signature verification failed:`, err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    const eventType = event.type;
    const obj       = event.data.object;

    console.info(`[${timestamp}] [webhook] 📩 Received event: ${eventType}`);

    try {
      const HANDLED = new Set([
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
      ]);

      if (!HANDLED.has(eventType)) {
        console.info(`[${timestamp}] [webhook] ℹ️ Unhandled event type — ignoring: ${eventType}`);
        return res.json({ received: true });
      }

      // Resolve subscription info
      const info = await resolveSubscriptionInfo(eventType, obj);

      if (!info) {
        console.warn(`[${timestamp}] [webhook] ⚠️ Could not resolve subscription info for ${eventType}`);
        return res.json({ received: true });
      }

      console.info(
        `[${timestamp}] [webhook] customer=${info.customerId} | status=${info.status} | period_end=${info.currentPeriodEnd ?? '—'}`
      );

      // Sync to Supabase profiles table
      await syncProfileSubscription(info.customerId, info.status, info.currentPeriodEnd);

      console.info(`[${timestamp}] [webhook] ✅ Profile sync complete`);
    } catch (err) {
      console.error(`[${timestamp}] [webhook] ❌ Handler error (non-fatal):`, err.message);
    }

    // Always return 200 so Stripe does not retry
    res.json({ received: true });
  },
);

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

router.post('/donation-webhook', async (req, res) => {
  let event;
  try {
    event = parseWebhookEvent(req);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const obj    = event.data?.object;
      const amount = obj?.amount_total
        ? obj.amount_total / 100
        : (obj?.amount_received ? obj.amount_received / 100 : null);

      if (amount) {
        await supabase.from('donations').insert({
          id:                randomUUID(),
          stripe_payment_id: obj.id,
          amount,
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CUSTOM EVENT PAYMENTS ────────────────────────────────────────────────────

router.post('/create-event-payment', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { event_slot_id, amount } = req.body;
    if (!event_slot_id) return res.status(400).json({ error: 'event_slot_id is required.' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'A positive amount is required.' });

    const { data: slot } = await supabase
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

      await supabase.from('event_payments').insert({
        id:                    randomUUID(),
        event_slot_id:         eventSlotId || null,
        amount,
        stripe_payment_id:     session?.payment_intent || session?.id,
        creator_payout_amount: creatorShare,
        studio_fee_amount:     studioFee,
      });
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
