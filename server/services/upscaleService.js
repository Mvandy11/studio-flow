import Replicate from 'replicate';

// Real-ESRGAN model on Replicate
const MODEL_ID =
  'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b';

// ── Lazy Replicate client ─────────────────────────────────────────────────────
// Initialized on first use so the module doesn't crash at boot when the env
// var isn't set. Checks both REPLICATE_API_KEY (user-specified) and the
// legacy REPLICATE_API_TOKEN alias.
let _replicate = null;

function getReplicate() {
  if (_replicate) return _replicate;

  const auth = process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN;
  if (!auth) {
    throw new Error(
      'Replicate API key is not configured. ' +
      'Set REPLICATE_API_KEY (or REPLICATE_API_TOKEN) in your environment secrets.'
    );
  }

  _replicate = new Replicate({ auth });
  return _replicate;
}

/**
 * Upscale an image buffer using Real-ESRGAN via Replicate.
 *
 * @param {Buffer}  imageBuffer  - Raw image bytes (PNG/JPEG/WebP)
 * @param {number}  scaleFactor  - 2 or 4 (default 4)
 * @param {string}  mimeType     - Source MIME type (default image/png)
 * @returns {Promise<{ buffer: Buffer, width: number|null, height: number|null }>}
 */
export async function upscaleImage(imageBuffer, scaleFactor = 4, mimeType = 'image/png') {
  const replicate = getReplicate(); // throws if key is missing

  const base64  = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const output = await replicate.run(MODEL_ID, {
    input: {
      image:        dataUri,
      scale:        scaleFactor,
      face_enhance: false,
    },
  });

  // output is a URL string (or an array with one URL)
  const resultUrl = typeof output === 'string' ? output : output?.[0];
  if (!resultUrl) throw new Error('Replicate returned no output URL.');

  const response = await fetch(resultUrl);
  if (!response.ok) {
    throw new Error(`Failed to download upscaled image from Replicate: ${response.status}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());

  // Read output dimensions with sharp (optional — non-fatal if unavailable)
  let width  = null;
  let height = null;
  try {
    const { default: sharp } = await import('sharp');
    const meta = await sharp(resultBuffer).metadata();
    width  = meta.width  ?? null;
    height = meta.height ?? null;
  } catch {
    // sharp unavailable — dimensions stay null
  }

  return { buffer: resultBuffer, width, height };
}

/**
 * Read image dimensions from a buffer using sharp (no Replicate call).
 */
export async function getImageDimensions(buffer) {
  try {
    const { default: sharp } = await import('sharp');
    const { width, height } = await sharp(buffer).metadata();
    return { width: width ?? null, height: height ?? null };
  } catch {
    return { width: null, height: null };
  }
}
