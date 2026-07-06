import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstallerPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

ffmpeg.setFfmpegPath(ffmpegInstallerPath.path);

export function extractFrame(videoPath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(os.tmpdir(), `frame-${crypto.randomUUID()}.png`);
    ffmpeg(videoPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`extractFrame failed: ${err.message}`)))
      .screenshots({
        timestamps: [2],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '512x512'
      });
  });
}

export function extractAudio(videoPath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(os.tmpdir(), `audio-${crypto.randomUUID()}.wav`);
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(44100)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`extractAudio failed: ${err.message}`)))
      .save(outputPath);
  });
}

export function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(new Error(`getVideoDuration failed: ${err.message}`));
      const duration = metadata?.format?.duration;
      if (typeof duration !== 'number') {
        return reject(new Error('getVideoDuration failed: duration not found in metadata'));
      }
      resolve(duration);
    });
  });
}

export function cleanupTempFiles(...filePaths) {
  for (const filePath of filePaths) {
    if (!filePath) continue;
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`cleanupTempFiles: failed to delete ${filePath}:`, err.message);
    }
  }
}
