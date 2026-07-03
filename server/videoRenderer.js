import axios from 'axios';
import Replicate from 'replicate';
import { supabase } from './supabase/client.js';
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

const replicate = new Replicate({ auth: REPLICATE_TOKEN });

export async function generateAudio(scriptText, voiceId) {
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

export async function uploadAudio(audioBuffer, jobId) {
  const fileName = `audio/${jobId}-${Date.now()}.mp3`;
  const { error } = await supabase.storage.from('videos').upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function startRenderJob(imageUrl, audioUrl, jobId) {
  const output = await replicate.run("prunaai/p-video-avatar", {
    input: {
      image: imageUrl,
      audio: audioUrl,
      resolution: "720p",
      video_prompt: "The person is talking naturally, making eye contact, with subtle head movement.",
      negative_prompt: "subtitles, text, blurry, low quality, watermark, scene change"
    }
  });
  return output;
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
