import fs from 'fs';
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

// Map file extension → OpenAI input_audio.format value.
// ffmpeg is NOT used — audio is passed directly to gpt-4o-audio-preview.
const EXT_TO_FORMAT = {
  '.mp3':  'mp3',
  '.wav':  'wav',
  '.ogg':  'ogg',
  '.flac': 'flac',
  '.aac':  'aac',
  '.m4a':  'mp4',
  '.webm': 'webm',
};

/**
 * Denoises audio using OpenAI gpt-4o-audio-preview.
 *
 * The file is read from disk, base64-encoded, and submitted directly to the
 * model — no ffmpeg pre-processing. The model returns cleaned WAV audio.
 *
 * @param {string} inputAudioPath - Path to the uploaded audio file
 * @returns {Promise<{ cleanedBuffer: Buffer, cleanedFilename: string }>}
 */
export async function denoiseAudio(inputAudioPath) {
  // Detect actual format from extension so OpenAI decodes the bytes correctly.
  // Defaulting to 'wav' when unknown is the safest fallback.
  const ext    = path.extname(inputAudioPath).toLowerCase();
  const format = EXT_TO_FORMAT[ext] ?? 'wav';

  console.log('[denoise] Reading audio file, format:', format);
  const audioBuffer = fs.readFileSync(inputAudioPath);
  const base64Audio = audioBuffer.toString('base64');

  console.log('[denoise] Calling gpt-4o-audio-preview...');
  const response = await getOpenAI().chat.completions.create({
    model:      'gpt-4o-audio-preview',
    modalities: ['text', 'audio'],
    audio:      { voice: 'alloy', format: 'wav' },  // output format
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
            input_audio: { data: base64Audio, format },  // input format matches file
          },
        ],
      },
    ],
  });

  // Decode the returned audio — fall back to original if model returns nothing
  const audioData = response.choices?.[0]?.message?.audio?.data;
  let cleanedBuffer;
  if (audioData) {
    cleanedBuffer = Buffer.from(audioData, 'base64');
    console.log('[denoise] AI enhancement successful.');
  } else {
    console.warn('[denoise] AI returned no audio — using original as fallback.');
    cleanedBuffer = audioBuffer;
  }

  const cleanedFilename = `denoised-${uuidv4()}.wav`;
  return { cleanedBuffer, cleanedFilename };
}
