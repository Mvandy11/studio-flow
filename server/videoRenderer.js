import axios from 'axios';

const HARDCODED_CALLBACK_BASE = 'https://studio-flow-backend.onrender.com';

export async function fireMakeWebhook(
  renderJobId,
  identityId,
  creatorId,
  videoUrl,
  imageUrl,
  audioUrl,
  script          = '',
  sceneDescription = '',
  emotionalPhysics = null,
  logicProfile     = null,
  agentRules       = null
) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('MAKE_WEBHOOK_URL is not configured.');

  const baseUrl    = process.env.APP_BASE_URL || HARDCODED_CALLBACK_BASE;
  const callbackUrl = `${baseUrl}/api/render-jobs/${renderJobId}/video-callback`;

  await axios.post(
    webhookUrl,
    {
      creator_id:        creatorId,
      identity_id:       identityId,
      render_job_id:     renderJobId,
      image_url:         imageUrl      || null,
      audio_url:         audioUrl      || null,
      video_url:         videoUrl      || '',
      callback_url:      callbackUrl,
      script:            script        || '',
      scene_description: sceneDescription || '',
      emotional_physics: emotionalPhysics || null,
      logic_profile:     logicProfile     || null,
      agent_rules:       agentRules       || null,
    },
    { timeout: 15000 }
  );
}
