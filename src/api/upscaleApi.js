/**
 * Fetch wrapper for POST /api/ai/upscale
 *
 * @param {File}    file         - Image file (PNG/JPEG/WebP, ≤ 10 MB)
 * @param {number}  scaleFactor  - 2 or 4
 * @param {AbortSignal} signal   - AbortController signal for cancellation
 * @param {function} onProgress  - Optional progress callback (0–100)
 * @returns {Promise<object>}    - Server response JSON
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

    xhr.open('POST', '/api/ai/upscale');
    xhr.send(formData);
  });
}

/**
 * Fetch /api/ai/outputs
 *
 * @param {string|null} tool  - Filter: 'denoise' | 'upscale' | null (all)
 */
export async function fetchAiOutputs(tool = null) {
  const url = tool ? `/api/ai/outputs?tool=${encodeURIComponent(tool)}` : '/api/ai/outputs';
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load outputs (${res.status})`);
  }
  return res.json();
}
