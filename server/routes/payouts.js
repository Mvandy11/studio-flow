/**
 * POST /api/payouts/record-earning
 *   Called by PaymentSuccess page after a ticket purchase.
 *   Looks up the event creator and records 80% of ticket price as earnings.
 *
 * POST /api/payouts/request
 *   Marks a creator's pending earnings as 'requested' for manual payout.
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── POST /api/payouts/record-earning ─────────────────────────
router.post('/record-earning', async (req, res) => {
  const { eventId, contestId, amount, ticketType, buyerUserId } = req.body;

  if (!amount || (!eventId && !contestId)) {
    return res.status(400).json({ error: 'amount and eventId or contestId are required.' });
  }

  const supabase = getServiceClient();
  let creatorId  = null;

  // Look up the event creator from the events table
  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('creator_id, user_id')
      .eq('id', eventId)
      .maybeSingle();

    creatorId = event?.creator_id || event?.user_id || null;
  }

  // For contests the creator is the platform itself — skip earnings record
  // (platform keeps 100% of contest ticket revenue; prize pool is separate)
  if (!creatorId) {
    return res.json({ recorded: false, reason: 'no_creator_found' });
  }

  const creatorShare = Math.round(Number(amount) * 0.8 * 100) / 100;

  // Fetch the creator's current payout method
  const { data: settings } = await supabase
    .from('creator_settings')
    .select('payout_method')
    .eq('creator_id', creatorId)
    .maybeSingle();

  const { error } = await supabase.from('earnings').insert({
    creator_id:    creatorId,
    event_id:      eventId   || null,
    contest_id:    contestId || null,
    amount:        creatorShare,
    source:        ticketType === 'contest' ? 'contest_prize' : 'ticket_sale',
    status:        'pending',
    payout_method: settings?.payout_method || null,
  });

  if (error) {
    console.error('[payouts] record-earning insert error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ recorded: true, creatorShare });
});

// ── POST /api/payouts/request ─────────────────────────────────
router.post('/request', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  const supabase = getServiceClient();

  // Verify there is a payout method configured
  const { data: settings } = await supabase
    .from('creator_settings')
    .select('payout_method')
    .eq('creator_id', userId)
    .maybeSingle();

  if (!settings?.payout_method) {
    return res.status(400).json({
      error: 'No payout method configured. Please set one up in Premier Settings.',
    });
  }

  // Mark pending earnings as 'requested'
  const { data, error } = await supabase
    .from('earnings')
    .update({ status: 'requested' })
    .eq('creator_id', userId)
    .eq('status', 'pending')
    .select();

  if (error) {
    console.error('[payouts] request error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    requested:   true,
    rowsUpdated: data?.length ?? 0,
    payoutMethod: settings.payout_method,
  });
});

export default router;
