/**
 * /api/payments — Studio Flow 2.0 payment endpoints.
 *
 * Studio Flow 2.0 uses Stripe Payment Links only.
 * No server-side Stripe SDK, no subscription objects, no webhook verification.
 *
 * Membership is activated by the frontend redirect:
 *   /membership/success?tier=<tier> → POST /api/membership/activate
 *
 * These webhook endpoints exist only to acknowledge Stripe pings and
 * prevent automatic retries. No database writes are performed here.
 */
import express from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';
import { donationLink, eventPaymentBaseLink } from '../config/stripeLinks.js';
import { randomUUID } from 'crypto';

const router = express.Router();

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

// ── SUBSCRIPTION WEBHOOK (no-op acknowledge) ──────────────────────────────────
router.post('/subscription-webhook', (req, res) => {
  console.log('[payments] subscription-webhook acknowledged (no-op — Payment Links model)');
  res.json({ received: true });
});

// ── DONATION WEBHOOK (no-op acknowledge) ──────────────────────────────────────
// Donation records are inserted by /donate/success which has full context.
router.post('/donation-webhook', (req, res) => {
  res.json({ received: true });
});

// ── DONATION LINK REDIRECT ────────────────────────────────────────────────────
router.post('/create-donation', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ url: donationLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// ── EVENT WEBHOOK (no-op acknowledge) ────────────────────────────────────────
router.post('/event-webhook', (req, res) => {
  res.json({ received: true });
});

export default router;
