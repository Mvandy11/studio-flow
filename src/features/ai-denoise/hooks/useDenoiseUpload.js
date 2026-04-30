import { useState, useCallback } from 'react';

const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac',
  'audio/mp4', 'audio/webm',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
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
      return `Unsupported file type "${f.type}". Please upload an audio or video file.`;
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
      const xhr = new XMLHttpRequest();
      const response = await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Invalid response from server.')); }
          } else {
            let message = `Server error (${xhr.status})`;
            try { const body = JSON.parse(xhr.responseText); if (body.error) message = body.error; } catch {}
            reject(new Error(message));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error. Please check your connection.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));
        xhr.open('POST', '/api/ai/denoise');
        xhr.send(formData);
      });

      if (!response.originalFileUrl || !response.cleanedFileUrl)
        throw new Error('Incomplete response: missing audio URLs.');

      setResult({ originalFileUrl: response.originalFileUrl, cleanedFileUrl: response.cleanedFileUrl });
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
