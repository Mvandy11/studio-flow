import axios from 'axios';
import { supabase } from './supabase/client.js';
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const SADTALKER_VERSION = 'cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8';

async function generateAudio(scriptText, voiceId) {
  const fallbackVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs default male voice
  const vid = voiceId || fallbackVoiceId;
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    { text: scriptText, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

async function uploadAudio(audioBuffer, jobId) {
  const fileName = `audio/${jobId}-${Date.now()}.mp3`;
  const { error } = await supabase.storage.from('videos').upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function startRenderJob(identityUrl, scriptText, elevenLabsVoiceId, jobId) {
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
