import axios from 'axios';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { supabase } from './supabase/client.js';
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const SADTALKER_VERSION = 'cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3';

async function generateAudio(scriptText, voiceId) {
  if (!voiceId) throw new Error('No ElevenLabs voice ID found on this identity. Please recreate your identity to generate a voice clone.');
  const fallbackVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs default male voice
  const vid = voiceId || fallbackVoiceId;
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    { text: scriptText, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

async function uploadAudio(audioBuffer, jobId) {
  // Convert MP3 buffer to WAV using ffmpeg
  const tmpMp3 = path.join(tmpdir(), `audio-${Date.now()}.mp3`);
  const tmpWav = path.join(tmpdir(), `audio-${Date.now()}.wav`);
  writeFileSync(tmpMp3, audioBuffer);
  execSync(`ffmpeg -y -i ${tmpMp3} ${tmpWav}`);
  const wavBuffer = readFileSync(tmpWav);
  unlinkSync(tmpMp3);
  unlinkSync(tmpWav);

  const fileName = `audio/${jobId}-${Date.now()}.wav`;
  const { error } = await supabase.storage.from('videos').upload(fileName, wavBuffer, { contentType: 'audio/wav', upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function startRenderJob(identityUrl, scriptText, elevenLabsVoiceId, jobId) {
  if (!identityUrl) throw new Error('No selfie image found on this identity. Please recreate your identity with a selfie.');
  const audioBuffer = await generateAudio(scriptText, elevenLabsVoiceId);
  const audioUrl = await uploadAudio(audioBuffer, jobId);
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: SADTALKER_VERSION,
      input: {
        source_image: identityUrl,
        driven_audio: audioUrl,
        preprocess: 'crop',
        still_mode: false,
        use_enhancer: true
      }
    },
    { headers: { Authorization: `Token ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' } }
  );
  return response.data.id;
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
