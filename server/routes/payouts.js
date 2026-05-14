/**
 * POST /api/payouts/record-earning   — record 98% creator share after ticket purchase
 * POST /api/payouts/request          — mark pending earnings as 'requested'
 * POST /api/payouts/initiate         — admin: initiate a payout (logs it)
 * POST /api/payouts/complete         — admin: mark a payout complete
 * GET  /api/payouts/history          — creator: fetch own payout_logs
 */
import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

/* ── helpers ────────────────────────────────────────────────── */
async function getAuthUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
  return user ?? null;
}

async function requireAdmin(req, res) {
  const user = await getAuthUser(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'creator_admin') { res.status(403).json({ error: 'Admin access required.' }); return null; }
  return user;
}

/* ── POST /api/payouts/record-earning ───────────────────────── */
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

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ recorded: true, creatorShare });
});

/* ── POST /api/payouts/request ──────────────────────────────── */
router.post('/request', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required.' });

  const { data: settings } = await supabase
    .from('creator_settings')
    .select('payout_method')
    .eq('creator_id', userId)
    .maybeSingle();

  if (!settings?.payout_method) {
    return res.status(400).json({
      error: 'No payout method configured. Please set one up in Payout Settings.',
    });
  }

  const { data, error } = await supabase
    .from('earnings')
    .update({ status: 'requested' })
    .eq('creator_id', userId)
    .eq('status', 'pending')
    .select();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    requested:    true,
    rowsUpdated:  data?.length ?? 0,
    payoutMethod: settings.payout_method,
  });
});

/* ── POST /api/payouts/initiate (admin) ─────────────────────── */
router.post('/initiate', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { userId, eventId, amount, method, note } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId and amount are required.' });

  // Look up the user's payout method if not supplied
  let payoutMethod = method;
  let payoutAccount = null;

  if (!payoutMethod) {
    const { data: settings } = await supabase
      .from('creator_settings')
      .select('payout_method, paypal, venmo, stripe, cashapp')
      .eq('creator_id', userId)
      .maybeSingle();

    payoutMethod = settings?.payout_method || null;
    if (payoutMethod) {
      payoutAccount = settings?.[payoutMethod] || null;
    }
  }

  if (!payoutMethod) {
    return res.status(422).json({
      error: 'Winner has not set up a payout method.',
      payoutMethod: null,
    });
  }

  const { data: log, error: logErr } = await supabase
    .from('payout_logs')
    .insert({
      user_id:  userId,
      event_id: eventId || null,
      amount:   Number(amount),
      method:   payoutMethod,
      status:   'processing',
      notes:    note || null,
    })
    .select()
    .single();

  if (logErr) return res.status(500).json({ error: logErr.message });

  return res.json({
    initiated:    true,
    logId:        log.id,
    payoutMethod,
    payoutAccount,
    amount:       Number(amount),
  });
});

/* ── POST /api/payouts/complete (admin) ─────────────────────── */
router.post('/complete', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { logId, status } = req.body;
  if (!logId) return res.status(400).json({ error: 'logId is required.' });

  const finalStatus = ['completed', 'failed'].includes(status) ? status : 'completed';

  const { error } = await supabase
    .from('payout_logs')
    .update({ status: finalStatus })
    .eq('id', logId);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ updated: true, status: finalStatus });
});

/* ── GET /api/payouts/history ───────────────────────────────── */
router.get('/history', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { data, error } = await supabase
    .from('payout_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ logs: data || [] });
});

export default router;
