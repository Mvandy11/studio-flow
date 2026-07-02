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

    res.json({ success: true, identity: data });
  } catch (err) {
    console.error('Identity Error:', err);
    res.status(500).json({ error: err.message || 'Identity creation failed' });
  }
}
