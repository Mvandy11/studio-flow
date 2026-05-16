import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { upscaleImage, getImageDimensions } from '../../services/upscaleService.js';
import { uploadBuffer } from '../../utils/supabaseUpload.js';

const router = Router();

const ALLOWED_IMAGE_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported image type: ${file.mimetype}. Use PNG, JPEG, or WebP.`
        )
      );
    }
  },
});

/**
 * POST /api/ai/upscale
 *
 * Accepts a PNG/JPEG/WebP image (≤ 10 MB) + scaleFactor (2 or 4).
 * Runs Real-ESRGAN on Replicate, saves result to Supabase Storage,
 * and returns metadata.
 */
router.post('/upscale', upload.single('file'), async (req, res) => {
  // Guard: fail fast if the Replicate token is missing rather than hanging
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(503).json({
      error: 'AI upscaling is not available — REPLICATE_API_TOKEN is not configured.',
    });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded. Include a PNG/JPEG/WebP image named "file".' });
  }

  const scaleFactor = parseInt(req.body?.scaleFactor ?? '4', 10);
  if (![2, 4].includes(scaleFactor)) {
    return res.status(400).json({ error: 'scaleFactor must be 2 or 4.' });
  }

  try {
    const { buffer: inputBuffer, mimetype, originalname } = req.file;

    // ── Get source dimensions ─────────────────────────────────
    const { width: srcWidth, height: srcHeight } = await getImageDimensions(inputBuffer);

    // ── Upscale via Replicate / Real-ESRGAN ───────────────────
    console.log(`[upscale] Running ${scaleFactor}× upscale on "${originalname}"…`);
    const { buffer: upscaledBuffer, width, height } = await upscaleImage(
      inputBuffer,
      scaleFactor,
      mimetype
    );

    const ext = originalname.split('.').pop() || 'png';
    const upscaledFilename = `upscaled-${scaleFactor}x-${uuidv4()}.${ext}`;

    // ── Upload to Supabase Storage ────────────────────────────
    const { publicUrl: upscaledUrl } = await uploadBuffer(
      upscaledBuffer,
      'library/ai-outputs/upscale',
      upscaledFilename,
      mimetype
    );

    // ── Also save the original ────────────────────────────────
    const originalFilename = `original-${uuidv4()}.${ext}`;
    const { publicUrl: originalUrl } = await uploadBuffer(
      inputBuffer,
      'library/ai-outputs/upscale',
      originalFilename,
      mimetype
    );

    // ── (Optionally) insert into ai_outputs table ─────────────
    // Uncomment once the ai_outputs table is created:
    // await supabase.from('ai_outputs').insert({
    //   url: upscaledUrl,
    //   filename: originalname,
    //   tool: 'upscale',
    //   resolution: width && height ? `${width}×${height}` : null,
    //   createdAt: new Date().toISOString(),
    // });

    return res.json({
      tool: 'upscale',
      originalUrl,
      upscaledUrl,
      filename: originalname,
      scaleFactor,
      resolution: width && height ? `${width}×${height}` : null,
      srcResolution:
        srcWidth && srcHeight ? `${srcWidth}×${srcHeight}` : null,
      fileSize: upscaledBuffer.length,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[upscale] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
