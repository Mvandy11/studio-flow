import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import { supabase } from '../supabase/client.js';
import { extractFrame, extractAudio, getVideoDuration, cleanupTempFiles } from '../utils/extractFromVideo.js';

// ── Lazy OpenAI client (uses Replit AI Integration keys) ─────
// This project routes OpenAI calls through the Replit AI Integration proxy,
// which provides AI_INTEGRATIONS_OPENAI_API_KEY + AI_INTEGRATIONS_OPENAI_BASE_URL.
// Falls back to OPENAI_API_KEY for local / non-Replit environments.
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    const apiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey) {
      throw new Error(
        'OpenAI API key is not configured. ' +
        'Enable the OpenAI integration in Replit, or set OPENAI_API_KEY.'
      );
    }
    _openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }
  return _openai;
}

export async function createIdentity(req, res) {
  try {
    const {
      selfie_url,
      voice_url,
      persona_description,
      profile_id,
      tenant_id
    } = req.body;

    if (!selfie_url || !voice_url || !profile_id) {
      return res.status(400).json({
        error: 'Missing required fields: selfie_url, voice_url, profile_id'
      });
    }

    // Save identity to Supabase — D-ID processing will be wired in next sprint
    const { data, error } = await supabase
      .from('identities')
      .insert([{
        profile_id,
        tenant_id: tenant_id || 'studioflow',
        selfie_url,
        voice_url,
        persona_description: persona_description || '',
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Clone voice with ElevenLabs and store voice ID
    if (process.env.ELEVENLABS_API_KEY && voice_url) {
      try {
        const audioRes = await axios.get(voice_url, { responseType: 'arraybuffer' });
        const form = new FormData();
        form.append('name', `identity-${data.id}`);
        form.append('files', Buffer.from(audioRes.data), {
          filename: 'voice.mp3',
          contentType: 'audio/mpeg'
        });
        const voiceRes = await axios.post(
          'https://api.elevenlabs.io/v1/voices/add',
          form,
          { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, ...form.getHeaders() } }
        );
        const elVoiceId = voiceRes.data?.voice_id;
        if (elVoiceId) {
          await supabase.from('identities').update({ elevenlabs_voice_id: elVoiceId }).eq('id', data.id);
          data.elevenlabs_voice_id = elVoiceId;
        }
      } catch (elErr) {
        console.warn('ElevenLabs voice clone failed (non-fatal):', elErr.message);
      }
    }

    res.json({ success: true, identity: data });
  } catch (err) {
    console.error('Identity Error:', err);
    res.status(500).json({ error: err.message || 'Identity creation failed' });
  }
}

// POST /api/identity/create-from-video
// Accepts multipart/form-data: video (file), name (string), profile_id (string).
// Extracts a selfie frame + voice sample from the recorded video, uploads all
// three assets (selfie/voice/source video) to the "identities" Supabase Storage
// bucket, clones the voice via ElevenLabs, and persists the identity row.
export async function createIdentityFromVideo(req, res) {
  let tempVideoPath = null;
  let framePath = null;
  let audioPath = null;

  try {
    const { name, profile_id } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: 'Missing required file field: video' });
    }
    if (!name || !profile_id) {
      return res.status(400).json({ error: 'Missing required fields: name, profile_id' });
    }

    const videoExt = videoFile.mimetype?.includes('webm') ? '.webm' : '.mp4';
    tempVideoPath = path.join(os.tmpdir(), `source-${crypto.randomUUID()}${videoExt}`);
    fs.writeFileSync(tempVideoPath, videoFile.buffer);

    const duration = await getVideoDuration(tempVideoPath);
    if (duration < 10 || duration > 120) {
      return res.status(400).json({ error: `Video duration must be between 10 and 120 seconds (got ${duration.toFixed(1)}s).` });
    }

    const timestamp = Date.now();

    framePath = await extractFrame(tempVideoPath);
    const frameBuffer = fs.readFileSync(framePath);
    const selfiePath = `${profile_id}/${timestamp}_selfie.png`;
    const { error: selfieUploadError } = await supabase.storage
      .from('identities')
      .upload(selfiePath, frameBuffer, { contentType: 'image/png', upsert: true });
    if (selfieUploadError) throw new Error(`Selfie upload failed: ${selfieUploadError.message}`);
    const { data: { publicUrl: selfieUrl } } = supabase.storage.from('identities').getPublicUrl(selfiePath);

    audioPath = await extractAudio(tempVideoPath);
    const audioBuffer = fs.readFileSync(audioPath);
    const audioStoragePath = `${profile_id}/${timestamp}_voice.wav`;
    const { error: audioUploadError } = await supabase.storage
      .from('identities')
      .upload(audioStoragePath, audioBuffer, { contentType: 'audio/wav', upsert: true });
    if (audioUploadError) throw new Error(`Audio upload failed: ${audioUploadError.message}`);
    const { data: { publicUrl: audioUrl } } = supabase.storage.from('identities').getPublicUrl(audioStoragePath);

    let elevenlabsVoiceId = null;
    if (process.env.ELEVENLABS_API_KEY) {
      const form = new FormData();
      form.append('name', `${name}-${timestamp}`);
      form.append('description', `Voice clone for identity created by profile ${profile_id}`);
      form.append('files', audioBuffer, { filename: 'voice.wav', contentType: 'audio/wav' });
      const voiceRes = await axios.post(
        'https://api.elevenlabs.io/v1/voices/add',
        form,
        { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, ...form.getHeaders() } }
      );
      elevenlabsVoiceId = voiceRes.data?.voice_id || null;
    } else {
      console.warn('createIdentityFromVideo: ELEVENLABS_API_KEY not set — skipping voice clone');
    }

    const sourceVideoPath = `${profile_id}/${timestamp}_source.webm`;
    const { error: videoUploadError } = await supabase.storage
      .from('identities')
      .upload(sourceVideoPath, videoFile.buffer, { contentType: videoFile.mimetype || 'video/webm', upsert: true });
    if (videoUploadError) throw new Error(`Source video upload failed: ${videoUploadError.message}`);
    const { data: { publicUrl: sourceVideoUrl } } = supabase.storage.from('identities').getPublicUrl(sourceVideoPath);

    const { data: identity, error: insertError } = await supabase
      .from('identities')
      .insert([{
        profile_id,
        name,
        selfie_url: selfieUrl,
        audio_url: audioUrl,
        source_video_url: sourceVideoUrl,
        elevenlabs_voice_id: elevenlabsVoiceId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) throw new Error(`Identity insert failed: ${insertError.message}`);

    res.json(identity);
  } catch (err) {
    console.error('createIdentityFromVideo Error:', err);
    res.status(500).json({ error: err.message || 'Identity creation from video failed' });
  } finally {
    cleanupTempFiles(tempVideoPath, framePath, audioPath);
  }
}

// POST /api/identity/create-from-prompt
// Accepts JSON: { character_prompt: string }. Requires authentication.
// Generates a synthetic face via OpenAI gpt-image-1 and a synthetic voice via
// ElevenLabs Voice Design, uploads the face to the "identities" Supabase
// Storage bucket, and persists an identity row (no source video).
export async function createIdentityFromPrompt(req, res) {
  try {
    const { character_prompt } = req.body;
    const profileId = req.user?.id;

    if (!profileId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!character_prompt || !character_prompt.trim()) {
      return res.status(400).json({ error: 'character_prompt is required' });
    }

    const prompt = character_prompt.trim();
    const timestamp = Date.now();

    // 1. Generate a face image from the text prompt.
    const imageResponse = await getOpenAI().images.generate({
      model: 'gpt-image-1',
      prompt: `Photorealistic portrait headshot of a person: ${prompt}. ` +
        'Studio lighting, neutral background, facing camera, single subject, high detail.',
      size: '1024x1024',
      quality: 'high'
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned from AI.');
    const imageBuffer = Buffer.from(b64, 'base64');

    const selfiePath = `${profileId}/${timestamp}_ai_selfie.png`;
    const { error: selfieUploadError } = await supabase.storage
      .from('identities')
      .upload(selfiePath, imageBuffer, { contentType: 'image/png', upsert: true });
    if (selfieUploadError) throw new Error(`Selfie upload failed: ${selfieUploadError.message}`);
    const { data: { publicUrl: selfieUrl } } = supabase.storage.from('identities').getPublicUrl(selfiePath);

    // 2. Generate a synthetic voice from the same prompt via ElevenLabs Voice Design.
    let elevenlabsVoiceId = null;
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const voiceDescription = prompt.length >= 20
          ? prompt.slice(0, 1000)
          : `${prompt}. A natural, clear speaking voice.`;

        const designRes = await axios.post(
          'https://api.elevenlabs.io/v1/text-to-voice/design',
          {
            voice_description: voiceDescription,
            text: 'Hello, thank you for bringing me to life. I am excited to share my story with you today, and I hope you enjoy hearing what I have to say.'
          },
          { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
        );

        const generatedVoiceId = designRes.data?.previews?.[0]?.generated_voice_id;
        if (generatedVoiceId) {
          // Note: the ElevenLabs endpoint to persist a designed voice is
          // POST /v1/text-to-voice (NOT /v1/text-to-voice/create — that path 404s).
          const createRes = await axios.post(
            'https://api.elevenlabs.io/v1/text-to-voice',
            {
              voice_name: `ai-identity-${timestamp}`,
              voice_description: voiceDescription,
              generated_voice_id: generatedVoiceId
            },
            { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
          );
          elevenlabsVoiceId = createRes.data?.voice_id || null;
        }
      } catch (voiceErr) {
        console.warn(
          'createIdentityFromPrompt: ElevenLabs voice design failed (non-fatal):',
          voiceErr.response?.data || voiceErr.message
        );
      }
    } else {
      console.warn('createIdentityFromPrompt: ELEVENLABS_API_KEY not set — skipping voice design');
    }

    // 3. Persist the identity.
    const { data: identity, error: insertError } = await supabase
      .from('identities')
      .insert([{
        profile_id: profileId,
        tenant_id: 'studioflow',
        persona_description: prompt,
        selfie_url: selfieUrl,
        elevenlabs_voice_id: elevenlabsVoiceId,
        visual_model: 'gpt-image-1',
        voice_model: elevenlabsVoiceId ? 'elevenlabs-voice-design' : null,
        status: 'ready',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) throw new Error(`Identity insert failed: ${insertError.message}`);

    res.json({ status: 'created', identity });
  } catch (err) {
    console.error('createIdentityFromPrompt Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message || 'AI identity creation failed' });
  }
}
