/**
 * /api/payments — Studio Flow payment endpoints.
 *
 * Uses Stripe Payment Links for collection.
 * Webhook at /api/payments/stripe-webhook handles:
 *   - checkout.session.completed     → record membership/event earnings in Supabase
 *   - transfer.created               → confirm payout_logs row as completed
 *   - transfer.reversed              → mark payout_logs row as failed, revert earnings to 'requested'
 *   - customer.subscription.deleted  → auto-deactivate membership on Stripe-side cancellation
 */

import express from 'express';
import Stripe from 'stripe';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';
import { donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';

const router = express.Router();
const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ─────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// UNIFIED STRIPE WEBHOOK
// ─────────────────────────────────────────────────────────────
router.post('/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!WEBHOOK_SECRET) {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification.');
  }

  let event;
  try {
    event = WEBHOOK_SECRET
      ? stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
      : JSON.parse(req.body.toString());
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  console.log(`[webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {

      // ── Payment Link purchase completed ──────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      // ── Founding member subscription created ──────────────────
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;
      }

      // ── Invoice paid (recurring founding member payment) ──────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      // ── Connect transfer created (success) ────────────────────
      case 'transfer.created': {
        const transfer = event.data.object;
        await handleTransferPaid(transfer);
        break;
      }

      // ── Connect transfer reversed (failure) ───────────────────
      case 'transfer.reversed': {
        const transfer = event.data.object;
        await handleTransferFailed(transfer);
        break;
      }

      // ── Stripe-side subscription cancellation ─────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${event.type}:`, err.message);
    logError(err, `/webhook/${event.type}`).catch(() => {});
    // Return 200 — Stripe retries on non-2xx. We log internally instead.
  }

  return res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────
// Handler: checkout.session.completed
// ─────────────────────────────────────────────────────────────
async function handleCheckoutCompleted(session) {
  const amountTotal = (session.amount_total ?? 0) / 100;
  const refId       = session.client_reference_id;
  const metadata    = session.metadata || {};
  const mode        = session.mode;
  const customerId  = session.customer; // ← Stripe customer ID

  console.log(`[webhook/checkout] amount=$${amountTotal}, refId=${refId}, mode=${mode}, customer=${customerId}`);

  // ── Membership payment ────────────────────────────────────────
  if (mode === 'subscription' || metadata.type === 'membership') {

    // Save stripe_customer_id to the profile so subscription.deleted
    // can find the right user later
    if (customerId && refId) {
      const { error: cidErr } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', refId)
        .is('stripe_customer_id', null); // only write if not already set

      if (cidErr) {
        console.warn(`[webhook/checkout] Could not save stripe_customer_id: ${cidErr.message}`);
      } else {
        console.log(`[webhook/checkout] stripe_customer_id ${customerId} saved to profile ${refId}`);
      }
    }

    if (amountTotal > 0) {
      const { data: existing } = await supabaseAdmin
        .from('revenue_pool')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from('revenue_pool').insert({
          stripe_session_id: session.id,
          amount:            amountTotal,
          type:              'membership',
          status:            'received',
          created_at:        new Date().toISOString(),
        });
        console.log(`[webhook/checkout] revenue_pool row inserted for membership $${amountTotal}`);
      }
    }
    return;
  }

  // ── Event ticket payment ──────────────────────────────────────
  if (refId && metadata.creator_id) {
    const creatorId = metadata.creator_id;

    const { data: existing } = await supabaseAdmin
      .from('earnings')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existing) {
      console.log(`[webhook/checkout] earnings already recorded for session ${session.id} — skipping`);
      return;
    }

    await supabaseAdmin.from('earnings').insert({
      creator_id:        creatorId,
      amount:            amountTotal,
      source:            metadata.source || 'event_ticket',
      status:            'pending',
      stripe_session_id: session.id,
      notes:             `Payment Link — session ${session.id}`,
      created_at:        new Date().toISOString(),
    });

    console.log(`[webhook/checkout] earnings recorded: $${amountTotal} for creator ${creatorId}`);
    return;
  }

  // ── Donation ──────────────────────────────────────────────────
  if (metadata.type === 'donation') {
    const { data: existing } = await supabaseAdmin
      .from('revenue_pool')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('revenue_pool').insert({
        stripe_session_id: session.id,
        amount:            amountTotal,
        type:              'donation',
        status:            'received',
        created_at:        new Date().toISOString(),
      });
    }
    return;
  }

  console.log(`[webhook/checkout] session ${session.id} has no handler — logged only.`);
}

// ─────────────────────────────────────────────────────────────
// Handler: transfer.created — confirms payout_logs
// ─────────────────────────────────────────────────────────────
async function handleTransferPaid(transfer) {
  console.log(`[webhook/transfer.created] transfer ${transfer.id} confirmed`);

  const { data: logRow } = await supabaseAdmin
    .from('payout_logs')
    .select('id, user_id, status')
    .like('notes', `%${transfer.id}%`)
    .maybeSingle();

  if (!logRow) {
    console.warn(`[webhook/transfer.created] No payout_log found for transfer ${transfer.id}`);
    return;
  }

  if (logRow.status === 'completed') {
    console.log(`[webhook/transfer.created] payout_log ${logRow.id} already completed — skipping`);
    return;
  }

  await supabaseAdmin
    .from('payout_logs')
    .update({
      status:     'completed',
      notes:      `Stripe transfer ${transfer.id} confirmed created`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logRow.id);

  console.log(`[webhook/transfer.created] payout_log ${logRow.id} marked completed`);
}

// ─────────────────────────────────────────────────────────────
// Handler: transfer.reversed — marks failed, reverts earnings
// ─────────────────────────────────────────────────────────────
async function handleTransferFailed(transfer) {
  const failureMsg = transfer.reversal?.description || transfer.description || 'Transfer reversed';

  console.error(`[webhook/transfer.reversed] transfer ${transfer.id} reversed: ${failureMsg}`);

  const { data: logRow } = await supabaseAdmin
    .from('payout_logs')
    .select('id, user_id')
    .like('notes', `%${transfer.id}%`)
    .maybeSingle();

  if (!logRow) {
    console.warn(`[webhook/transfer.reversed] No payout_log found for transfer ${transfer.id}`);
    return;
  }

  await supabaseAdmin
    .from('payout_logs')
    .update({
      status:     'failed',
      notes:      `Stripe transfer ${transfer.id} reversed: ${failureMsg}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logRow.id);

  const { data: reverted } = await supabaseAdmin
    .from('earnings')
    .update({ status: 'requested' })
    .eq('creator_id', logRow.user_id)
    .eq('status', 'paid')
    .select('id');

  console.error(
    `[webhook/transfer.reversed] payout_log ${logRow.id} marked failed. ` +
    `Reverted ${reverted?.length ?? 0} earnings rows back to 'requested'.`
  );
}

// ─────────────────────────────────────────────────────────────
// Handler: customer.subscription.deleted
// Auto-fires when Stripe cancels a subscription (failed payment,
// admin cancel, or member cancels via Stripe portal).
// ─────────────────────────────────────────────────────────────
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  console.log(`[webhook/subscription.deleted] customer ${customerId} subscription cancelled`);

  if (!customerId) return;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username, membership_tier')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) {
    console.warn(`[webhook/subscription.deleted] No profile found for customer ${customerId}`);
    return;
  }

  // Only update if still active — prevents double-processing manual cancels
  const { data: updated } = await supabaseAdmin
    .from('profiles')
    .update({
      membership_active:       false,
      membership_tier:         'free',
      subscription_active:     false,
      membership_cancelled_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .eq('membership_active', true)
    .select('id');

  if (updated?.length) {
    console.log(`[webhook/subscription.deleted] Auto-cancelled membership for ${profile.email}`);
  } else {
    console.log(`[webhook/subscription.deleted] ${profile.email} already inactive — skipped`);
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: insert revenue_pool_entries row for founding member
// ─────────────────────────────────────────────────────────────
async function insertRevenuePoolEntry(memberId, amountTotal) {
  if (!memberId || amountTotal !== 25) return;
  const month = new Date().toISOString().slice(0, 7);
  const { error } = await supabaseAdmin.from('revenue_pool_entries').insert({
    member_id:           memberId,
    amount_total:        25.00,
    contest_allocation:  10.00,
    platform_allocation: 15.00,
    tier:                'founding',
    month,
    created_at:          new Date().toISOString(),
  });
  if (error) {
    console.warn('[webhook/revenue_pool_entries] insert error:', error.message);
  } else {
    console.log(`[webhook/revenue_pool_entries] inserted for member ${memberId} month ${month}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Handler: customer.subscription.created
// ─────────────────────────────────────────────────────────────
async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer;
  const amountTotal = (subscription.plan?.amount ?? 0) / 100;
  console.log(`[webhook/subscription.created] customer=${customerId} amount=$${amountTotal}`);

  if (!customerId) return;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) {
    console.warn(`[webhook/subscription.created] No profile for customer ${customerId}`);
    return;
  }

  await insertRevenuePoolEntry(profile.id, amountTotal);
}

// ─────────────────────────────────────────────────────────────
// Handler: invoice.payment_succeeded
// ─────────────────────────────────────────────────────────────
async function handleInvoicePaid(invoice) {
  const customerId  = invoice.customer;
  const amountTotal = (invoice.amount_paid ?? 0) / 100;
  console.log(`[webhook/invoice.payment_succeeded] customer=${customerId} amount=$${amountTotal}`);

  if (!customerId) return;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) {
    console.warn(`[webhook/invoice.payment_succeeded] No profile for customer ${customerId}`);
    return;
  }

  await insertRevenuePoolEntry(profile.id, amountTotal);
}

// ─────────────────────────────────────────────────────────────
// Legacy no-op stubs
// ─────────────────────────────────────────────────────────────
router.post('/subscription-webhook', (req, res) => {
  console.log('[payments] subscription-webhook → handled by /stripe-webhook');
  res.json({ received: true });
});

router.post('/donation-webhook', (req, res) => {
  res.json({ received: true });
});

router.post('/event-webhook', (req, res) => {
  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────
// DONATION LINK REDIRECT
// ─────────────────────────────────────────────────────────────
router.post('/create-donation', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ url: donationLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CUSTOM EVENT PAYMENTS
// ─────────────────────────────────────────────────────────────
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

export default router;
