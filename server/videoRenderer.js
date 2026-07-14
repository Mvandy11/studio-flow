import { supabase } from './supabase/client.js';
import axios from 'axios';

export async function fireMakeWebhook(renderJobId, identityId, creatorId, videoUrl, imageUrl, audioUrl) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('MAKE_WEBHOOK_URL is not configured.');

  const callbackUrl = `${process.env.APP_BASE_URL}/api/render-jobs/${renderJobId}/video-callback`;

  await axios.post(webhookUrl, {
    identity_id: identityId,
    creator_id: creatorId,
    render_job_id: renderJobId,
    callback_url: callbackUrl,
    video_url: videoUrl || null,
    image_url: imageUrl || null,
    audio_url: audioUrl || null
  }, { timeout: 15000 });
}
