import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleDenoise } from '../../controllers/denoiseController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const ALLOWED_MIMETYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'audio/webm',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
]);
const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.mov', '.webm']);

// Use /tmp when running in a serverless environment (Netlify/Lambda),
// fall back to the local uploads/ directory for local dev.
const UPLOAD_DIR = process.env.LAMBDA_TASK_ROOT
  ? '/tmp'
  : path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMETYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use mp3, wav, mp4, or mov.`));
    }
  },
});

router.post('/denoise', upload.single('file'), handleDenoise);

export default router;
