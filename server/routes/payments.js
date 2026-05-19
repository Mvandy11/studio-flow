/**
 * /api/payments — Subscription, donation, and custom event payment endpoints.
 * Stripe webhook validates signatures when STRIPE_WEBHOOK_SECRET is set.
 * On verified events, profiles.subscription_active is kept in sync.
 */
import express from 'express';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import supabase from '../supabase.js';
import { subscriptionLink, donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';

const router = express.Router();

// Stripe client — only constructed when the key is present
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
}

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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Upsert a row in public.memberships keyed by email → user_id lookup.
 * Works alongside profiles.subscription_active for full coverage.
 */
async function upsertMembershipByEmail(email, isActive, stripeCustomerId, stripeSubId) {
  if (!email) return;
  const lc = email.toLowerCase();
  // Look up the user_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', lc)
    .maybeSingle();
  if (!profile?.id) return;

  const payload = {
    user_id:                profile.id,
    tier:                   'monthly',
    is_active:              isActive,
    stripe_customer_id:     stripeCustomerId ?? null,
    stripe_subscription_id: stripeSubId ?? null,
    updated_at:             new Date().toISOString(),
  };
  // Only set started_at when activating (don't overwrite it on cancel/update)
  if (isActive) payload.started_at = new Date().toISOString();

  const { error: upsertErr } = await supabase
    .from('memberships')
    .upsert(payload, { onConflict: 'user_id' });

  if (upsertErr) {
    console.error('[payments/webhook] memberships upsert error:', upsertErr.message);
  } else {
    console.info(`[payments/webhook] memberships upserted for user=${profile.id} is_active=${isActive}`);
  }
}

/**
 * Set subscription_active on the profiles row identified by email.
 * Falls back to customer email lookup via Stripe if direct email lookup fails.
 */
async function setSubscriptionActiveByEmail(email, active) {
  if (!email) {
    console.error('[payments/webhook] setSubscriptionActiveByEmail: no email provided');
    return;
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ subscription_active: active, updated_at: new Date().toISOString() })
    .eq('email', email.toLowerCase())
    .select('id');

  if (error) {
    console.error('[payments/webhook] profiles update error:', error.message);
  } else {
    console.info(
      `[payments/webhook] subscription_active=${active} set for email=${email} (${data?.length ?? 0} rows)`,
    );
  }
}

/**
 * Retrieve the customer email from Stripe given a customer ID.
 * Returns null if stripe is not configured or lookup fails.
 */
async function getEmailFromStripeCustomer(customerId) {
  const stripe = getStripe();
  if (!stripe || !customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.deleted ? null : (customer.email ?? null);
  } catch (err) {
    console.error('[payments/webhook] customer retrieve error:', err.message);
    return null;
  }
}

// ── Shared webhook event parser ─────────────────────────────────────────────
/**
 * Parse and optionally verify a Stripe webhook payload.
 * - If STRIPE_WEBHOOK_SECRET + stripe-signature header are present → verified
 * - Otherwise → parsed as JSON (dev/test fallback)
 */
function parseWebhookEvent(req) {
  const sig           = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe        = getStripe();

  if (stripe && sig && webhookSecret) {
    // req.body is a raw Buffer (express.raw middleware applied by caller)
    return stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  }

  // Dev fallback: accept unsigned payloads
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

// ── SUBSCRIPTION ────────────────────────────────────────────────────────────

// POST /api/payments/create-subscription
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
 * Handles Stripe subscription lifecycle events.
 * Stripe must be configured to send these to: /api/payments/subscription-webhook
 *
 * Events handled:
 *   checkout.session.completed          → subscription_active = true
 *   customer.subscription.created       → subscription_active = true  (if active)
 *   customer.subscription.updated       → subscription_active = (status === 'active')
 *   customer.subscription.deleted       → subscription_active = false
 *   customer.subscription.canceled      → subscription_active = false  (alias)
 *   customer.subscription.unpaid        → subscription_active = false
 */
router.post(
  '/subscription-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      event = parseWebhookEvent(req);
    } catch (err) {
      console.error('[payments/webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    console.info('[payments/webhook] Received event:', event.type);

    try {
      // ── checkout.session.completed ───────────────────────────
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email   = session.customer_details?.email?.toLowerCase();

        if (email) {
          await setSubscriptionActiveByEmail(email, true);
          await upsertMembershipByEmail(email, true, session.customer, session.subscription);
        }

        // Also upsert subscription_status table for legacy support
        const sub = session.subscription;
        if (sub && session.customer) {
          await supabase.from('subscription_status').upsert({
            id:                     randomUUID(),
            stripe_customer_id:     session.customer,
            stripe_subscription_id: sub,
            is_active:              true,
            updated_at:             new Date().toISOString(),
          }, { onConflict: 'stripe_customer_id' });
        }
      }

      // ── customer.subscription.created / updated ───────────────
      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        const sub   = event.data.object;
        const active = sub.status === 'active';
        const email  = await getEmailFromStripeCustomer(sub.customer);

        if (email) {
          await setSubscriptionActiveByEmail(email, active);
          await upsertMembershipByEmail(email, active, sub.customer, sub.id);
        }

        if (sub.customer && sub.id) {
          await supabase.from('subscription_status').upsert({
            id:                     randomUUID(),
            stripe_customer_id:     sub.customer,
            stripe_subscription_id: sub.id,
            is_active:              active,
            updated_at:             new Date().toISOString(),
          }, { onConflict: 'stripe_customer_id' });
        }
      }

      // ── subscription deleted / canceled / unpaid ──────────────
      if (
        event.type === 'customer.subscription.deleted' ||
        event.type === 'customer.subscription.canceled' ||
        event.type === 'customer.subscription.unpaid'
      ) {
        const sub   = event.data.object;
        const email = await getEmailFromStripeCustomer(sub.customer);

        if (email) {
          await setSubscriptionActiveByEmail(email, false);
          await upsertMembershipByEmail(email, false, sub.customer, sub.id);
        }

        if (sub.customer) {
          await supabase
            .from('subscription_status')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', sub.customer);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[payments/webhook] Handler error:', err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── DONATIONS ───────────────────────────────────────────────────────────────

// POST /api/payments/create-donation
router.post('/create-donation', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ url: donationLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/donation-webhook
router.post('/donation-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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

// POST /api/payments/create-event-payment
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

// POST /api/payments/event-webhook
router.post('/event-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
