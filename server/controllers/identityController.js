import axios from 'axios';
import FormData from 'form-data';
import { supabase } from '../supabase/client.js';

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
