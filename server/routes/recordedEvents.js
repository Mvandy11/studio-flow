/**
 * Recorded Video Upload
 *
 * Mounted at /api/slot by app.js.
 *
 * POST /api/slot/:slotId/upload-recorded
 *   — Accepts a video file (multipart/form-data field: "video")
 *   — Uploads to Supabase Storage bucket "recorded-events"
 *   — Updates event_slots: recorded_video_url, is_recorded = true, status = 'completed'
 *   — Slot owner only (Bearer auth required)
 */

import { Router }    from 'express';
import multer        from 'multer';
import { randomUUID } from 'crypto';
import { supabase as supabaseAdmin } from '../supabase/client.js';
import { logError } from '../utils/logError.js';

const router = Router();

const RECORDED_BUCKET = 'recorded-events';

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'video/3gpp',
  'video/3gpp2',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Upload MP4, MOV, WebM, or AVI.`));
    }
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

// ── POST /api/slot/:slotId/upload-recorded ────────────────────────────────────

router.post('/:slotId/upload-recorded', upload.single('video'), async (req, res) => {
  try {
    // Auth
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { slotId } = req.params;

    // Verify slot ownership
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('event_slots')
      .select('id, user_id, status')
      .eq('id', slotId)
      .maybeSingle();

    if (slotErr) throw slotErr;
    if (!slot)         return res.status(404).json({ error: 'Event slot not found.' });
    if (slot.user_id !== user.id) {
      return res.status(403).json({ error: 'You do not own this event slot.' });
    }

    // File check
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided. Send a file in the "video" field.' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const ext          = originalname.split('.').pop().toLowerCase();
    const storagePath  = `slots/${slotId}/${randomUUID()}.${ext}`;

    // Upload to Supabase Storage (service-role — bypasses RLS)
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(RECORDED_BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype, upsert: true });

    if (uploadErr) {
      // If the bucket doesn't exist the error message says "Bucket not found"
      if (uploadErr.message?.toLowerCase().includes('bucket')) {
        return res.status(500).json({
          error: `Storage bucket "${RECORDED_BUCKET}" not found. Create it in your Supabase dashboard (Storage → New bucket → "${RECORDED_BUCKET}", public).`,
        });
      }
      throw uploadErr;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(RECORDED_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error('Failed to get public URL from Supabase Storage.');

    // Update event_slots
    const { error: updateErr } = await supabaseAdmin
      .from('event_slots')
      .update({
        recorded_video_url: publicUrl,
        is_recorded:        true,
        status:             'completed',
      })
      .eq('id', slotId);

    if (updateErr) throw updateErr;

    // Also update the linked event row if one exists
    await supabaseAdmin
      .from('events')
      .update({ video_url: publicUrl, event_mode: 'recorded', status: 'completed' })
      .eq('live_room_id', slotId);

    console.log(`[recorded/upload] ✅ slot_id=${slotId} url=${publicUrl} user_id=${user.id}`);
    res.json({ success: true, recorded_video_url: publicUrl });
  } catch (err) {
    console.error('[recorded] upload:', err.message);
    await logError(err, `/api/slot/${req.params?.slotId}/upload-recorded`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
