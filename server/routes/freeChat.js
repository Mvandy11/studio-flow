import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data: authResp, error } = await supabase.auth.getUser(h.slice(7));
  if (error || !authResp?.user) return null;
  return authResp.user;
}

// ── GET /api/free-chat/list ───────────────────────────────────────────────────
// Public — no auth required.
router.get('/list', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('free_chat_posts')
      .select('id, user_id, display_name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    res.json({ posts: data || [] });
  } catch (err) {
    console.error('[free-chat] list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/free-chat/post ──────────────────────────────────────────────────
// Auth required — any logged-in user (no subscription needed).
router.post('/post', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'You must be logged in to post.' });

    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (message.trim().length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or fewer.' });
    }

    const display_name =
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'Creator';

    const { data, error } = await supabase
      .from('free_chat_posts')
      .insert({ user_id: user.id, display_name, message: message.trim() })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ post: data });
  } catch (err) {
    console.error('[free-chat] post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
