import fs from 'fs';
import os from 'os';
import path from 'path';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// ── Lazy OpenAI client ────────────────────────────────────────────────────────
// Uses Replit AI Integration keys when available (AI_INTEGRATIONS_OPENAI_API_KEY
// + AI_INTEGRATIONS_OPENAI_BASE_URL). Falls back to a bare OPENAI_API_KEY for
// non-Replit environments.
let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;

  const apiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error(
      'OpenAI API key is not configured. ' +
      'Enable the OpenAI integration in Replit, or set OPENAI_API_KEY.'
    );
  }

  _openai = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return _openai;
}

// ── Lazy ffmpegService loader ─────────────────────────────────────────────────
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
 *   Applies `anlmdn` + `afftdn` noise reduction filters.
 *
 * Stage 2 — OpenAI gpt-4o-audio-preview speech-to-speech enhancement.
 *
 * @param {string} inputAudioPath - Path to the input audio file
 * @returns {Promise<{ cleanedBuffer: Buffer, cleanedFilename: string }>}
 */
export async function denoiseAudio(inputAudioPath) {
  const tempDir          = os.tmpdir();
  const preProcessedPath = path.join(tempDir, `pre-${uuidv4()}.wav`);
  const finalOutputPath  = path.join(tempDir, `denoised-${uuidv4()}.wav`);

  let audioPath = inputAudioPath;

  try {
    // ── Stage 1: ffmpeg noise-reduction pre-pass ──────────────────
    const ffmpeg = await getFfmpegService();
    if (ffmpeg?.applyNoiseReduction) {
      try {
        console.log('[openai] Stage 1: ffmpeg noise reduction...');
        await ffmpeg.applyNoiseReduction(inputAudioPath, preProcessedPath);
        audioPath = preProcessedPath;
      } catch (ffmpegErr) {
        console.warn('[openai] ffmpeg pre-pass failed, skipping:', ffmpegErr.message);
      }
    } else {
      console.log('[openai] ffmpeg not available — sending audio directly to AI.');
    }

    // ── Stage 2: OpenAI gpt-4o-audio-preview ──────────────────────
    console.log('[openai] Stage 2: OpenAI audio enhancement...');
    const audioBuffer = fs.readFileSync(audioPath);
    const base64Audio = audioBuffer.toString('base64');

    const response = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-audio-preview',
      modalities: ['text', 'audio'],
      audio:      { voice: 'alloy', format: 'wav' },
      messages: [
        {
          role:    'user',
          content: [
            {
              type: 'text',
              text:
                'This audio may contain background noise. Reproduce the speech clearly ' +
                'and naturally, removing any remaining background sounds. Maintain the ' +
                'same words, pace, and intent of the original speaker.',
            },
            {
              type:        'input_audio',
              input_audio: { data: base64Audio, format: 'wav' },
            },
          ],
        },
      ],
    });

    // ── Decode returned audio ──────────────────────────────────────
    const audioData = response.choices?.[0]?.message?.audio?.data;

    let cleanedBuffer;
    if (audioData) {
      cleanedBuffer = Buffer.from(audioData, 'base64');
      console.log('[openai] AI enhancement successful.');
    } else {
      console.warn('[openai] AI returned no audio data — using pre-processed output.');
      cleanedBuffer = fs.readFileSync(audioPath);
    }

    const cleanedFilename = `denoised-${uuidv4()}.wav`;
    return { cleanedBuffer, cleanedFilename };
  } finally {
    [preProcessedPath, finalOutputPath].forEach((p) => {
      if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch (_) {} }
    });
  }
}
