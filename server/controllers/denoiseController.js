import fs from 'fs';
import path from 'path';
import { extractAudioFromVideo, isVideoFile, getAudioDuration } from '../services/ffmpegService.js';
import { denoiseAudio } from '../services/openaiService.js';
import { uploadToSupabase } from '../services/supabaseStorageService.js';

/**
 * POST /api/ai/denoise
 *
 * Accepts an audio or video file, runs it through the AI denoise pipeline,
 * saves the cleaned WAV to Supabase, and returns metadata.
 */
export async function handleDenoise(req, res) {
  const uploadedPath = req.file?.path;

  if (!uploadedPath) {
    return res.status(400).json({ error: 'No file uploaded. Include a file field named "file".' });
  }

  let audioPath = uploadedPath; // path we will actually send to OpenAI
  let extractedAudioPath = null;

  try {
    // ── Step 1: If video, extract audio track ────────────────
    if (isVideoFile(uploadedPath)) {
      console.log('[denoise] Video detected — extracting audio...');
      extractedAudioPath = uploadedPath.replace(/\.[^.]+$/, '-extracted.wav');
      await extractAudioFromVideo(uploadedPath, extractedAudioPath);
      audioPath = extractedAudioPath;
    }

    // ── Step 2: Get original file duration ───────────────────
    const duration = await getAudioDuration(audioPath);

    // ── Step 3: Run AI denoise ────────────────────────────────
    console.log('[denoise] Sending to AI denoise service...');
    const { cleanedBuffer, cleanedFilename } = await denoiseAudio(audioPath);

    // ── Step 4: Upload cleaned file to Supabase ───────────────
    console.log('[denoise] Uploading cleaned file to Supabase...');
    const { publicUrl: cleanedFileUrl } = await uploadToSupabase(
      cleanedBuffer,
      cleanedFilename,
      'library/ai-outputs/denoise'
    );

    // ── Step 5: Upload original (or extracted) to Supabase ────
    const originalBuffer = fs.readFileSync(audioPath);
    const originalFilename = `original-${Date.now()}.wav`;
    const { publicUrl: originalFileUrl } = await uploadToSupabase(
      originalBuffer,
      originalFilename,
      'library/ai-outputs/denoise'
    );

    // ── Step 6: Build response ────────────────────────────────
    return res.json({
      tool: 'denoise',
      originalFileUrl,
      cleanedFileUrl,
      duration: Math.round(duration * 100) / 100,
      fileSize: cleanedBuffer.length,
      filename: cleanedFilename,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[denoise] Pipeline error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    // ── Cleanup temp files ────────────────────────────────────
    [uploadedPath, extractedAudioPath].forEach((p) => {
      if (p && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) {}
      }
    });
  }
}
