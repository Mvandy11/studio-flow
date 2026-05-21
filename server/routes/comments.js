/**
 * /api/comments — persistent video/session comments
 *
 * The public.comments table in Supabase uses:
 *   text        → stores the video/session id  (video_id in the API)
 *   body        → stores the comment text      (content in the API)
 *   user_id     → author uuid
 *   user_name   → display name (may be null on older rows)
 *   submission_id → used by submission comments; kept NULL for video comments
 *
 * GET  /api/comments/:video_id  — list comments for a session/video
 * POST /api/comments            — post a new comment (auth required)
 * DELETE /api/comments/:id      — delete own comment (auth or admin)
 */
import { Router } from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';

const router = Router();

async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(h.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

// ── GET /api/comments/:video_id ───────────────────────────────
router.get('/:video_id', async (req, res) => {
  const { video_id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('id, user_id, comment, body, text, created_at')
    .is('submission_id', null)   // video comments only (not submission comments)
    .eq('text', video_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const comments = (data || []).map((c) => ({
    id:         c.id,
    user_id:    c.user_id,
    user_name:  c.comment || 'Creator',  // `comment` col stores the display name
    video_id:   c.text,
    content:    c.body,
    created_at: c.created_at,
  }));

  res.json({ comments });
});

// ── POST /api/comments ────────────────────────────────────────
router.post('/', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { video_id, content } = req.body;

  if (!video_id || !content?.trim()) {
    return res.status(400).json({ error: 'video_id and content are required.' });
  }
  if (content.trim().length > 2000) {
    return res.status(400).json({ error: 'Comment must be 2000 characters or fewer.' });
  }

  const user_name =
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Creator';

  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({
      user_id:       user.id,
      text:          video_id,        // store video/session id in `text` column
      body:          content.trim(),  // store comment text in `body` column
      comment:       user_name,       // store display name in `comment` column
      submission_id: null,            // null = video comment, not submission comment
    })
    .select('id, user_id, comment, body, text, created_at')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    comment: {
      id:         data.id,
      user_id:    data.user_id,
      user_name:  data.comment || user_name,
      video_id:   data.text,
      content:    data.body,
      created_at: data.created_at,
    },
  });
});

// ── DELETE /api/comments/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { id } = req.params;

  const { data: existing } = await supabaseAdmin
    .from('comments')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return res.status(404).json({ error: 'Comment not found.' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const r = profile?.role;
  const isAdmin = r === 'admin' || r === 'creator_admin';

  if (existing.user_id !== user.id && !isAdmin) {
    return res.status(403).json({ error: 'Cannot delete another user\'s comment.' });
  }

  const { error } = await supabaseAdmin.from('comments').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
