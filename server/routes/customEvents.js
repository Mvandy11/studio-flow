import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';
const BUCKET      = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';

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

// ── POST /api/custom-events  (creator creates an event directly) ─────────────
router.post('/', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const {
      title,
      description,
      event_mode,
      event_date,
      stream_key: providedStreamKey,
      stream_url,
      video_url,
      ticket_price,
      location,
      thumbnail_url,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required.' });
    }

    const mode       = event_mode || 'live';
    const streamKey  = providedStreamKey?.trim() || `sf-${randomUUID()}`;

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        id:           randomUUID(),
        title:        title.trim(),
        description:  description?.trim() || null,
        event_mode:   mode,
        event_date:   event_date || null,
        stream_key:   streamKey,
        stream_url:   stream_url?.trim() || null,
        video_url:    video_url?.trim() || null,
        ticket_price: ticket_price != null ? Number(ticket_price) : null,
        location:     location?.trim() || null,
        thumbnail_url: thumbnail_url?.trim() || null,
        created_by:   user.id,
        creator_id:   user.id,
        status:       'upcoming',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    console.error('[custom-events] POST /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/custom-events/request  (user requests a custom event slot) ─────
router.post('/request', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { title, event_type, event_mode, price, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required.' });

    const mode = event_mode || event_type || null;

    // Locked/ticketed events require a price
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
      event_type:  mode || 'open',
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
      subject: `[Studio Flow] Custom Event Request: ${row.title}`,
      text: `New custom event request submitted.

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

    res.status(201).json({ request: data, message: 'Your request has been sent to Studio Flow.' });
  } catch (err) {
    console.error('[custom-events] POST /request:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/custom-events/create-slot  (admin approves a request → slot + event) ──
router.post('/create-slot', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { request_id, user_id, title, password } = req.body;
    if (!user_id || !title || !password) {
      return res.status(400).json({ error: 'user_id, title, and password are required.' });
    }

    const slotId    = randomUUID();
    const eventId   = randomUUID();
    const streamKey = `sf-${randomUUID()}`;

    // 1. Create the event_slot
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .insert({
        id:         slotId,
        user_id,
        request_id: request_id || null,
        title:      title.trim(),
        password,
        stream_key: streamKey,
      })
      .select()
      .single();

    if (slotErr) throw slotErr;

    // 2. Pre-create a linked events row (creator chooses live/recorded later)
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .insert({
        id:            eventId,
        title:         title.trim(),
        created_by:    user_id,
        creator_id:    user_id,
        event_mode:    null,
        stream_key:    streamKey,
        live_room_id:  slotId,
        stage_room_id: slotId,
        status:        'upcoming',
      })
      .select()
      .single();

    if (eventErr) {
      console.error('[create-slot] events row error:', eventErr.message);
    }

    // 3. Mark the original request as approved (if request_id provided)
    if (request_id) {
      await supabaseAdmin
        .from('custom_event_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', request_id);
    }

    res.status(201).json({ slot, event: event || null, stream_key: streamKey });
  } catch (err) {
    console.error('[custom-events] POST /create-slot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/custom-events/upload/:slotId  (password-protected video upload) ─
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/upload/:slotId', upload.single('file'), async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { slotId } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ error: 'Password is required.' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();

    if (slotErr || !slot) return res.status(404).json({ error: 'Event slot not found.' });

    if (slot.user_id !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to upload to this slot.' });
    }

    if (slot.password !== password) {
      return res.status(403).json({ error: 'Incorrect password.' });
    }

    const ext      = req.file.originalname.split('.').pop();
    const videoId  = randomUUID();
    const filePath = `event-slots/${slotId}/${videoId}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);

    await supabaseAdmin
      .from('event_slots')
      .update({ video_id: videoId, video_url: publicUrl })
      .eq('id', slotId);

    // Also update the linked events row
    await supabaseAdmin
      .from('events')
      .update({ video_url: publicUrl, event_mode: 'recorded' })
      .eq('live_room_id', slotId);

    res.json({ success: true, video_id: videoId, video_url: publicUrl });
  } catch (err) {
    console.error('[custom-events] upload:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
