/**
 * Creator Events — direct publish (no admin approval).
 * Requires membership_tier = 'creator_50'.
 *
 * Mounted at /api/creator/events by app.js.
 *
 * POST /api/creator/events          — create a new event slot
 * GET  /api/creator/events/mine     — list current user's events
 * GET  /api/creator/events/public   — list all published events (optionally ?category=)
 * GET  /api/creator/events/public/:id — single published event
 */

import { Router }     from 'express';
import { randomUUID } from 'crypto';
import supabaseAdmin   from '../supabase/supabaseAdmin.js';
import { logError }    from '../utils/logError.js';

const router = Router();

const CATEGORIES = [
  'Comedy','Music','Dance','Fitness','Gaming','Education',
  'Cooking','Motivation','Kids','Talk Show','Tutorials','Art',
];

// ── helpers ─────────────────────────────────────────────────────────────────

async function getUser(req) {
  const auth = req.headers.authorization || '';
  const jwt  = auth.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
  return error ? null : user;
}

async function requireCreator50(req, res) {
  const user = await getUser(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('membership_tier, membership_active, role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin   = profile?.role === 'admin' || profile?.role === 'creator_admin';
  const isCreator = profile?.membership_tier === 'creator_50' && profile?.membership_active;

  if (!isAdmin && !isCreator) {
    res.status(403).json({ error: 'Creator ($50) membership required to post events.' });
    return null;
  }

  return user;
}

// ── POST /api/creator/events ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const user = await requireCreator50(req, res);
    if (!user) return;

    const { title, description, category, thumbnail_url, video_url, is_live } = req.body || {};

    if (!title?.trim())  return res.status(400).json({ error: 'Title is required.' });
    if (!category)       return res.status(400).json({ error: 'Category is required.' });
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}.` });
    }

    const slotId    = randomUUID();
    const streamKey = `sf-${randomUUID()}`;

    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .insert({
        id:            slotId,
        user_id:       user.id,
        creator_id:    user.id,
        title:         title.trim(),
        description:   description?.trim() || null,
        category:      category,
        thumbnail_url: thumbnail_url?.trim() || null,
        video_url:     video_url?.trim() || null,
        is_live:       !!is_live,
        status:        is_live ? 'upcoming' : 'upcoming',
        stream_key:    streamKey,
        password:      '',   // no password needed for direct publish
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[creator/events] ✅ Created event slot ${slotId} by user ${user.id} in category ${category}`);
    res.status(201).json({ data });
  } catch (err) {
    console.error('[creator/events] POST error:', err.message);
    await logError(err, '/api/creator/events POST');
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/creator/events/mine ─────────────────────────────────────────────
router.get('/mine', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .select('id, title, description, category, thumbnail_url, video_url, is_live, status, created_at')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[creator/events] GET /mine error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/creator/events/public ───────────────────────────────────────────
// Public listing — optionally filtered by ?category=
router.get('/public', async (req, res) => {
  try {
    const { category, creator_id } = req.query;

    let query = supabaseAdmin
      .from('event_slots')
      .select(`
        id, title, description, category, thumbnail_url,
        video_url, is_live, status, created_at,
        creator_id,
        profiles:creator_id ( username, display_name, avatar_url )
      `)
      .not('category', 'is', null)
      .order('created_at', { ascending: false });

    if (category)    query = query.ilike('category', category);
    if (creator_id)  query = query.eq('creator_id', creator_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[creator/events] GET /public error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/creator/events/public/:id ───────────────────────────────────────
router.get('/public/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_slots')
      .select(`
        id, title, description, category, thumbnail_url,
        video_url, is_live, status, created_at,
        stream_key, stream_url, hls_url,
        creator_id,
        profiles:creator_id ( username, display_name, avatar_url )
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data)  return res.status(404).json({ error: 'Event not found.' });

    res.json(data);
  } catch (err) {
    console.error('[creator/events] GET /public/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/creator/events/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: slot } = await supabaseAdmin
      .from('event_slots')
      .select('creator_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!slot)              return res.status(404).json({ error: 'Event not found.' });
    if (slot.creator_id !== user.id) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden.' });
    }

    const { error } = await supabaseAdmin.from('event_slots').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[creator/events] DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export { CATEGORIES };
export default router;
