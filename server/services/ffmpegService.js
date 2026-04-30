import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm']);

/**
 * Returns true if the file at `filePath` is a video.
 */
export function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Extracts the audio track from a video file and writes it as a WAV.
 * @param {string} inputPath - Path to the source video
 * @param {string} outputPath - Path where the extracted WAV will be written
 * @returns {Promise<void>}
 */
export function extractAudioFromVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('pcm_s16le')  // uncompressed 16-bit PCM
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
 * @param {string} filePath
 * @returns {Promise<number>}
 */
export function getAudioDuration(filePath) {
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
 *
 * Uses the `anlmdn` (Non-Local Means Denoising) filter — one of ffmpeg's
 * highest-quality noise reduction algorithms.
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
export function applyNoiseReduction(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // anlmdn: Non-Local Means Denoising — preserves speech clarity
      // afftdn: Adaptive Frequency Filtering Denoise (secondary pass)
      .audioFilters([
        'anlmdn=s=7:p=0.002:r=0.002:m=15',
        'afftdn=nf=-25:nr=33:nt=w',
        'highpass=f=80',        // remove sub-80Hz rumble
        'lowpass=f=16000',      // remove ultrasonic hiss
        'dynaudnorm=f=250:g=15', // normalize dynamics
      ])
      .audioCodec('pcm_s16le')
      .audioFrequency(44100)
      .audioChannels(1)         // mono for speech clarity
      .format('wav')
      .on('end', resolve)
      .on('error', (err) => reject(new Error(`Noise reduction failed: ${err.message}`)))
      .save(outputPath);
  });
}
