/**
 * Donations
 * Mounted at /api/donations by app.js.
 *
 * POST /api/donations/record
 *   Records a donation after a successful Stripe Payment Link redirect.
 *   Auth is optional — guest donations are recorded without a user_id.
 *   The server fetches the event slot to get the authoritative creator_id,
 *   so the client cannot spoof which creator receives the donation credit.
 *
 *   Body: { event_id, amount, donor_name?, donor_email? }
 */

import { Router } from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';

const router = Router();

const MAX_DONATION   = 10_000;
const DEFAULT_AMOUNT = 5;

// ── Helper: extract user from Bearer token (optional auth) ────────────────────
async function tryGetUser(req) {
  const header = req.headers.authorization || '';
  const jwt    = header.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !user) return null;
  return user;
}

// ── POST /api/donations/record ────────────────────────────────────────────────
router.post('/record', async (req, res) => {
  try {
    const user = await tryGetUser(req);

    const { event_id, amount, donor_name, donor_email } = req.body || {};

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required.' });
    }

    const donationAmount = Number(amount) > 0 ? Number(amount) : DEFAULT_AMOUNT;
    if (donationAmount > MAX_DONATION) {
      return res.status(400).json({ error: `Donation amount exceeds maximum ($${MAX_DONATION}).` });
    }

    // Fetch the event slot to get the authoritative creator_id
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .select('id, title, creator_id, user_id')
      .eq('id', event_id)
      .maybeSingle();

    if (slotErr) throw slotErr;
    if (!slot) return res.status(404).json({ error: 'Event not found.' });

    // creator_id may be populated via back-fill; fall back to user_id
    const creatorId = slot.creator_id ?? slot.user_id ?? null;

    // Insert donation row
    const { data: donation, error: insertErr } = await supabaseAdmin
      .from('donations')
      .insert({
        event_id:    event_id,
        creator_id:  creatorId,
        user_id:     user?.id ?? null,
        amount:      donationAmount,
        donor_name:  donor_name  ?? null,
        donor_email: donor_email ?? null,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    // Insert revenue pool entry (only when creator is known)
    if (creatorId) {
      const { error: poolErr } = await supabaseAdmin
        .from('revenue_pool_entries')
        .insert({
          creator_id: creatorId,
          amount:     donationAmount,
          source:     'donation',
        });
      if (poolErr) console.warn('[donations/record] revenue_pool_entries insert failed:', poolErr.message);
    }

    console.log(`[donations/record] ✅ donation=${donation.id} event=${event_id} creator=${creatorId} amount=${donationAmount} user=${user?.id ?? 'guest'}`);
    res.json({ success: true, donation_id: donation.id, event_title: slot.title });
  } catch (err) {
    console.error('[donations/record] error:', err.message);
    await logError(err, '/api/donations/record');
    res.status(500).json({ error: err.message });
  }
});

export default router;
