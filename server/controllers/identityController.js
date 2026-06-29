import axios from 'axios';
import { supabase } from '../supabase/client.js';

export async function createIdentity(req, res) {
  try {
    const {
      selfie_url,
      voice_url,
      persona_description,
      profile_id,
      tenant_id,
      device_id,
      realm_id
    } = req.body;

    if (!selfie_url || !voice_url || !profile_id || !tenant_id) {
      return res.status(400).json({
        error: 'Missing required fields: selfie_url, voice_url, profile_id, tenant_id'
      });
    }

    // 1. Forward identity creation request to Architect OS v4.0
    const identityResponse = await axios.post(
      `${process.env.ARCHITECT_OS_URL}/identity/create`,
      {
        selfie_url,
        voice_url,
        persona_description,
        profile_id,
        tenant_id,
        device_id,
        realm_id
      }
    );

    const {
      visual_identity_model,
      voice_identity_model,
      persona_profile,
      identity_bind_payload
    } = identityResponse.data;

    // 2. Store identity in Supabase
    const { data, error } = await supabase
      .from('identities')
      .insert([
        {
          profile_id,
          tenant_id,
          realm_id,
          selfie_url,
          voice_url,
          visual_model: visual_identity_model,
          voice_model: voice_identity_model,
          persona_profile,
          bind_payload: identity_bind_payload
        }
      ]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }

    // 3. Return identity to frontend
    res.json({
      success: true,
      identity: data[0]
    });

  } catch (err) {
    console.error('Identity Engine Error:', err);
    res.status(500).json({
      error: err.message || 'Identity Engine failed'
    });
  }
}
