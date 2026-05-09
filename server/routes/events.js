import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  );
}

/* ── GET /api/events ──────────────────────────────────────────── */
router.get('/', async (req, res) => {
  const { status, event_type } = req.query;
  try {
    let q = getClient()
      .from('events')
      .select('*')
      .order('start_time', { ascending: true, nullsFirst: false });

    if (status)     q = q.eq('status', status);
    if (event_type) q = q.eq('event_type', event_type);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/events/:id ─────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await getClient()
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found.' });
    res.json({ data });
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
  if (!event_type) return res.status(400).json({ error: 'event_type is required.' });

  try {
    const { data, error } = await getClient()
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
    const { data, error } = await getClient()
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
    const { error } = await getClient()
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
