import { Router }       from 'express';
import multer            from 'multer';
import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';
import OpenAI            from 'openai';
import { v4 as uuidv4 }  from 'uuid';
import { uploadToSupabase } from '../../services/supabaseStorageService.js';

// ── Directory resolution (ESM-safe) ──────────────────────────────────────────
let __dirname;
try { __dirname = path.dirname(fileURLToPath(import.meta.url)); }
catch { __dirname = process.cwd(); }

// ── OpenAI client (lazy) ──────────────────────────────────────────────────────
let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;
  const apiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey) throw new Error('OpenAI API key is not configured.');
  _openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  return _openai;
}

// ── Audio format map ──────────────────────────────────────────────────────────
// Maps file extension → OpenAI input_audio.format.
// No ffmpeg — raw uploaded bytes go directly to gpt-4o-audio-preview.
const EXT_TO_FORMAT = {
  '.mp3':  'mp3',
  '.wav':  'wav',
  '.ogg':  'ogg',
  '.flac': 'flac',
  '.aac':  'aac',
  '.m4a':  'mp4',
  '.webm': 'webm',
};

// Video-only containers that need ffmpeg for audio extraction — not supported
const VIDEO_ONLY = new Set(['.mp4', '.mov', '.mkv', '.avi']);

// ── Multer — disk storage ─────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.LAMBDA_TASK_ROOT
  ? '/tmp'
  : path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `denoise-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIMETYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/ogg',  'audio/flac', 'audio/aac', 'audio/mp4', 'audio/webm',
]);
const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.webm', '.m4a']);

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMETYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(
        `Unsupported file type: ${file.mimetype}. Upload mp3, wav, ogg, flac, aac, or webm.`
      ));
    }
  },
});

// ── Route handler ─────────────────────────────────────────────────────────────
async function handleDenoise(req, res) {
  const uploadedPath = req.file?.path;

  if (!uploadedPath) {
    return res.status(400).json({
      error: true,
      message: 'No file uploaded. Include a file field named "file".',
    });
  }

  try {
    const ext = path.extname(uploadedPath).toLowerCase();

    if (VIDEO_ONLY.has(ext)) {
      return res.status(400).json({
        error: true,
        message:
          'Video files are not supported. Upload an audio file directly (mp3, wav, ogg, flac, aac, webm).',
      });
    }

    // ── Step 1: Read file and call OpenAI ─────────────────────────────────────
    const format      = EXT_TO_FORMAT[ext] ?? 'wav';
    const audioBuffer = fs.readFileSync(uploadedPath);
    const base64Audio = audioBuffer.toString('base64');

    console.log(`[denoise] Calling gpt-4o-audio-preview (format=${format})...`);

    const response = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-audio-preview',
      modalities: ['text', 'audio'],
      audio:      { voice: 'alloy', format: 'wav' },   // output: always wav
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
              input_audio: { data: base64Audio, format }, // input: actual file format
            },
          ],
        },
      ],
    });

    // ── Step 2: Decode model output ───────────────────────────────────────────
    const audioData     = response.choices?.[0]?.message?.audio?.data;
    const cleanedBuffer = audioData
      ? Buffer.from(audioData, 'base64')
      : audioBuffer; // fallback: return original if model returns nothing

    if (!audioData) {
      console.warn('[denoise] Model returned no audio — using original as fallback.');
    } else {
      console.log('[denoise] AI enhancement successful.');
    }

    // ── Step 3: Upload cleaned file to Supabase ───────────────────────────────
    const cleanedFilename        = `denoised-${uuidv4()}.wav`;
    const { publicUrl: cleanedFileUrl } = await uploadToSupabase(
      cleanedBuffer,
      cleanedFilename,
      'library/ai-outputs/denoise'
    );

    // ── Step 4: Upload original to Supabase ───────────────────────────────────
    const originalFilename            = `original-${Date.now()}${ext}`;
    const { publicUrl: originalFileUrl } = await uploadToSupabase(
      audioBuffer,
      originalFilename,
      'library/ai-outputs/denoise'
    );

    return res.json({
      tool:           'denoise',
      originalFileUrl,
      cleanedFileUrl,
      fileSize:       cleanedBuffer.length,
      filename:       cleanedFilename,
      processedAt:    new Date().toISOString(),
    });
  } catch (err) {
    console.error('[denoise] Pipeline error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  } finally {
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      try { fs.unlinkSync(uploadedPath); } catch (_) {}
    }
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
// Mounted at /api/ai by server/app.js → final path: POST /api/ai/denoise
// Canonical source: app/api/ai/denoise/route.js (re-exports this module)
const router = Router();
router.post('/denoise', upload.single('file'), handleDenoise);

export default router;
