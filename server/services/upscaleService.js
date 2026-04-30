import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Real-ESRGAN model on Replicate
const MODEL_ID =
  'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b';

/**
 * Upscale an image buffer using Real-ESRGAN via Replicate.
 *
 * @param {Buffer}  imageBuffer  - Raw image bytes (PNG/JPEG/WebP)
 * @param {number}  scaleFactor  - 2 or 4 (default 4)
 * @param {string}  mimeType     - Source MIME type (default image/png)
 * @returns {Promise<{ buffer: Buffer, width: number|null, height: number|null }>}
 */
export async function upscaleImage(imageBuffer, scaleFactor = 4, mimeType = 'image/png') {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set.');
  }

  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const output = await replicate.run(MODEL_ID, {
    input: {
      image: dataUri,
      scale: scaleFactor,
      face_enhance: false,
    },
  });

  // output is a URL string from Replicate
  const resultUrl = typeof output === 'string' ? output : output[0];
  if (!resultUrl) throw new Error('Replicate returned no output URL.');

  const response = await fetch(resultUrl);
  if (!response.ok) throw new Error(`Failed to download upscaled image: ${response.status}`);

  const resultBuffer = Buffer.from(await response.arrayBuffer());

  // Read output dimensions with sharp (optional — don't fail if sharp is absent)
  let width = null;
  let height = null;
  try {
    const { default: sharp } = await import('sharp');
    const meta = await sharp(resultBuffer).metadata();
    width = meta.width ?? null;
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
