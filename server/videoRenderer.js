import axios from 'axios';

const DID_API_KEY = process.env.DID_API_KEY;
const DID_BASE = 'https://api.d-id.com';

export async function startRenderJob(identityUrl, scriptText, elevenLabsVoiceId = null) {
  try {
    const scriptProvider = elevenLabsVoiceId
      ? { type: 'elevenlabs', voice_id: elevenLabsVoiceId }
      : { type: 'microsoft', voice_id: 'en-US-GuyNeural' };

    const response = await axios.post(`${DID_BASE}/talks`, {
      source_url: identityUrl,
      script: {
        type: 'text',
        input: scriptText,
        provider: scriptProvider
      },
      config: { fluent: true, pad_audio: 0.0 }
    }, {
      headers: {
        Authorization: `Basic ${Buffer.from(DID_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.id;
  } catch (err) {
    const detail = err.response?.data || err.message;
    throw new Error(`D-ID error: ${JSON.stringify(detail)}`);
  }
}

export async function getRenderStatusJob(didTalkId) {
  const response = await axios.get(`${DID_BASE}/talks/${didTalkId}`, {
    headers: { Authorization: `Basic ${Buffer.from(DID_API_KEY + ':').toString('base64')}` }
  });
  const { status, result_url } = response.data;
  return {
    status: status === 'done' ? 'completed' : status === 'error' ? 'error' : 'processing',
    videoUrl: result_url || null
  };
}
