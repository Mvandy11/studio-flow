import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import supabase from '../supabase.js';

const router = express.Router();

const ADMIN_EMAIL = 'obviouslyinspiredstudio@outlook.com';
const BUCKET      = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'creator_admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return user;
}

function createMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendRequestEmail({ userName, userEmail, userId, title, event_type, price, description }) {
  const mailer = createMailer();
  if (!mailer) return;

  const html = `
    <h2>New Custom Event Request</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
      <tr><td><strong>Name</strong></td><td>${userName || '—'}</td></tr>
      <tr><td><strong>Email</strong></td><td>${userEmail || '—'}</td></tr>
      <tr><td><strong>User ID</strong></td><td>${userId}</td></tr>
      <tr><td><strong>Title</strong></td><td>${title}</td></tr>
      <tr><td><strong>Event Type</strong></td><td>${event_type}</td></tr>
      <tr><td><strong>Price</strong></td><td>${price != null ? '$' + price : 'N/A'}</td></tr>
      <tr><td><strong>Description</strong></td><td>${description || '—'}</td></tr>
      <tr><td><strong>Submitted</strong></td><td>${new Date().toLocaleString()}</td></tr>
    </table>
    <hr/>
    <p style="color:#888;font-size:12px">Studio Flow Custom Event System</p>
  `;

  try {
    await mailer.sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      ADMIN_EMAIL,
      subject: `[Studio Flow] Custom Event Request: ${title}`,
      html,
    });
  } catch (err) {
    console.error('[customEvents] email failed:', err.message);
  }
}

// POST /api/custom-events/request
router.post('/request', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { title, event_type, price, description } = req.body;
    if (!title?.trim())      return res.status(400).json({ error: 'Title is required.' });
    if (!event_type?.trim()) return res.status(400).json({ error: 'Event type is required.' });

    if (event_type === 'locked' && (price == null || price === '')) {
      return res.status(400).json({ error: 'Price is required for locked/ticketed events.' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || profile?.username || null;

    const row = {
      id:          randomUUID(),
      user_id:     user.id,
      title:       title.trim(),
      event_type:  event_type.trim(),
      price:       price != null && price !== '' ? Number(price) : null,
      description: description?.trim() || null,
      status:      'pending',
    };

    const { data, error } = await supabase
      .from('custom_event_requests')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    sendRequestEmail({
      userName,
      userEmail:   user.email,
      userId:      user.id,
      title:       row.title,
      event_type:  row.event_type,
      price:       row.price,
      description: row.description,
    }).catch(() => {});

    res.status(201).json({ request: data, message: 'Your request has been sent to Studio Flow.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom-events/create-slot  (admin only)
router.post('/create-slot', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { request_id, user_id, title, password } = req.body;
    if (!user_id || !title || !password) {
      return res.status(400).json({ error: 'user_id, title, and password are required.' });
    }

    const { data, error } = await supabase
      .from('event_slots')
      .insert({
        id:         randomUUID(),
        user_id,
        request_id: request_id || null,
        title:      title.trim(),
        password,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ slot: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom-events/upload/:slotId  (password-protected video upload)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/upload/:slotId', upload.single('file'), async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { slotId } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ error: 'Password is required.' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { data: slot, error: slotErr } = await supabase
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

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    await supabase
      .from('event_slots')
      .update({ video_id: videoId, video_url: publicUrl })
      .eq('id', slotId);

    res.json({ success: true, video_id: videoId, video_url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
