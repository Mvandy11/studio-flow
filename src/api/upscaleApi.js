import { api } from '../lib/api.js';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * POST /api/ai/upscale via XHR (supports upload progress tracking).
 */
export async function uploadForUpscale(file, scaleFactor = 4, signal = null, onProgress = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scaleFactor', String(scaleFactor));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid JSON response from server.'));
        }
      } else {
        let message = `Server error (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.error) message = body.error;
        } catch {}
        reject(new Error(message));
      }
    });

    xhr.addEventListener('error', () =>
      reject(new Error('Network error. Please check your connection.'))
    );
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

    xhr.open('POST', `${BASE}/api/ai/upscale`);
    xhr.send(formData);
  });
}

/**
 * GET /api/ai/outputs — fetch saved AI output records.
 */
export async function fetchAiOutputs(tool = null) {
  const path = tool
    ? `/api/ai/outputs?tool=${encodeURIComponent(tool)}`
    : '/api/ai/outputs';
  return api(path);
}
