import fs from 'fs';
import { denoiseAudio } from '../services/openaiService.js';
import { uploadToSupabase } from '../services/supabaseStorageService.js';

// ── Lazy ffmpeg loader (never at top-level — CJS safe) ───────
// ffmpeg is not available in serverless environments (Netlify/Lambda).
// The getter returns null gracefully so audio-only paths still work.
let _ffmpegService = null;
let _ffmpegLoaded  = false;

async function getFfmpegService() {
  if (_ffmpegLoaded) return _ffmpegService;
  _ffmpegLoaded = true;
  try {
    _ffmpegService = await import('../services/ffmpegService.js');
  } catch {
    // ffmpeg binary not available — video extraction disabled
    _ffmpegService = null;
  }
  return _ffmpegService;
}

/**
 * POST /api/ai/denoise
 *
 * Accepts an audio or video file, runs it through the AI denoise pipeline,
 * saves the cleaned WAV to Supabase, and returns metadata.
 *
 * Note: video → audio extraction requires ffmpeg. On Netlify (Lambda) only
 * direct audio uploads (mp3, wav, ogg, flac, aac) are supported.
 */
export async function handleDenoise(req, res) {
  const uploadedPath = req.file?.path;

  if (!uploadedPath) {
    return res.status(400).json({ error: 'No file uploaded. Include a file field named "file".' });
  }

  let audioPath          = uploadedPath;
  let extractedAudioPath = null;

  try {
    const ffmpeg = await getFfmpegService();

    // ── Step 1: If video, extract audio track (requires ffmpeg) ─
    const isVideo = ffmpeg?.isVideoFile?.(uploadedPath) ?? false;

    if (isVideo) {
      if (!ffmpeg) {
        return res.status(503).json({
          error: 'Video extraction is not available in this environment. Please upload an audio file (mp3, wav, ogg, flac, aac) directly.',
        });
      }
      console.log('[denoise] Video detected — extracting audio...');
      extractedAudioPath = uploadedPath.replace(/\.[^.]+$/, '-extracted.wav');
      await ffmpeg.extractAudioFromVideo(uploadedPath, extractedAudioPath);
      audioPath = extractedAudioPath;
    }

    // ── Step 2: Get original file duration (best-effort) ────────
    let duration = 0;
    if (ffmpeg?.getAudioDuration) {
      try {
        duration = await ffmpeg.getAudioDuration(audioPath);
      } catch {
        // non-fatal — proceed without duration
      }
    }

    // ── Step 3: Run AI denoise ────────────────────────────────────
    console.log('[denoise] Sending to AI denoise service...');
    const { cleanedBuffer, cleanedFilename } = await denoiseAudio(audioPath);

    // ── Step 4: Upload cleaned file to Supabase ───────────────────
    console.log('[denoise] Uploading cleaned file to Supabase...');
    const { publicUrl: cleanedFileUrl } = await uploadToSupabase(
      cleanedBuffer,
      cleanedFilename,
      'library/ai-outputs/denoise'
    );

    // ── Step 5: Upload original to Supabase ──────────────────────
    const originalBuffer  = fs.readFileSync(audioPath);
    const originalFilename = `original-${Date.now()}.wav`;
    const { publicUrl: originalFileUrl } = await uploadToSupabase(
      originalBuffer,
      originalFilename,
      'library/ai-outputs/denoise'
    );

    return res.json({
      tool: 'denoise',
      originalFileUrl,
      cleanedFileUrl,
      duration:    Math.round(duration * 100) / 100,
      fileSize:    cleanedBuffer.length,
      filename:    cleanedFilename,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[denoise] Pipeline error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    // ── Cleanup temp files ────────────────────────────────────────
    [uploadedPath, extractedAudioPath].forEach((p) => {
      if (p && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) {}
      }
    });
  }
}
