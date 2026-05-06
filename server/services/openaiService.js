import fs from 'fs';
import os from 'os';
import path from 'path';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

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

// ── Lazy ffmpegService loader ─────────────────────────────────
// Never imported at the top level — fluent-ffmpeg requires a native binary
// that is not available in Netlify Functions / Lambda environments.
let _ffmpegService = null;
let _ffmpegLoaded  = false;

async function getFfmpegService() {
  if (_ffmpegLoaded) return _ffmpegService;
  _ffmpegLoaded = true;
  try {
    _ffmpegService = await import('./ffmpegService.js');
  } catch {
    _ffmpegService = null;
  }
  return _ffmpegService;
}

/**
 * Denoises audio using a two-stage pipeline:
 *
 * Stage 1 — ffmpeg pre-processing (when available):
 *   Applies `anlmdn` + `afftdn` noise reduction filters to remove broadband
 *   noise, hiss, hum, and low-frequency rumble while preserving speech.
 *
 * Stage 2 — OpenAI `gpt-audio` speech-to-speech enhancement:
 *   Sends the pre-processed audio to OpenAI's gpt-audio model.
 *   The resulting WAV is the final cleaned output.
 *
 * @param {string} inputAudioPath - Path to the input WAV file
 * @returns {Promise<{ cleanedBuffer: Buffer, cleanedFilename: string }>}
 */
export async function denoiseAudio(inputAudioPath) {
  const tempDir = os.tmpdir();
  const preProcessedPath = path.join(tempDir, `pre-${uuidv4()}.wav`);
  const finalOutputPath  = path.join(tempDir, `denoised-${uuidv4()}.wav`);

  let audioPath = inputAudioPath;

  try {
    // ── Stage 1: ffmpeg noise reduction pre-pass (graceful skip if unavailable) ──
    const ffmpeg = await getFfmpegService();
    if (ffmpeg?.applyNoiseReduction) {
      try {
        console.log('[openai] Stage 1: ffmpeg noise reduction...');
        await ffmpeg.applyNoiseReduction(inputAudioPath, preProcessedPath);
        audioPath = preProcessedPath;
      } catch (ffmpegErr) {
        console.warn('[openai] ffmpeg pre-pass unavailable, skipping:', ffmpegErr.message);
        // Fall through — send original audio to OpenAI
      }
    } else {
      console.log('[openai] ffmpeg not available — skipping Stage 1, sending audio directly to AI.');
    }

    // ── Stage 2: OpenAI gpt-audio speech enhancement ─────────
    console.log('[openai] Stage 2: OpenAI gpt-audio enhancement...');
    const audioBuffer = fs.readFileSync(audioPath);
    const base64Audio = audioBuffer.toString('base64');

    const response = await getOpenAI().chat.completions.create({
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
      // Fallback: use the pre-processed (or original) audio
      console.warn('[openai] AI returned no audio — using pre-processed output.');
      cleanedBuffer = fs.readFileSync(audioPath);
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
