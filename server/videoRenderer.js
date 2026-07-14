import { supabase } from './supabase/client.js';
import axios from 'axios';

export async function fireMakeWebhook(renderJobId, identityId, creatorId, videoUrl, selfieUrl, voiceUrl) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('MAKE_WEBHOOK_URL is not configured.');

  const callbackUrl = `${process.env.APP_BASE_URL}/api/render-jobs/${renderJobId}/video-callback`;

  await axios.post(webhookUrl, {
    render_job_id: renderJobId,
    identity_id: identityId,
    creator_id: creatorId,
    video_url: videoUrl || null,
    selfie_url: selfieUrl || null,
    voice_url: voiceUrl || null,
    callback_url: callbackUrl
  }, { timeout: 15000 });
}
