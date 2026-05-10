import express from 'express';
import { randomUUID } from 'crypto';
import supabase from '../supabase.js';

const router = express.Router();

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

// POST /api/likes — like an entry (idempotent)
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { entry_id } = req.body;
    if (!entry_id) return res.status(400).json({ error: 'entry_id is required.' });

    const { error } = await supabase
      .from('likes')
      .insert({ id: randomUUID(), user_id: user.id, entry_id });

    if (error) {
      if (error.code === '23505' || error.message?.includes('unique')) {
        return res.json({ liked: true, message: 'Already liked.' });
      }
      throw error;
    }

    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/likes — unlike an entry
router.delete('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { entry_id } = req.body;
    if (!entry_id) return res.status(400).json({ error: 'entry_id is required.' });

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('entry_id', entry_id);

    if (error) throw error;
    res.json({ liked: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/likes/count?entry_id=...
router.get('/count', async (req, res) => {
  try {
    const { entry_id } = req.query;
    if (!entry_id) return res.status(400).json({ error: 'entry_id is required.' });

    const { count, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entry_id);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/likes/user?entry_id=... — whether current user liked this entry
router.get('/user', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.json({ liked: false });

    const { entry_id } = req.query;
    if (!entry_id) return res.status(400).json({ error: 'entry_id is required.' });

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_id', entry_id)
      .maybeSingle();

    if (error) throw error;
    res.json({ liked: !!data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
