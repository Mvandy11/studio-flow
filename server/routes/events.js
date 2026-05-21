import { Router } from 'express';
import supabase from '../supabase/supabase.js';
import supabaseAdmin from '../supabase/supabaseAdmin.js';

const router = Router();

// ── helpers ───────────────────────────────────────────────────
function resolveMode(row) {
  // Support both old event_type column and new event_mode column
  return row.event_mode || row.event_type || 'live';
}

function resolveStatus(row) {
  if (row.status) return row.status;
  const start = row.start_time ? new Date(row.start_time).getTime()
    : row.starts_at ? new Date(row.starts_at).getTime()
    : null;
  if (!start || Date.now() < start) return 'upcoming';
  return 'ended';
}

function addComputed(row) {
  const mode = resolveMode(row);
  return {
    ...row,
    event_mode:          mode,          // canonical field
    event_type:          mode,          // backwards-compat alias
    computed_status:     resolveStatus(row),
  };
}

async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const r = profile?.role;
  if (r !== 'admin' && r !== 'creator_admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return user;
}

/* ── GET /api/events ──────────────────────────────────────────
   Query params:
     ?type=live|recorded|upcoming|ended   (combines mode + time filter)
     ?status=upcoming|live|ended
     ?event_mode=live|recorded
*/
router.get('/', async (req, res) => {
  const { status, event_mode, type } = req.query;
  try {
    let q = supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true, nullsFirst: false });

    // ?type= convenience filter
    if (type === 'live')     q = q.eq('event_mode', 'live');
    if (type === 'recorded') q = q.eq('event_mode', 'recorded');
    if (type === 'upcoming') q = q.gt('start_time', new Date().toISOString());
    if (type === 'ended')    q = q.lt('start_time', new Date().toISOString());

    // explicit column filters
    if (status)     q = q.eq('status',     status);
    if (event_mode) q = q.eq('event_mode', event_mode);

    const { data, error } = await q;
    if (error) {
      // Graceful degradation — column might not exist if migration not run yet
      if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
        const { data: fallback, error: fbErr } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });
        if (fbErr) throw fbErr;
        return res.json({ data: (fallback || []).map(addComputed) });
      }
      throw error;
    }
    res.json({ data: (data || []).map(addComputed) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/events/:id ─────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found.' });
    res.json({ data: addComputed(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/events (subscribers and admins) ───────────────── */
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { data: authResp, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
    const creator = authResp?.user;
    if (authErr || !creator) return res.status(401).json({ error: 'Authentication required.' });

    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('role, subscription_active')
      .eq('id', creator.id)
      .maybeSingle();

    const isAdmin =
      creatorProfile?.role === 'admin' || creatorProfile?.role === 'creator_admin';
    if (!isAdmin && !creatorProfile?.subscription_active) {
      return res.status(403).json({
        error: 'An active subscription is required to create events.',
        requiresSubscription: true,
      });
    }

    const {
      title, description,
      event_mode = 'live',
      event_type,            // accept old field name too
      start_time, starts_at, duration_minutes,
      price = 0, is_paid = false,
      location, thumbnail_url, video_url,
      live_room_id, stage_room_id,
      stream_key, stream_url,
      status = 'upcoming',
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required.' });

    const mode = event_mode || event_type || 'live';
    const startAt = start_time || starts_at || null;

    const payload = {
      title, description,
      event_mode: mode,
      start_time: startAt,
      starts_at:  startAt,
      duration_minutes,
      price, is_paid,
      location, thumbnail_url, video_url,
      live_room_id: live_room_id || stage_room_id || null,
      stage_room_id: stage_room_id || live_room_id || null,
      stream_key, stream_url,
      status,
      created_by: creator.id,
      creator_id: creator.id,
    };

    const { data, error } = await supabase
      .from('events')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data: addComputed(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH /api/events/:id (creator_admin only) ──────────────── */
router.patch('/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const allowed = [
      'title', 'description', 'event_mode',
      'start_time', 'starts_at', 'duration_minutes',
      'price', 'is_paid', 'location', 'thumbnail_url',
      'video_url', 'live_room_id', 'stage_room_id',
      'stream_key', 'stream_url', 'status',
    ];

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );

    // Accept old event_type field name and map to event_mode
    if (req.body.event_type && !updates.event_mode) {
      updates.event_mode = req.body.event_type;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided.' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found.' });
    res.json({ data: addComputed(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/events/:id/pick-winner (creator_admin only) ───── */
router.post('/:id/pick-winner', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const eventId = req.params.id;

    // Verify event exists and drawing is enabled
    const { data: event } = await supabase
      .from('events')
      .select('id, title, drawing_enabled, drawing_amount')
      .eq('id', eventId)
      .maybeSingle();

    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (!event.drawing_enabled) return res.status(422).json({ error: 'Drawing is not enabled for this event.' });

    // Count entries
    const { count: entryCount } = await supabase
      .from('ticket_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('drawing_entry', true);

    if (!entryCount || entryCount === 0) {
      return res.status(422).json({ error: 'No drawing entries for this event.' });
    }

    // Pick random winner
    const { data: entries } = await supabase
      .from('ticket_purchases')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('drawing_entry', true);

    if (!entries || entries.length === 0) {
      return res.status(422).json({ error: 'No drawing entries found.' });
    }

    const winner = entries[Math.floor(Math.random() * entries.length)];
    const winnerId = winner.user_id;

    // Fetch winner profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', winnerId)
      .maybeSingle();

    // Fetch winner email from auth.users (service role)
    const { data: authData } = await supabase.auth.admin.getUserById(winnerId);
    const winnerEmail = authData?.user?.email || null;

    // Fetch winner payout method
    const { data: settings } = await supabase
      .from('creator_settings')
      .select('payout_method, paypal, venmo, stripe, cashapp')
      .eq('creator_id', winnerId)
      .maybeSingle();

    const payoutMethod  = settings?.payout_method || null;
    const payoutAccount = payoutMethod ? (settings?.[payoutMethod] || null) : null;

    const totalPot = Number(event.drawing_amount || 0) * entryCount;

    return res.json({
      winner: {
        userId:        winnerId,
        name:          profile?.full_name || profile?.username || 'Unknown',
        email:         winnerEmail,
        avatarUrl:     profile?.avatar_url || null,
        payoutMethod,
        payoutAccount,
        hasPayoutMethod: !!payoutMethod,
      },
      drawing: {
        eventId,
        eventTitle:    event.title,
        totalEntries:  entryCount,
        drawingAmount: Number(event.drawing_amount || 0),
        totalPot,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /api/events/:id (creator_admin only) ─────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { error } = await supabase
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
