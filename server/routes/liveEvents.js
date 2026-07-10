/**
 * Live Event Workflow
 *
 * Mounted at /api/live by app.js.
 *
 * Routes:
 *   GET  /api/live/slot/:slotId          — fetch slot + linked event (auth required for stream credentials)
 *   POST /api/live/slot/:slotId/start    — set slot + event status = 'live'    (slot owner only)
 *   POST /api/live/slot/:slotId/end      — set slot + event status = 'ended'   (slot owner only)
 */

import { Router } from 'express';
import { supabase as supabaseAdmin } from '../supabase/client.js';
import { logError } from '../utils/logError.js';

const router = Router();

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(h.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

async function getSlotAndOwner(slotId, userId, res) {
  const { data: slot, error } = await supabaseAdmin
    .from('event_slots')
    .select('*')
    .eq('id', slotId)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return null; }
  if (!slot)  { res.status(404).json({ error: 'Event slot not found.' }); return null; }

  if (slot.user_id !== userId) {
    res.status(403).json({ error: 'You do not own this event slot.' });
    return null;
  }
  return slot;
}

// ── GET /api/live/slot/:slotId ────────────────────────────────────────────────
// Returns full slot data (including stream credentials) + linked event row.
// Callers who are the slot owner get all fields; unauthenticated callers only
// see public-safe fields (no stream_key / stream_url).
router.get('/slot/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params;
    const user = await getUser(req);  // may be null

    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();

    if (slotErr) return res.status(500).json({ error: slotErr.message });
    if (!slot)   return res.status(404).json({ error: 'Event slot not found.' });

    // Fetch the linked events row
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, title, event_mode, stream_key, stream_url, video_url, status, is_paid, price')
      .eq('live_room_id', slotId)
      .maybeSingle();

    // Strip sensitive credentials from non-owners
    const isOwner = user && user.id === slot.user_id;
    const safeSlot = isOwner ? slot : { ...slot, stream_key: undefined, stream_url: undefined, password: undefined };

    res.json({ slot: safeSlot, event: event || null });
  } catch (err) {
    console.error('[live] get slot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/live/slot/:slotId/start ────────────────────────────────────────
// Set slot.status = 'live' and event.status = 'live'. Slot owner only.
router.post('/slot/:slotId/start', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { slotId } = req.params;
    const slot = await getSlotAndOwner(slotId, user.id, res);
    if (!slot) return;

    // Update slot status
    const { error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .update({ status: 'live' })
      .eq('id', slotId);

    if (slotErr) throw slotErr;

    // Update linked event status
    await supabaseAdmin
      .from('events')
      .update({ status: 'live' })
      .eq('live_room_id', slotId);

    console.log(`[live/start] ✅ slot_id=${slotId} user_id=${user.id}`);
    res.json({ success: true, status: 'live' });
  } catch (err) {
    console.error('[live] start:', err.message);
    await logError(err, `/api/live/slot/${req.params?.slotId}/start`);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/live/slot/:slotId/end ──────────────────────────────────────────
// Set slot.status = 'ended' and event.status = 'ended'. Slot owner only.
router.post('/slot/:slotId/end', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { slotId } = req.params;
    const slot = await getSlotAndOwner(slotId, user.id, res);
    if (!slot) return;

    // Update slot status
    const { error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .update({ status: 'ended' })
      .eq('id', slotId);

    if (slotErr) throw slotErr;

    // Update linked event status
    await supabaseAdmin
      .from('events')
      .update({ status: 'ended' })
      .eq('live_room_id', slotId);

    console.log(`[live/end] ✅ slot_id=${slotId} user_id=${user.id}`);
    res.json({ success: true, status: 'ended' });
  } catch (err) {
    console.error('[live] end:', err.message);
    await logError(err, `/api/live/slot/${req.params?.slotId}/end`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
