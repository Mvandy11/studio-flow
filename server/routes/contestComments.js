/**
 * Contest Comments API
 *
 * Mounted at /api/contests by app.js (alongside contestsRouter).
 * Handles two kinds of comments stored in the contest_comments table:
 *
 *   Per-contest  (entry_id = NULL):
 *     GET  /api/contests/:id/comments
 *     POST /api/contests/:id/comments
 *
 *   Per-entry  (entry_id set):
 *     GET  /api/contests/:id/entries/:entryId/comments
 *     POST /api/contests/:id/entries/:entryId/comments
 *
 *   Shared:
 *     DELETE /api/contests/:id/comments/:commentId   (own comment only)
 */

import { Router } from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(h.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

// ── GET /api/contests/:id/comments ────────────────────────────────────────────
// Returns contest-level comments (entry_id IS NULL) ordered oldest-first.
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('contest_comments')
      .select('id, contest_id, user_id, user_name, content, created_at')
      .eq('contest_id', id)
      .is('entry_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('GET /api/contests/:id/comments error:', error.message);
      return res.status(200).json({ comments: [] });
    }
    res.json({ comments: data ?? [] });
  } catch (err) {
    console.error('GET /api/contests/:id/comments error:', err.message);
    return res.status(200).json({ comments: [] });
  }
});

// ── POST /api/contests/:id/comments ───────────────────────────────────────────
// Create a contest-level comment. Requires auth.
router.post('/:id/comments', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { content } = req.body ?? {};
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Creator';

  const { data, error } = await supabaseAdmin
    .from('contest_comments')
    .insert({
      contest_id: id,
      entry_id:   null,
      user_id:    user.id,
      user_name:  displayName,
      content:    content.trim(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ comment: data });
});

// ── GET /api/contests/:id/entries/:entryId/comments ───────────────────────────
// Returns per-entry comments ordered oldest-first.
router.get('/:id/entries/:entryId/comments', async (req, res) => {
  const { entryId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('contest_comments')
      .select('id, contest_id, entry_id, user_id, user_name, content, created_at')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('GET /api/contests/:id/entries/:entryId/comments error:', error.message);
      return res.status(200).json({ comments: [] });
    }
    res.json({ comments: data ?? [] });
  } catch (err) {
    console.error('GET /api/contests/:id/entries/:entryId/comments error:', err.message);
    return res.status(200).json({ comments: [] });
  }
});

// ── POST /api/contests/:id/entries/:entryId/comments ─────────────────────────
// Create a per-entry comment. Requires auth.
router.post('/:id/entries/:entryId/comments', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id, entryId } = req.params;
  const { content } = req.body ?? {};
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Creator';

  const { data, error } = await supabaseAdmin
    .from('contest_comments')
    .insert({
      contest_id: id,
      entry_id:   entryId,
      user_id:    user.id,
      user_name:  displayName,
      content:    content.trim(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ comment: data });
});

// ── DELETE /api/contests/:id/comments/:commentId ──────────────────────────────
// Delete own comment. Requires auth. Returns 404 if not found / not owned.
router.delete('/:id/comments/:commentId', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { commentId } = req.params;

  const { error, count } = await supabaseAdmin
    .from('contest_comments')
    .delete({ count: 'exact' })
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) return res.status(500).json({ error: error.message });
  if (count === 0) return res.status(404).json({ error: 'Comment not found or not owned by you' });
  res.json({ success: true });
});

export default router;
