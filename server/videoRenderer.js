import axios from 'axios';

const DID_API_KEY = process.env.DID_API_KEY;
const DID_BASE = 'https://api.d-id.com';

export async function startRenderJob(identityUrl, scriptText) {
  const response = await axios.post(`${DID_BASE}/talks`, {
    source_url: identityUrl,
    script: {
      type: 'text',
      input: scriptText,
      provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' }
    },
    config: { fluent: true, pad_audio: 0.0 }
  }, {
    headers: {
      Authorization: `Basic ${DID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.id;
}

export async function getRenderStatusJob(didTalkId) {
  const response = await axios.get(`${DID_BASE}/talks/${didTalkId}`, {
    headers: { Authorization: `Basic ${DID_API_KEY}` }
  });
  const { status, result_url } = response.data;
  return {
    status: status === 'done' ? 'completed' : status === 'error' ? 'error' : 'processing',
    videoUrl: result_url || null
  };
}
