import express from 'express';
import { randomUUID } from 'crypto';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// ── Auth helpers ────────────────────────────────────────────────
async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAdmin(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

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

// ── Admin data GET routes ────────────────────────────────────────

// GET /api/admin/counts — aggregate counts for the dashboard overview
router.get('/counts', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [
      { count: totalMembers },
      { count: subscribers },
      { count: eventRequests },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_active', true),
      supabaseAdmin.from('custom_event_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    res.json({
      total_members:   totalMembers   ?? 0,
      subscribers:     subscribers    ?? 0,
      event_requests:  eventRequests  ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/contests
router.get('/contests', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from('contests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/events
router.get('/events', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/announcements
router.get('/announcements', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/submissions
router.get('/submissions', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data: allSubs } = await supabaseAdmin
      .from('submissions')
      .select('*, contests(title)')
      .order('created_at', { ascending: false })
      .limit(200);

    res.json({
      data: {
        submissions: allSubs || [],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/categories — categories are static for now
router.get('/categories', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const categories = [
      { id: 'music',       label: 'Music',       icon: '🎵' },
      { id: 'photography', label: 'Photography',  icon: '📷' },
      { id: 'film',        label: 'Film & Video', icon: '🎬' },
      { id: 'design',      label: 'Design',       icon: '🎨' },
      { id: 'writing',     label: 'Writing',      icon: '✍️' },
      { id: 'comedy',      label: 'Comedy',       icon: '😄' },
      { id: 'education',   label: 'Education',    icon: '🎓' },
      { id: 'other',       label: 'Other',        icon: '✦'  },
    ];
    res.json({ data: categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/academy
router.get('/academy', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from('academy_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/subscription
router.get('/subscription', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [{ count: total }, { count: premierCount }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).not('stripe_customer_id', 'is', null),
    ]);

    res.json({
      data: {
        total_members:   total         || 0,
        premier_members: premierCount  || 0,
        tiers: [
          { id: 'free',    label: 'Free',    price: 0,  features: ['Browse & vote', 'Enter contests', 'View events'] },
          { id: 'premier', label: 'Premier', price: 15, features: ['All Free features', 'Upload submissions', 'Custom event requests', 'Monthly reward pool entry'] },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Event requests admin routes ──────────────────────────────────

// GET /api/admin/event-requests
router.get('/event-requests', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data, error } = await supabaseAdmin
      .from('custom_event_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/event-requests/:id
router.patch('/event-requests/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;
    const allowed = ['status', 'processed_at'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const { data, error } = await supabaseAdmin
      .from('custom_event_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/event-requests/:id/approve
// Atomically: fetch request → create event_slot → create event → mark approved
router.post('/event-requests/:id/approve', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;
    const { title, password } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required.' });
    }
    if (!password?.trim()) {
      return res.status(400).json({ error: 'password is required.' });
    }

    // 1. Fetch the request
    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('custom_event_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!request) return res.status(404).json({ error: 'Event request not found.' });
    if (!request.user_id) {
      return res.status(422).json({ error: 'Request is missing user_id — cannot create event.' });
    }

    const slotId    = randomUUID();
    const eventId   = randomUUID();
    const streamKey = `sf-${randomUUID()}`;
    const streamUrl = `rtmp://live.studioflow.tv/live/${streamKey}`;
    const hlsUrl    = `https://live.studioflow.tv/hls/${streamKey}.m3u8`;
    const safeTitle = title.trim();

    // 2. Create the event_slot
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .insert({
        id:         slotId,
        user_id:    request.user_id,
        request_id: id,
        title:      safeTitle,
        password:   password.trim(),
        stream_key: streamKey,
        stream_url: streamUrl,
        hls_url:    hlsUrl,
        status:     'pending',
      })
      .select()
      .single();

    if (slotErr) throw slotErr;

    // 3. Create the event row (creator picks live/recorded later from their slot page)
    const isPaid   = request.event_type === 'locked';
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .insert({
        id:            eventId,
        title:         safeTitle,
        description:   request.description || null,
        created_by:    request.user_id,
        creator_id:    request.user_id,
        event_mode:    'live',           // default; creator updates when they go live
        stream_key:    streamKey,
        live_room_id:  slotId,
        stage_room_id: slotId,
        status:        'upcoming',
        price:         request.price ?? 0,
        is_paid:       isPaid,
      })
      .select()
      .single();

    if (eventErr) throw eventErr;

    // 4. Mark the request as approved
    const { error: updateErr } = await supabaseAdmin
      .from('custom_event_requests')
      .update({ status: 'approved', processed_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // 5. Notify the creator (best-effort)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, username')
      .eq('id', request.user_id)
      .maybeSingle();

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(request.user_id);
    const creatorEmail = authUser?.user?.email ?? null;

    if (creatorEmail) {
      sendEmail({
        to:      creatorEmail,
        subject: `[Studio Flow] Your event request "${safeTitle}" has been approved!`,
        text: `Hi ${profile?.full_name || profile?.username || 'Creator'},

Great news — your custom event request has been approved!

Event Title : ${safeTitle}
Upload Password : ${password.trim()}
Stream Key : ${streamKey}

Use your upload password to post your event video, or go live using the stream key.

— Studio Flow Team`,
      }).catch(() => {});
    }

    return res.status(201).json({ success: true, event, slot, stream_key: streamKey });
  } catch (err) {
    console.error('[admin/event-requests/approve]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/event-requests/:id/reject
router.post('/event-requests/:id/reject', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;
    const { reason } = req.body;

    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('custom_event_requests')
      .select('user_id, title')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!request) return res.status(404).json({ error: 'Event request not found.' });

    const { error: updateErr } = await supabaseAdmin
      .from('custom_event_requests')
      .update({ status: 'rejected', processed_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Notify creator (best-effort)
    if (request.user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(request.user_id);
      const creatorEmail = authUser?.user?.email ?? null;
      if (creatorEmail) {
        sendEmail({
          to:      creatorEmail,
          subject: `[Studio Flow] Update on your event request "${request.title}"`,
          text: `Thank you for submitting your event request to Studio Flow.

After review, we were unable to approve "${request.title}" at this time${reason ? `:\n\n${reason}` : '.'}

You're welcome to submit a new request in the future.

— Studio Flow Team`,
        }).catch(() => {});
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[admin/event-requests/reject]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Subscription history (last 6 months) ────────────────────────

// GET /api/admin/subscription-history
router.get('/subscription-history', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { data: profileRows } = await supabaseAdmin
      .from('profiles')
      .select('subscription_active, subscription_status, updated_at')
      .not('subscription_status', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500);

    res.json({ data: profileRows || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Submission approval actions ──────────────────────────────────

// POST /api/admin/approve
router.post('/approve', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { submission_id, user_id, title, password, request_id } = req.body;

    if (!submission_id || !title || !password) {
      return res.status(400).json({ error: 'submission_id, title, and password are required.' });
    }

    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .insert([{
        user_id:       user_id || submission.user_id || null,
        request_id:    request_id || null,
        submission_id,
        title,
        password,
      }])
      .select()
      .single();

    if (slotErr) throw slotErr;

    const { error: updateErr } = await supabaseAdmin
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', submission_id);

    if (updateErr) throw updateErr;

    const creatorEmail = submission.user_email || null;
    if (creatorEmail) {
      await sendEmail({
        to:      creatorEmail,
        subject: 'Your submission has been approved',
        text: `Congratulations! Your submission has been approved.

Slot Title: ${title}
Upload Password: ${password}

Use this password to upload your content to your event slot.

— Studio Flow Team`,
      });
    }

    return res.json({ success: true, slot_id: slot.id });
  } catch (err) {
    console.error('[admin/approve]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/reject
router.post('/reject', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { submission_id, reason } = req.body;

    if (!submission_id) {
      return res.status(400).json({ error: 'submission_id is required.' });
    }

    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    const { error: updateErr } = await supabaseAdmin
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', submission_id);

    if (updateErr) throw updateErr;

    const creatorEmail = submission.user_email || null;
    if (creatorEmail) {
      await sendEmail({
        to:      creatorEmail,
        subject: 'Your submission was not approved',
        text: `Thank you for submitting to Studio Flow.

After review, your submission was not approved at this time${reason ? `:\n\n${reason}` : '.'}

You are welcome to submit again in a future round.

— Studio Flow Team`,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[admin/reject]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
