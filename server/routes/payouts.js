/**
 * POST /api/payouts/record-earning
 *   Called by PaymentSuccess page after a ticket purchase.
 *   Looks up the event creator and records 98% of ticket price as earnings.
 *
 * POST /api/payouts/request
 *   Marks a creator's pending earnings as 'requested' for manual payout.
 */
import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// POST /api/payouts/record-earning
router.post('/record-earning', async (req, res) => {
  const { eventId, contestId, amount, ticketType } = req.body;

  if (!amount || (!eventId && !contestId)) {
    return res.status(400).json({ error: 'amount and eventId or contestId are required.' });
  }

  let creatorId = null;

  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('creator_id, user_id')
      .eq('id', eventId)
      .maybeSingle();

    creatorId = event?.creator_id || event?.user_id || null;
  }

  if (!creatorId) {
    return res.json({ recorded: false, reason: 'no_creator_found' });
  }

  const creatorShare = Math.round(Number(amount) * 0.98 * 100) / 100;

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
    return res.status(500).json({ error: error.message });
  }

  return res.json({ recorded: true, creatorShare });
});

// POST /api/payouts/request
router.post('/request', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

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

  const { data, error } = await supabase
    .from('earnings')
    .update({ status: 'requested' })
    .eq('creator_id', userId)
    .eq('status', 'pending')
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    requested:    true,
    rowsUpdated:  data?.length ?? 0,
    payoutMethod: settings.payout_method,
  });
});

export default router;
