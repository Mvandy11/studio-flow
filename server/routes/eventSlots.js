import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAuth(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  return user;
}

// POST /api/event-slots/create-slot
router.post('/create-slot', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { user_id, request_id, title, password, submission_id } = req.body;

    if (!title || !password) {
      return res.status(400).json({ error: 'title and password are required.' });
    }

    const { data, error } = await supabase
      .from('event_slots')
      .insert([{ user_id, request_id, title, password, submission_id }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[event-slots] create-slot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/event-slots/all
router.get('/all', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data, error } = await supabase
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

// GET /api/event-slots/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_slots')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event slot not found.' });
    res.json(data);
  } catch (err) {
    console.error('[event-slots] get one:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/event-slots/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { error } = await supabase
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
