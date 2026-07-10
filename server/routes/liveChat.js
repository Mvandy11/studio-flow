/**
 * Live Chat — scoped to event slots.
 * Mounted at /api/live by app.js.
 *
 * GET  /api/live/:slotId/chat   — fetch recent messages (public)
 * POST /api/live/:slotId/chat   — post a message (auth required)
 *
 * Uses the live_chat_messages table, completely separate from
 * free-chat (chat_messages) and contest chat (contest_comments).
 */

import { Router } from 'express';
import { supabase as supabaseAdmin } from '../supabase/client.js';

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(h.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

// ── GET /api/live/:slotId/chat ────────────────────────────────────────────────
// Returns the most-recent 100 messages for a slot (oldest first).
router.get('/:slotId/chat', async (req, res) => {
  try {
    const { slotId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('live_chat_messages')
      .select('id, slot_id, user_id, content, created_at, profiles(username, full_name, avatar_url)')
      .eq('slot_id', slotId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    console.error('[live-chat] GET:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/live/:slotId/chat ───────────────────────────────────────────────
// Insert a new message. Auth required.
router.post('/:slotId/chat', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { slotId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'content is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('live_chat_messages')
      .insert({
        slot_id: slotId,
        user_id: user.id,
        content: content.trim().slice(0, 500), // cap at 500 chars
      })
      .select('id, slot_id, user_id, content, created_at, profiles(username, full_name, avatar_url)')
      .single();

    if (error) throw error;
    res.status(201).json({ message: data });
  } catch (err) {
    console.error('[live-chat] POST:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
