import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleDenoise } from '../controllers/denoiseController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// ── Multer: accept audio and video uploads ──────────────────
const ALLOWED_MIMETYPES = new Set([
  'audio/mpeg',       // mp3
  'audio/wav',        // wav
  'audio/x-wav',
  'audio/wave',
  'video/mp4',        // mp4
  'video/quicktime',  // mov
]);

const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.mp4', '.mov']);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMETYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use mp3, wav, mp4, or mov.`));
    }
  },
});

// POST /api/ai/denoise
router.post('/denoise', upload.single('file'), handleDenoise);

export default router;
