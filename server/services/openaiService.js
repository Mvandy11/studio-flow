import fs from 'fs';
import os from 'os';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { applyNoiseReduction } from './ffmpegService.js';

// ── OpenAI client (uses Replit AI Integrations env vars) ────
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

/**
 * Denoises audio using a two-stage pipeline:
 *
 * Stage 1 — ffmpeg pre-processing:
 *   Applies `anlmdn` + `afftdn` noise reduction filters to remove broadband
 *   noise, hiss, hum, and low-frequency rumble while preserving speech.
 *
 * Stage 2 — OpenAI `gpt-audio` speech-to-speech enhancement:
 *   Sends the pre-processed audio to OpenAI's gpt-audio model with a
 *   prompt to reproduce the speech clearly. This provides an additional
 *   AI-powered enhancement pass on top of the signal processing.
 *   The resulting WAV is the final cleaned output.
 *
 * @param {string} inputAudioPath - Path to the input WAV file
 * @returns {Promise<{ cleanedBuffer: Buffer, cleanedFilename: string }>}
 */
export async function denoiseAudio(inputAudioPath) {
  const tempDir = os.tmpdir();
  const preProcessedPath = path.join(tempDir, `pre-${uuidv4()}.wav`);
  const finalOutputPath = path.join(tempDir, `denoised-${uuidv4()}.wav`);

  try {
    // ── Stage 1: ffmpeg noise reduction pre-pass ─────────────
    console.log('[openai] Stage 1: ffmpeg noise reduction...');
    await applyNoiseReduction(inputAudioPath, preProcessedPath);

    // ── Stage 2: OpenAI gpt-audio speech enhancement ─────────
    console.log('[openai] Stage 2: OpenAI gpt-audio enhancement...');
    const audioBuffer = fs.readFileSync(preProcessedPath);
    const base64Audio = audioBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-audio',
      modalities: ['text', 'audio'],
      audio: { voice: 'alloy', format: 'wav' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This audio may contain background noise. Reproduce the speech clearly and naturally, removing any remaining background sounds. Maintain the same words, pace, and intent of the original speaker.',
            },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: 'wav',
              },
            },
          ],
        },
      ],
    });

    // ── Decode the returned audio ─────────────────────────────
    const audioData = response.choices?.[0]?.message?.audio?.data;

    let cleanedBuffer;
    if (audioData) {
      cleanedBuffer = Buffer.from(audioData, 'base64');
      console.log('[openai] AI enhancement successful.');
    } else {
      // Fallback: use the ffmpeg-processed audio if AI response has no audio
      console.warn('[openai] AI returned no audio — using ffmpeg-processed output.');
      cleanedBuffer = fs.readFileSync(preProcessedPath);
    }

    const cleanedFilename = `denoised-${uuidv4()}.wav`;
    return { cleanedBuffer, cleanedFilename };
  } finally {
    // Cleanup temp files
    [preProcessedPath, finalOutputPath].forEach((p) => {
      if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) {}
    });
  }
}
