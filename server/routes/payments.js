/**
 * /api/payments — Studio Flow payment endpoints.
 *
 * Uses Stripe Payment Links for collection.
 * Webhook at /api/payments/stripe-webhook handles:
 *   - checkout.session.completed  → record membership/event earnings in Supabase
 *   - transfer.paid               → confirm payout_logs row as completed
 *   - transfer.failed             → mark payout_logs row as failed, revert earnings to 'requested'
 */

import express from 'express';
import Stripe from 'stripe';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';
import { donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';

const router = express.Router();
const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Webhook secret from Stripe dashboard → Webhooks → your endpoint → Signing secret
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
// Handles: checkout.session.completed, transfer.paid, transfer.failed
// ─────────────────────────────────────────────────────────────
router.post('/stripe-webhook', async (req, res) => {
  // Verify signature
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

      // ── Stripe Connect transfer succeeded ────────────────────
      case 'transfer.paid': {
        const transfer = event.data.object;
        await handleTransferPaid(transfer);
        break;
      }

      // ── Stripe Connect transfer failed ───────────────────────
      case 'transfer.failed': {
        const transfer = event.data.object;
        await handleTransferFailed(transfer);
        break;
      }

      default:
        // Acknowledge but don't act on unhandled events
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${event.type}:`, err.message);
    logError(err, `/webhook/${event.type}`).catch(() => {});
    // Still return 200 — Stripe retries on non-2xx responses.
    // We log internally rather than letting Stripe spam retries.
  }

  return res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────
// Handler: checkout.session.completed
// Records earnings for membership payments and event ticket sales.
// ─────────────────────────────────────────────────────────────
async function handleCheckoutCompleted(session) {
  const amountTotal  = (session.amount_total ?? 0) / 100;   // cents → dollars
  const customerId   = session.customer;
  const refId        = session.client_reference_id;          // set by frontend on event payments
  const metadata     = session.metadata || {};
  const mode         = session.mode;                         // 'payment' | 'subscription'

  console.log(`[webhook/checkout] amount=$${amountTotal}, refId=${refId}, mode=${mode}`);

  // ── Membership payment: activate subscription + pool contribution ──
  if (mode === 'subscription' || metadata.type === 'membership') {
    // The frontend /membership/activate handles profile updates.
    // Here we just ensure the revenue_pool row is written if it isn't.
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

  // ── Event ticket payment: record earnings for creator ──────────────
  if (refId && metadata.creator_id) {
    const creatorId = metadata.creator_id;

    // Idempotency check — don't double-record
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

  // ── Donation: revenue_pool row (donations router handles the donations table) ──
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
// Handler: transfer.paid
// Confirms a Connect transfer succeeded — updates payout_logs.
// ─────────────────────────────────────────────────────────────
async function handleTransferPaid(transfer) {
  console.log(`[webhook/transfer.paid] transfer ${transfer.id} succeeded`);

  // Find the payout_log row that references this transfer
  const { data: logRow } = await supabaseAdmin
    .from('payout_logs')
    .select('id, user_id, status')
    .like('notes', `%${transfer.id}%`)
    .maybeSingle();

  if (!logRow) {
    console.warn(`[webhook/transfer.paid] No payout_log found for transfer ${transfer.id}`);
    return;
  }

  if (logRow.status === 'completed') {
    console.log(`[webhook/transfer.paid] payout_log ${logRow.id} already marked completed — skipping`);
    return;
  }

  await supabaseAdmin
    .from('payout_logs')
    .update({
      status:     'completed',
      notes:      `Stripe transfer ${transfer.id} confirmed paid`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logRow.id);

  console.log(`[webhook/transfer.paid] payout_log ${logRow.id} confirmed completed`);
}

// ─────────────────────────────────────────────────────────────
// Handler: transfer.failed
// Marks payout_logs as failed and reverts earnings to 'requested'
// so the admin can retry the payout.
// ─────────────────────────────────────────────────────────────
async function handleTransferFailed(transfer) {
  const failureMsg = transfer.failure_message || 'Unknown failure';
  console.error(`[webhook/transfer.failed] transfer ${transfer.id} FAILED: ${failureMsg}`);

  // Find the payout_log row
  const { data: logRow } = await supabaseAdmin
    .from('payout_logs')
    .select('id, user_id')
    .like('notes', `%${transfer.id}%`)
    .maybeSingle();

  if (!logRow) {
    console.warn(`[webhook/transfer.failed] No payout_log found for transfer ${transfer.id}`);
    return;
  }

  // Mark the payout log as failed
  await supabaseAdmin
    .from('payout_logs')
    .update({
      status:     'failed',
      notes:      `Stripe transfer ${transfer.id} FAILED: ${failureMsg}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logRow.id);

  // Revert earnings from 'paid' back to 'requested' so admin can retry
  const { data: reverted } = await supabaseAdmin
    .from('earnings')
    .update({ status: 'requested' })
    .eq('creator_id', logRow.user_id)
    .eq('status', 'paid')
    .select('id');

  console.error(
    `[webhook/transfer.failed] payout_log ${logRow.id} marked failed. ` +
    `Reverted ${reverted?.length ?? 0} earnings rows back to 'requested'.`
  );
}

// ─────────────────────────────────────────────────────────────
// Legacy no-op stubs (kept so existing Stripe webhook configs
// still acknowledge without errors during transition)
// ─────────────────────────────────────────────────────────────
router.post('/subscription-webhook', (req, res) => {
  console.log('[payments] subscription-webhook → forwarded, handled by /stripe-webhook');
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

