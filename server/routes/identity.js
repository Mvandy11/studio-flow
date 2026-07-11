import express from 'express';
import multer from 'multer';
import { supabase } from '../supabase/client.js';
import { v4 as uuid } from 'uuid';

const router = express.Router();

// Multer for handling video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// GET /api/identity/list?creator_id=<uuid>
// Returns a unified list of legacy identities + new video identities for a creator.
router.get('/list', async (req, res) => {
  try {
    const creatorId = req.query.creator_id;
    if (!creatorId) {
      return res.status(400).json({ error: 'creator_id query param is required' });
    }

    // Query both tables in parallel
    const [legacyResult, videoResult] = await Promise.all([
      supabase
        .from('identities')
        .select('*')
        .eq('profile_id', creatorId)
        .order('created_at', { ascending: false }),
      supabase
        .from('identity_records')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
    ]);

    const legacy = (legacyResult.data || []).map(r => ({ ...r, type: 'legacy' }));
    const videos = (videoResult.data || []).map(r => ({ ...r, type: 'video' }));

    // Merge: video identities first (newest creation path), then legacy
    return res.json({ identities: [...videos, ...legacy] });
  } catch (err) {
    console.error('identity list error:', err);
    return res.status(500).json({ error: 'Failed to fetch identities' });
  }
});

// POST /api/identity/create-from-video
router.post('/create-from-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const creatorId = req.body.creator_id;
    if (!creatorId) {
      return res.status(400).json({ error: 'creator_id is required' });
    }

    // Generate unique filename
    const fileId = uuid();
    const fileName = `identity-videos/${creatorId}/${fileId}.mp4`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('identity-videos')
      .upload(fileName, req.file.buffer, {
        contentType: 'video/mp4',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload video' });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('identity-videos')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Create identity record in Supabase
    const { data: identityRecord, error: identityError } = await supabase
      .from('identity_records')
      .insert({
        id: fileId,
        creator_id: creatorId,
        video_url: publicUrl,
        status: 'uploaded',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (identityError) {
      console.error('Identity record error:', identityError);
      return res.status(500).json({ error: 'Failed to create identity record' });
    }

    // Respond to frontend
    return res.json({
      success: true,
      identity: identityRecord
    });

  } catch (err) {
    console.error('create-from-video error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

