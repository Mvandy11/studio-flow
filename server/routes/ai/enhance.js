import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import supabase from '../../supabase.js';

const router = express.Router();

// ── Lazy sharp loader (never at top-level — CJS safe) ────────
let _sharp = null;
async function getSharp() {
  if (_sharp) return _sharp;
  try {
    const mod = await import('sharp');
    _sharp = mod.default ?? mod;
  } catch {
    // sharp binary not available in this environment
  }
  return _sharp;
}

// ── Lazy OpenAI client (avoids crash on boot if key is missing) ──
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const BUCKET       = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';
const ENHANCE_PATH = 'library/ai-outputs/enhance';

// ── Multer: accept common image types, max 20 MB ─────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PNG, JPEG, and WebP images are accepted.'));
  },
});

// ── POST /api/ai/enhance ─────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const qualityLevel = req.body.quality || 'high';
    const outputSize   = req.body.size    || 'auto';

    // ── Call OpenAI Image Edit API ────────────────────────────
    const imageFile = new File([buffer], originalname, { type: mimetype });

    const response = await getOpenAI().images.edit({
      model:   'gpt-image-1',
      image:   [imageFile],
      prompt: [
        'Enhance this image to improve its overall quality.',
        'Increase clarity and sharpness while preserving the original composition,',
        'colors, and subject matter. Reduce noise, correct any subtle color issues,',
        'and make fine details more defined. The result should look like a',
        'professionally retouched, high-resolution version of the original.',
      ].join(' '),
      quality:        qualityLevel,
      size:           outputSize,
      input_fidelity: 'high',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({ error: 'No image data returned from AI.' });
    }

    const enhancedBuffer = Buffer.from(b64, 'base64');

    // ── Extract metadata with sharp (lazy, graceful) ──────────
    let metadata   = { width: null, height: null, format: 'png' };
    let resolution = 'unknown';
    const sharp = await getSharp();
    if (sharp) {
      try {
        metadata   = await sharp(enhancedBuffer).metadata();
        resolution = `${metadata.width}x${metadata.height}`;
      } catch {
        // non-fatal — continue without metadata
      }
    }

    // ── Upload to Supabase Storage ────────────────────────────
    const id          = randomUUID();
    const filename    = `enhanced_${Date.now()}_${id}.png`;
    const storagePath = `${ENHANCE_PATH}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, enhancedBuffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('[enhance] Supabase upload error:', uploadError.message);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    // ── Persist metadata row ──────────────────────────────────
    const record = {
      id,
      tool:          'enhance',
      filename,
      storage_path:  storagePath,
      public_url:    urlData?.publicUrl || null,
      resolution,
      width:         metadata.width,
      height:        metadata.height,
      format:        metadata.format || 'png',
      original_name: originalname,
      quality:       qualityLevel,
      size_bytes:    enhancedBuffer.length,
      created_at:    new Date().toISOString(),
    };

    const { error: dbError } = await supabase.from('ai_outputs').insert(record);
    if (dbError) {
      console.error('[enhance] Supabase DB insert error:', dbError.message);
    }

    return res.status(200).json({
      success:  true,
      image:    `data:image/png;base64,${b64}`,
      metadata: record,
    });
  } catch (err) {
    console.error('[enhance] Error:', err.message);
    if (err?.status === 400) {
      return res.status(400).json({ error: 'The image could not be processed. Please try a different file.' });
    }
    if (err?.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }
    return res.status(500).json({ error: 'An unexpected error occurred while enhancing the image.' });
  }
});

export default router;
