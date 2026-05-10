/**
 * /api/payments — Subscription, donation, and custom event payment endpoints.
 */
import express from 'express';
import { randomUUID } from 'crypto';
import supabase from '../supabase.js';
import { subscriptionLink, donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';

const router = express.Router();

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

// ── SUBSCRIPTION ──────────────────────────────────────────────

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

// POST /api/payments/subscription-webhook
router.post('/subscription-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data?.object;
      if (sub?.customer && sub?.id) {
        await supabase.from('subscription_status').upsert({
          id:                     randomUUID(),
          stripe_customer_id:     sub.customer,
          stripe_subscription_id: sub.id,
          is_active:              sub.status === 'active',
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'stripe_customer_id' });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data?.object;
      if (sub?.customer) {
        await supabase
          .from('subscription_status')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', sub.customer);
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DONATIONS ─────────────────────────────────────────────────

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
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

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
    res.status(400).json({ error: err.message });
  }
});

// ── CUSTOM EVENT PAYMENTS ─────────────────────────────────────

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
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

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
    res.status(400).json({ error: err.message });
  }
});

export default router;
