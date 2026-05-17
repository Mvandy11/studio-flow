import { useState, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac',
  'audio/mp4', 'audio/webm',
];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export function useDenoiseUpload() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const validate = useCallback((f) => {
    if (!f) return 'No file selected.';
    if (!ALLOWED_TYPES.includes(f.type))
      return `Unsupported file type "${f.type}". Please upload an audio file (mp3, wav, ogg, flac, aac, webm).`;
    if (f.size > MAX_FILE_SIZE)
      return `File exceeds the 500 MB limit (${(f.size / 1024 / 1024).toFixed(1)} MB).`;
    return null;
  }, []);

  const upload = useCallback(async (selectedFile) => {
    const validationError = validate(selectedFile);
    if (validationError) { setError(validationError); return; }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${BASE}/api/ai/denoise`, {
        method: 'POST',
        body:   formData,
      });

      let body;
      try { body = await res.json(); }
      catch { throw new Error('Invalid response from server.'); }

      if (!res.ok) {
        throw new Error(body.message || body.error || `Server error (${res.status})`);
      }

      if (!body.originalFileUrl || !body.cleanedFileUrl)
        throw new Error('Incomplete response: missing audio URLs.');

      setResult({ originalFileUrl: body.originalFileUrl, cleanedFileUrl: body.cleanedFileUrl });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  }, [validate]);

  const reset = useCallback(() => {
    setFile(null); setIsUploading(false); setProgress(0); setError(null); setResult(null);
  }, []);

  return { file, isUploading, progress, error, result, upload, reset };
}
