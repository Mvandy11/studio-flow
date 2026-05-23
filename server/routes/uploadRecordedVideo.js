/**
 * Recorded Video Upload (event-ID path)
 *
 * POST /api/events/:eventId/upload-recorded
 *   — Accepts a video file (multipart/form-data field: "video")
 *   — Looks up the event_slot linked to the event via events.live_room_id
 *   — Uploads to Supabase Storage bucket "event-videos"
 *   — Updates events:      video_url, event_mode = 'recorded', status = 'recorded'
 *   — Updates event_slots: recorded_video_url, is_recorded = true, status = 'completed'
 *   — Slot owner OR creator_admin only (Bearer auth required)
 */

import { Router }    from 'express';
import multer        from 'multer';
import { randomUUID } from 'crypto';
import supabaseAdmin from '../supabase/supabaseAdmin.js';
import { logError }  from '../utils/logError.js';

const router = Router();

const EVENT_VIDEOS_BUCKET = 'event-videos';

const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    ALLOWED_TYPES.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`Unsupported file type: ${file.mimetype}. Use MP4, MOV, WebM, or AVI.`));
  },
});

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(h.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

// ── POST /api/events/:eventId/upload-recorded ─────────────────────────────────

router.post('/:eventId/upload-recorded', upload.single('video'), async (req, res) => {
  try {
    // Auth
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { eventId } = req.params;

    // Fetch the event
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('id, title, live_room_id, creator_id, created_by, status, event_mode')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr) throw eventErr;
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // Fetch linked slot (slot.id == events.live_room_id)
    const slotId = event.live_room_id;
    let slot = null;

    if (slotId) {
      const { data, error: slotErr } = await supabaseAdmin
        .from('event_slots')
        .select('id, user_id, status')
        .eq('id', slotId)
        .maybeSingle();
      if (slotErr) throw slotErr;
      slot = data || null;
    }

    // Authorization: must be slot owner or creator_admin
    const ownerId = slot?.user_id || event.creator_id || event.created_by;
    if (ownerId !== user.id) {
      // Check admin role
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || !['admin', 'creator_admin'].includes(profile.role)) {
        return res.status(403).json({ error: 'You do not have permission to upload to this event.' });
      }
    }

    // File required
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided. Send a file in the "video" field.' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const ext         = originalname.split('.').pop().toLowerCase();
    const storagePath = `events/${eventId}/${randomUUID()}.${ext}`;

    console.log(`[upload-recorded] Uploading to ${EVENT_VIDEOS_BUCKET}/${storagePath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(EVENT_VIDEOS_BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype, upsert: true });

    if (uploadErr) {
      if (uploadErr.message?.toLowerCase().includes('bucket')) {
        return res.status(500).json({
          error: `Storage bucket "${EVENT_VIDEOS_BUCKET}" not found. Create it in Supabase → Storage → New bucket → "${EVENT_VIDEOS_BUCKET}" (public).`,
        });
      }
      throw uploadErr;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(EVENT_VIDEOS_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error('Failed to get public URL from Supabase Storage.');

    console.log(`[upload-recorded] Public URL: ${publicUrl}`);

    // Update events row
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('events')
      .update({
        video_url:  publicUrl,
        event_mode: 'recorded',
        status:     'recorded',
        end_time:   now,
      })
      .eq('id', eventId);

    // Update linked event_slot if one exists
    if (slotId) {
      await supabaseAdmin
        .from('event_slots')
        .update({
          recorded_video_url: publicUrl,
          is_recorded:        true,
          status:             'completed',
        })
        .eq('id', slotId);
    }

    console.log(`[upload-recorded] ✅ event_id=${eventId} slot_id=${slotId ?? '—'} url=${publicUrl} user_id=${user.id}`);
    res.json({ success: true, video_url: publicUrl });
  } catch (err) {
    console.error('[upload-recorded] error:', err.message);
    await logError(err, `/api/events/${req.params?.eventId}/upload-recorded`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
