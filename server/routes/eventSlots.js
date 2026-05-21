import express from 'express';
import { randomUUID } from 'crypto';
import supabaseAdmin from '../supabase/supabaseAdmin.js';

const router = express.Router();

// ── Auth helpers ────────────────────────────────────────────────

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

async function requireAdmin(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const r = profile?.role;
  if (r !== 'admin' && r !== 'creator_admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return user;
}

// ── POST /api/event-slots/create-slot  (admin) ──────────────────
router.post('/create-slot', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { user_id, request_id, title, password, submission_id } = req.body;

    if (!user_id || !title || !password) {
      return res.status(400).json({ error: 'user_id, title, and password are required.' });
    }

    const slotId    = randomUUID();
    const streamKey = `sf-${randomUUID()}`;

    // 1. Create the event_slot
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .insert([{
        id:            slotId,
        user_id,
        request_id:    request_id || null,
        title:         title.trim(),
        password,
        submission_id: submission_id || null,
        stream_key:    streamKey,
      }])
      .select()
      .single();

    if (slotErr) throw slotErr;

    // 2. Pre-create linked events row so the slot page can show it
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .insert({
        id:            randomUUID(),
        title:         title.trim(),
        created_by:    user_id,
        creator_id:    user_id,
        event_mode:    null,
        stream_key:    streamKey,
        live_room_id:  slotId,
        stage_room_id: slotId,
        status:        'upcoming',
      })
      .select()
      .single();

    if (eventErr) {
      console.error('[event-slots] events row error:', eventErr.message);
    }

    res.status(201).json({ slot, event: event || null, stream_key: streamKey });
  } catch (err) {
    console.error('[event-slots] create-slot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/event-slots/all  (auth required) ───────────────────
router.get('/all', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[event-slots] all:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/event-slots/:id  (public) — includes linked event ──
router.get('/:id', async (req, res) => {
  try {
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (slotErr) throw slotErr;
    if (!slot) return res.status(404).json({ error: 'Event slot not found.' });

    // Fetch linked events row (created at slot approval time)
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, event_mode, stream_key, stream_url, video_url, status, title')
      .eq('live_room_id', req.params.id)
      .maybeSingle();

    res.json({ slot, event: event || null });
  } catch (err) {
    console.error('[event-slots] get one:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/event-slots/:id  (owner or admin) ───────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data: slot } = await supabaseAdmin
      .from('event_slots')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!slot) return res.status(404).json({ error: 'Slot not found.' });

    // Check ownership or admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';
    if (!isAdmin && slot.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { error } = await supabaseAdmin
      .from('event_slots')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[event-slots] delete:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
