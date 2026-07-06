import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '../supabase/client.js';
import { extractFrame, extractAudio, getVideoDuration, cleanupTempFiles } from '../utils/extractFromVideo.js';

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
