const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Upload an image for AI enhancement.
 * @param {File}   file              - The image file to enhance.
 * @param {object} [options]
 * @param {string} [options.quality] - "low" | "medium" | "high" | "auto"
 * @param {string} [options.size]    - "auto" | "1024x1024" | "1536x1024" | "1024x1536"
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ success: boolean, image: string, metadata: object }>}
 */
export async function enhanceImage(file, options = {}) {
  const formData = new FormData();
  formData.append('image', file);
  if (options.quality) formData.append('quality', options.quality);
  if (options.size)    formData.append('size',    options.size);

  const res = await fetch(`${API_BASE}/api/ai/enhance`, {
    method: 'POST',
    body:   formData,
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new EnhanceApiError(body.error || `Enhancement failed (${res.status})`, res.status);
  }

  return res.json();
}

export class EnhanceApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name   = 'EnhanceApiError';
    this.status = status;
  }
}
