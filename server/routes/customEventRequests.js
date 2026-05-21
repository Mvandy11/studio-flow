import express from 'express';
import { randomUUID } from 'crypto';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';

// ── Auth helpers ────────────────────────────────────────────────

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAuth(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  return user;
}

// ── GET /api/custom-event-requests  (admin sees all; user sees own) ──────────
router.get('/', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';

    let query = supabaseAdmin
      .from('custom_event_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[custom-event-requests] list:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/custom-event-requests  (authenticated user submits a request) ──
router.post('/', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { title, event_type, event_mode, price, description } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required.' });
    }

    const mode = event_mode || event_type || 'open';

    if (mode === 'locked' && (price == null || price === '')) {
      return res.status(400).json({ error: 'price is required for locked/ticketed events.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || profile?.username || null;

    const row = {
      id:          randomUUID(),
      user_id:     user.id,
      title:       title.trim(),
      event_type:  mode,
      price:       price != null && price !== '' ? Number(price) : null,
      description: description?.trim() || null,
      status:      'pending',
    };

    const { data, error } = await supabaseAdmin
      .from('custom_event_requests')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    sendEmail({
      to:      ADMIN_EMAIL,
      subject: `[Studio Flow] New Custom Event Request: ${row.title}`,
      text: `A new custom event request has been submitted.

Name: ${userName || '—'}
Email: ${user.email || '—'}
User ID: ${user.id}
Title: ${row.title}
Event Type: ${row.event_type}
Price: ${row.price != null ? '$' + row.price : 'N/A'}
Description: ${row.description || 'None'}
Request ID: ${data.id}
Submitted: ${new Date().toLocaleString()}`,
    }).catch(() => {});

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[custom-event-requests] POST /:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/custom-event-requests/create  (legacy alias — same as POST /) ─
router.post('/create', async (req, res) => {
  const user = await getUserFromHeader(req);

  const { user_id, title, event_type, event_mode, price, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required.' });
  }

  const resolvedUserId = user?.id || user_id || null;
  const mode = event_mode || event_type || 'open';

  try {
    const { data, error } = await supabaseAdmin
      .from('custom_event_requests')
      .insert([{
        user_id:     resolvedUserId,
        title:       title.trim(),
        event_type:  mode,
        price:       price != null && price !== '' ? Number(price) : null,
        description: description?.trim() || null,
        status:      'pending',
      }])
      .select()
      .single();

    if (error) throw error;

    sendEmail({
      to:      ADMIN_EMAIL,
      subject: 'New Custom Event Request',
      text: `A new custom event request has been submitted.

Title: ${title}
Type: ${mode}
Price: ${price ?? 'N/A'}
Description: ${description || 'None'}
User ID: ${resolvedUserId || 'Anonymous'}
Request ID: ${data.id}`,
    }).catch(() => {});

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[custom-event-requests] create:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/custom-event-requests/pending  (admin only) ────────────────────
router.get('/pending', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required.' });

    const { data, error } = await supabaseAdmin
      .from('custom_event_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[custom-event-requests] pending:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/custom-event-requests/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data, error } = await supabaseAdmin
      .from('custom_event_requests')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Request not found.' });

    // Allow owner or admin to read
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';
    if (!isAdmin && data.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    res.json(data);
  } catch (err) {
    console.error('[custom-event-requests] get one:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/custom-event-requests/:id  (owner or admin) ─────────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data: row } = await supabaseAdmin
      .from('custom_event_requests')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!row) return res.status(404).json({ error: 'Request not found.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'creator_admin';
    if (!isAdmin && row.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { error } = await supabaseAdmin
      .from('custom_event_requests')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[custom-event-requests] delete:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
