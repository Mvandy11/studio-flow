import express from 'express';
import { randomUUID } from 'crypto';
import supabase from '../supabase/supabase.js';

const router = express.Router();

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAdmin(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'creator_admin' && profile?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return user;
}

// GET /api/announcements — pinned first, then newest
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, pinned, created_by, created_at')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      // Gracefully degrade if the table hasn't been created yet
      if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
        return res.json({ data: [] });
      }
      throw error;
    }
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements — admin only
router.post('/', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { title, body, pinned = false } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'title and body are required.' });
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({ id: randomUUID(), title: title.trim(), body: body.trim(), pinned: !!pinned, created_by: user.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ announcement: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/announcements/:id — admin only
router.patch('/:id', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { title, body, pinned } = req.body;
    const updates = {};
    if (title  !== undefined) updates.title  = title.trim();
    if (body   !== undefined) updates.body   = body.trim();
    if (pinned !== undefined) updates.pinned = !!pinned;

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ announcement: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id — admin only
router.delete('/:id', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
