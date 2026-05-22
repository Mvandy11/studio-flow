import express from 'express';
import { randomUUID } from 'crypto';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError } from '../utils/logError.js';

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

// ── POST /api/slots  (admin creates a slot, linked to a new events row) ──────
router.post('/', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { user_id, title, password, submission_id, request_id, start_time, end_time } = req.body;

    if (!user_id || !title || !password) {
      return res.status(400).json({ error: 'user_id, title, and password are required.' });
    }

    // Time validation
    if (start_time && end_time) {
      const start = new Date(start_time);
      const end   = new Date(end_time);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'start_time and end_time must be valid ISO timestamps.' });
      }
      if (end <= start) {
        return res.status(400).json({ error: 'end_time must be after start_time.' });
      }
    }

    // Duplicate check — same user + same title
    const { data: existing } = await supabaseAdmin
      .from('event_slots')
      .select('id')
      .eq('user_id', user_id)
      .ilike('title', title.trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'A slot with this title already exists for this user.' });
    }

    const slotId    = randomUUID();
    const streamKey = `sf-${randomUUID()}`;

    // Create slot
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .insert([{
        id:            slotId,
        user_id,
        title:         title.trim(),
        password,
        submission_id: submission_id || null,
        request_id:    request_id    || null,
        start_time:    start_time    || null,
        end_time:      end_time      || null,
        stream_key:    streamKey,
      }])
      .select()
      .single();

    if (slotErr) throw slotErr;

    // Create linked events row
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
        start_time:    start_time || null,
        status:        'upcoming',
      })
      .select()
      .single();

    if (eventErr) {
      console.error('[slots/POST] events row error:', eventErr.message);
    }

    console.log(`[slots/create] ✅ slot_id=${slotId} event_id=${eventId || '(none)'} stream_key=${streamKey} user_id=${userId}`);
    return res.status(201).json({ slot, event: event || null, stream_key: streamKey });
  } catch (err) {
    console.error('[slots/POST]', err.message);
    await logError(err, '/api/slots');
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/slots/manual-create  (legacy alias — admin only) ──────────────
router.post('/manual-create', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { user_id, title, password, submission_id, request_id } = req.body;

    if (!title || !password) {
      return res.status(400).json({ error: 'title and password are required.' });
    }

    const streamKey = `sf-${randomUUID()}`;

    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .insert([{
        user_id,
        title:         title.trim(),
        password,
        submission_id: submission_id || null,
        request_id:    request_id    || null,
        stream_key:    streamKey,
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ ...data, stream_key: streamKey });
  } catch (err) {
    console.error('[slots/manual-create]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/slots/assign-submission ───────────────────────────────────────
router.post('/assign-submission', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { slot_id, submission_id } = req.body;

    if (!slot_id || !submission_id) {
      return res.status(400).json({ error: 'slot_id and submission_id are required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .update({ submission_id })
      .eq('id', slot_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Slot not found.' });
    return res.json(data);
  } catch (err) {
    console.error('[slots/assign-submission]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/slots/user/:user_id  (auth required) ────────────────────────────
router.get('/user/:user_id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Only allow own slots unless admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';
    if (!isAdmin && user.id !== req.params.user_id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[slots/user]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/slots/:id/event-mode  (slot owner sets live or recorded) ──────
router.patch('/:id/event-mode', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { event_mode, video_url } = req.body;
    if (!event_mode || !['live', 'recorded'].includes(event_mode)) {
      return res.status(400).json({ error: 'event_mode must be "live" or "recorded".' });
    }

    // Verify ownership
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (slotErr || !slot) return res.status(404).json({ error: 'Slot not found.' });
    if (slot.user_id !== user.id) return res.status(403).json({ error: 'Forbidden.' });

    // Update slot
    const slotUpdates = { event_mode };
    if (event_mode === 'recorded' && video_url) slotUpdates.video_url = video_url;

    const { data: updatedSlot, error: updateErr } = await supabaseAdmin
      .from('event_slots')
      .update(slotUpdates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Propagate to linked events row
    const eventUpdates = { event_mode, updated_at: new Date().toISOString() };
    if (event_mode === 'recorded' && video_url) eventUpdates.video_url = video_url;

    await supabaseAdmin
      .from('events')
      .update(eventUpdates)
      .eq('live_room_id', req.params.id);

    return res.json({ slot: updatedSlot, event_mode });
  } catch (err) {
    console.error('[slots/event-mode]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
