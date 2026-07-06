import axios from 'axios';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { supabase } from './supabase/client.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

const replicate = new Replicate({ auth: REPLICATE_TOKEN });

export async function generateAudio(scriptText, voiceId) {
  if (!voiceId) throw new Error('No ElevenLabs voice ID found on this identity. Please recreate your identity to generate a voice clone.');
  const fallbackVoiceId = 'EXAVITQu4vr4xnSDxMaL';
  const vid = voiceId || fallbackVoiceId;
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    { text: scriptText, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

export async function uploadAudio(audioBuffer, jobId) {
  const fileName = `audio/${jobId}-${Date.now()}.mp3`;
  const { error } = await supabase.storage.from('videos').upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
  return data.publicUrl;
}

function extractUrlFromReplicateOutput(output) {
  let videoUrl;
  if (!output) throw new Error('Replicate returned no output');
  if (typeof output === 'string') {
    videoUrl = output;
  } else if (Array.isArray(output)) {
    const first = output[0];
    videoUrl = typeof first === 'string' ? first : String(first);
  } else if (typeof output?.url === 'function') {
    videoUrl = output.url();
  } else {
    videoUrl = String(output);
  }

  if (!videoUrl || videoUrl === '[object Object]') {
    console.error('Raw Replicate output:', JSON.stringify(output));
    throw new Error('Could not extract video URL from Replicate output');
  }
  return videoUrl;
}

export async function runLivePortrait(imageUrl, drivingVideoUrl, renderId) {
  const output = await replicate.run("fofr/live-portrait", {
    input: {
      image: imageUrl,
      video: drivingVideoUrl,
      output_format: "mp4",
      flag_relative_motion: true,
      flag_do_crop: true,
      driving_smooth_observation_variance: 0.0
    }
  });

  const videoUrl = extractUrlFromReplicateOutput(output);
  console.log(`[render ${renderId}] LivePortrait video URL extracted:`, videoUrl);
  return videoUrl;
}

export async function downloadVideo(url, renderId) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const filePath = path.join(os.tmpdir(), `liveportrait-${renderId}-${Date.now()}.mp4`);
  fs.writeFileSync(filePath, Buffer.from(res.data));
  return filePath;
}

export async function mergeAudioIntoVideo(silentVideoPath, audioBuffer, renderId) {
  const audioPath = path.join(os.tmpdir(), `merge-audio-${renderId}-${Date.now()}.mp3`);
  const outputPath = path.join(os.tmpdir(), `merged-${renderId}-${Date.now()}.mp4`);
  fs.writeFileSync(audioPath, audioBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(silentVideoPath)
        .input(audioPath)
        .outputOptions(['-c:v copy', '-c:a aac', '-b:a 192k', '-shortest', '-movflags +faststart'])
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    return fs.readFileSync(outputPath);
  } finally {
    for (const filePath of [silentVideoPath, audioPath, outputPath]) {
      try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn(`Failed to clean up temp file ${filePath}:`, cleanupErr.message);
      }
    }
  }
}

export async function uploadFinalVideo(videoBuffer, renderId) {
  const fileName = `videos/${renderId}.mp4`;
  const { error } = await supabase.storage.from('videos').upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`Final video upload failed: ${error.message}`);
  const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function startRenderJob(identityUrl, audioUrl, renderId, sourceVideoUrl = null) {
  if (sourceVideoUrl) {
    const liveVideoUrl = await runLivePortrait(identityUrl, sourceVideoUrl, renderId);
    const silentVideoPath = await downloadVideo(liveVideoUrl, renderId);
    const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(audioRes.data);
    const mergedVideoBuffer = await mergeAudioIntoVideo(silentVideoPath, audioBuffer, renderId);
    return uploadFinalVideo(mergedVideoBuffer, renderId);
  }

  // Legacy fallback: static-image driven render via Replicate (SadTalker).
  const portraitModel = process.env.REPLICATE_PORTRAIT_MODEL;
  if (!portraitModel) {
    throw new Error('REPLICATE_PORTRAIT_MODEL is not configured. Add it to Replit Secrets.');
  }

  const output = await replicate.run(portraitModel, {
    input: {
      image: identityUrl,
      audio: audioUrl,
      resolution: "720p",
      video_prompt: "The person is talking naturally, making eye contact, with subtle head movement.",
      negative_prompt: "subtitles, text, blurry, low quality, watermark, scene change"
    }
  });

  const videoUrl = extractUrlFromReplicateOutput(output);
  console.log(`[render ${renderId}] Legacy portrait video URL extracted:`, videoUrl);
  return videoUrl;
}

export async function getRenderStatusJob(predictionId) {
  const res = await axios.get(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    { headers: { Authorization: `Token ${REPLICATE_TOKEN}` } }
  );
  const { status, output, error } = res.data;
  if (status === 'succeeded') return { status: 'completed', videoUrl: Array.isArray(output) ? output[0] : output };
  if (status === 'failed') return { status: 'error', error };
  return { status: 'processing' };
}

