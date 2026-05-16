import fs from 'fs';
import path from 'path';
import { denoiseAudio } from '../services/openaiService.js';
import { uploadToSupabase } from '../services/supabaseStorageService.js';

// ffmpeg is NOT used here — video extraction is unsupported in environments
// without a native FFmpeg binary. Audio files are passed directly to OpenAI.
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi']);

/**
 * POST /api/ai/denoise
 *
 * Accepts an audio file (mp3, wav, ogg, flac, aac, webm), passes it directly
 * to the OpenAI audio enhancement model, saves the result to Supabase, and
 * returns metadata. Always returns valid JSON — never HTML.
 */
export async function handleDenoise(req, res) {
  const uploadedPath = req.file?.path;

  if (!uploadedPath) {
    return res.status(400).json({
      error: true,
      message: 'No file uploaded. Include a file field named "file".',
    });
  }

  try {
    // Video files require ffmpeg for audio extraction, which is not available.
    // Return a clear JSON error instead of crashing.
    const ext = path.extname(uploadedPath).toLowerCase();
    if (VIDEO_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        error: true,
        message:
          'Video files are not supported. Please upload an audio file directly (mp3, wav, ogg, flac, aac, webm).',
      });
    }

    // ── Step 1: AI denoise (direct — no ffmpeg pre-pass) ─────────────────────
    console.log('[denoise] Sending to AI denoise...');
    const { cleanedBuffer, cleanedFilename } = await denoiseAudio(uploadedPath);

    // ── Step 2: Upload cleaned file to Supabase ───────────────────────────────
    console.log('[denoise] Uploading cleaned file to Supabase...');
    const { publicUrl: cleanedFileUrl } = await uploadToSupabase(
      cleanedBuffer,
      cleanedFilename,
      'library/ai-outputs/denoise'
    );

    // ── Step 3: Upload original to Supabase ───────────────────────────────────
    const originalBuffer   = fs.readFileSync(uploadedPath);
    const originalFilename = `original-${Date.now()}${ext}`;
    const { publicUrl: originalFileUrl } = await uploadToSupabase(
      originalBuffer,
      originalFilename,
      'library/ai-outputs/denoise'
    );

    return res.json({
      tool:          'denoise',
      originalFileUrl,
      cleanedFileUrl,
      fileSize:      cleanedBuffer.length,
      filename:      cleanedFilename,
      processedAt:   new Date().toISOString(),
    });
  } catch (err) {
    console.error('[denoise] Pipeline error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  } finally {
    // Always clean up the temp upload regardless of success or failure
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      try { fs.unlinkSync(uploadedPath); } catch (_) {}
    }
  }
}
