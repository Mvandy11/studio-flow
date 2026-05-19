/**
 * /api/free-chat — lightweight fallback REST API for the general chat channel.
 * Reads/writes public.chat_messages with channel_id = 'general'.
 * The frontend primarily uses the ChatWindow component (Supabase Realtime direct),
 * but this API remains available for SSR-style fetching and health checks.
 */
import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();
const CHANNEL = 'general';

async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data: authResp, error } = await supabase.auth.getUser(h.slice(7));
  if (error || !authResp?.user) return null;
  return authResp.user;
}

// ── GET /api/free-chat/list ───────────────────────────────────────────────────
// Public — no auth required. Returns top-level messages in 'general' channel.
router.get('/list', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_id, message, created_at, is_announcement')
      .eq('channel_id', CHANNEL)
      .is('parent_message_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    // Normalise field names so existing FreeChatPage JSX still works
    const posts = (data || []).map((m) => ({
      id:           m.id,
      user_id:      m.sender_id,
      display_name: m.sender_id?.slice(0, 8) ?? 'Creator',
      message:      m.message,
      created_at:   m.created_at,
    }));

    res.json({ posts });
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
    if (!message?.trim())              return res.status(400).json({ error: 'Message cannot be empty.' });
    if (message.trim().length > 1000)  return res.status(400).json({ error: 'Message must be 1000 characters or fewer.' });

    const display_name =
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'Creator';

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id:      CHANNEL,
        session_id:      CHANNEL,
        sender_id:       user.id,
        message:         message.trim(),
        is_announcement: false,
      })
      .select('id, sender_id, message, created_at')
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      post: {
        id:           data.id,
        user_id:      data.sender_id,
        display_name,
        message:      data.message,
        created_at:   data.created_at,
      },
    });
  } catch (err) {
    console.error('[free-chat] post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
