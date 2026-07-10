/**
 * /api/admin/payout
 *
 * GET  /list             — admin: all creators with pending earnings + payout info
 * POST /stripe           — admin: execute Stripe transfer to connected account
 * POST /manual-complete  — admin: mark a non-Stripe payout as paid
 */
import { Router } from 'express';
import Stripe from 'stripe';
import { supabase as supabaseAdmin } from '../supabase/client.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

async function requireAdmin(req, res) {
  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
  if (!user) { res.status(401).json({ error: 'Invalid token.' }); return null; }
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') { res.status(403).json({ error: 'Admin access required.' }); return null; }
  return user;
}

// ── GET /api/admin/payout/list ───────────────────────────────────────────────
router.get('/payout/list', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { data, error } = await supabaseAdmin
    .from('admin_payout_overview')
    .select('*');

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ creators: data || [] });
});

// ── POST /api/admin/payout/stripe ────────────────────────────────────────────
// Executes a real Stripe transfer from your platform account to the creator.
router.post('/payout/stripe', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { creatorId, amountDollars, note } = req.body;
  if (!creatorId || !amountDollars) {
    return res.status(400).json({ error: 'creatorId and amountDollars are required.' });
  }

  try {
    // Get creator's connect ID
    const { data: settings } = await supabaseAdmin
      .from('creator_settings')
      .select('stripe_connect_id, stripe_connect_onboarded')
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (!settings?.stripe_connect_id || !settings?.stripe_connect_onboarded) {
      return res.status(422).json({ error: 'Creator does not have an active Stripe Connect account.' });
    }

    const amountCents = Math.round(Number(amountDollars) * 100);
    if (amountCents < 100) {
      return res.status(400).json({ error: 'Minimum payout is $1.00.' });
    }

    // Execute the transfer
    const transfer = await stripe.transfers.create({
      amount:             amountCents,
      currency:           'usd',
      destination:        settings.stripe_connect_id,
      description:        note || 'Studio Flow creator payout',
      metadata:           { creator_id: creatorId, admin_id: admin.id },
    });

    // Log it
    await supabaseAdmin.from('payout_logs').insert({
      user_id: creatorId,
      amount:  Number(amountDollars),
      method:  'stripe',
      status:  'completed',
      notes:   `Stripe transfer ${transfer.id}`,
    });

    // Mark earnings paid
    await supabaseAdmin
      .from('earnings')
      .update({ status: 'paid' })
      .eq('creator_id', creatorId)
      .in('status', ['pending', 'requested']);

    return res.json({ success: true, transferId: transfer.id, amount: amountDollars });
  } catch (err) {
    console.error('[admin/payout/stripe]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/payout/manual-complete ───────────────────────────────────
// For PayPal / Venmo / CashApp — admin confirms they manually sent funds.
router.post('/payout/manual-complete', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { creatorId, amountDollars, method, note } = req.body;
  if (!creatorId || !amountDollars || !method) {
    return res.status(400).json({ error: 'creatorId, amountDollars, and method are required.' });
  }

  // Log the manual payout
  await supabaseAdmin.from('payout_logs').insert({
    user_id: creatorId,
    amount:  Number(amountDollars),
    method,
    status:  'completed',
    notes:   note || `Manual ${method} payout confirmed by admin`,
  });

  // Mark earnings paid
  await supabaseAdmin
    .from('earnings')
    .update({ status: 'paid' })
    .eq('creator_id', creatorId)
    .in('status', ['pending', 'requested']);

  return res.json({ success: true });
});

export default router;
