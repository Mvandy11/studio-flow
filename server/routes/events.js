import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();

function computeStatus(row) {
  if (row.status) return row.status;
  const start = row.start_time ? new Date(row.start_time).getTime() : null;
  if (!start || Date.now() < start) return 'upcoming';
  return 'ended';
}

function addComputed(row) {
  return {
    ...row,
    computed_status:     computeStatus(row),
    computed_event_type: row.event_type || 'live',
  };
}

/* ── GET /api/events ──────────────────────────────────────────── */
router.get('/', async (req, res) => {
  const { status, event_type } = req.query;
  try {
    let q = supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true, nullsFirst: false });

    if (status)     q = q.eq('status', status);
    if (event_type) q = q.eq('event_type', event_type);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: (data || []).map(addComputed) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/events/:id ─────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found.' });
    res.json({ data: addComputed(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/events (creator_admin only) ───────────────────── */
router.post('/', async (req, res) => {
  const {
    title, description, event_type = 'live', start_time, duration_minutes,
    price = 0, is_paid = false, location, thumbnail_url, video_url, live_room_id,
    status = 'upcoming', created_by,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required.' });

  try {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title, description, event_type, start_time, duration_minutes,
        price, is_paid, location, thumbnail_url, video_url, live_room_id,
        status, created_by,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH /api/events/:id (creator_admin only) ──────────────── */
router.patch('/:id', async (req, res) => {
  const allowed = [
    'title', 'description', 'event_type', 'start_time', 'duration_minutes',
    'price', 'is_paid', 'location', 'thumbnail_url', 'video_url', 'live_room_id', 'status',
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k)),
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided.' });
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found.' });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /api/events/:id (creator_admin only) ─────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
