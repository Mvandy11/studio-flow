import path from 'path';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm']);

// ── Lazy fluent-ffmpeg loader ─────────────────────────────────
// fluent-ffmpeg requires a native FFmpeg binary which is NOT available in
// Netlify Functions / Lambda. Loading it lazily means the module can be
// imported anywhere without crashing the process on startup — it only
// throws when an audio/video processing function is actually called.
let _ffmpeg = null;

async function getFFmpeg() {
  if (_ffmpeg) return _ffmpeg;
  try {
    const mod = await import('fluent-ffmpeg');
    _ffmpeg = mod.default ?? mod;
    return _ffmpeg;
  } catch {
    throw new Error(
      'Audio/video processing is not available in this environment. ' +
      'FFmpeg requires a dedicated server — please upload audio files directly.'
    );
  }
}

/**
 * Returns true if the file at `filePath` is a video.
 */
export function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Extracts the audio track from a video file and writes it as a WAV.
 */
export async function extractAudioFromVideo(inputPath, outputPath) {
  const ffmpeg = await getFFmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(44100)
      .audioChannels(2)
      .format('wav')
      .on('end', resolve)
      .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
      .save(outputPath);
  });
}

/**
 * Returns the duration (in seconds) of an audio or video file.
 */
export async function getAudioDuration(filePath) {
  const ffmpeg = await getFFmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`Could not probe file: ${err.message}`));
      resolve(metadata?.format?.duration ?? 0);
    });
  });
}

/**
 * Applies ffmpeg noise reduction to an audio file as a pre-processing step
 * before sending to the AI service.
 */
export async function applyNoiseReduction(inputPath, outputPath) {
  const ffmpeg = await getFFmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        'anlmdn=s=7:p=0.002:r=0.002:m=15',
        'afftdn=nf=-25:nr=33:nt=w',
        'highpass=f=80',
        'lowpass=f=16000',
        'dynaudnorm=f=250:g=15',
      ])
      .audioCodec('pcm_s16le')
      .audioFrequency(44100)
      .audioChannels(1)
      .format('wav')
      .on('end', resolve)
      .on('error', (err) => reject(new Error(`Noise reduction failed: ${err.message}`)))
      .save(outputPath);
  });
}
