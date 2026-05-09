import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  );
}

function isAdmin(req) {
  return req.user?.role === 'creator_admin';
}

/* ── GET /api/events ──────────────────────────────────────────── */
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getClient()
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true });

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

/* ── POST /api/events (admin only) ──────────────────────────── */
router.post('/', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only.' });

  const { title, description, price, event_type, starts_at, location, image_url } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required.' });

  try {
    const { data, error } = await getClient()
      .from('events')
      .insert([{ title, description, price, event_type, starts_at, location, image_url }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /api/events/:id (admin only) ─────────────────────── */
router.delete('/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only.' });

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
