import { supabase } from "../supabase/client.js";
import { fireMakeWebhook } from "../videoRenderer.js";

// POST /api/render-jobs
// Triggered by the frontend when the user clicks "Generate My Avatar Video".
export async function startRenderJob(req, res) {
  const creator_id = req.user?.id;
  if (!creator_id) return res.status(401).json({ error: "Not authenticated" });

  const {
    identity_id,
    script,
    script_text,
    scenes,
    scene_description,
    image_url: bodyImageUrl,
    audio_url: bodyAudioUrl,
    emotional_physics,
    logic_profile,
    agent_rules,
  } = req.body;

  if (!identity_id) return res.status(400).json({ error: "identity_id is required" });

  try {
    // ── 1. Resolve image_url / audio_url ─────────────────────────────────────
    // Frontend sends them directly; fall back to DB lookup if omitted.
    let image_url     = bodyImageUrl  || null;
    let audio_url     = bodyAudioUrl  || null;
    let video_url_src = null;

    if (!image_url || !audio_url) {
      const { data: leg } = await supabase
        .from("identities")
        .select("image_url, audio_url, selfie_url, voice_url, source_video_url")
        .eq("id", identity_id)
        .maybeSingle();

      if (leg) {
        image_url     = image_url  || leg.image_url  || leg.selfie_url  || null;
        audio_url     = audio_url  || leg.audio_url  || leg.voice_url   || null;
        video_url_src = leg.source_video_url || null;
      }
    }

    // ── 2. Insert render_job row ──────────────────────────────────────────────
    const { data: job, error: insertErr } = await supabase
      .from("render_jobs")
      .insert({
        creator_id,
        identity_id,
        script:            script       || script_text || null,
        script_text:       script_text  || script      || null,
        scenes:            scenes       || null,
        scene_description: scene_description || null,
        status:            "pending",
        created_at:        new Date().toISOString(),
        emotional_physics: emotional_physics || null,
        logic_profile:     logic_profile    || null,
        agent_rules:       agent_rules      || null,
      })
      .select("id")
      .single();

    if (insertErr || !job) {
      console.error("[render-jobs] insert error:", insertErr?.message);
      return res.status(500).json({ error: "Failed to create render job" });
    }

    const render_job_id = job.id;

    // ── 3. Fire Make.com webhook ──────────────────────────────────────────────
    try {
      await fireMakeWebhook(
        render_job_id,
        identity_id,
        creator_id,
        video_url_src,
        image_url,
        audio_url,
        script || script_text || '',
        scene_description || '',
        emotional_physics  || null,
        logic_profile      || null,
        agent_rules        || null
      );
    } catch (webhookErr) {
      console.error("[render-jobs] webhook error:", webhookErr.message);
      await supabase
        .from("render_jobs")
        .update({ status: "failed", error_message: `Webhook failed: ${webhookErr.message}` })
        .eq("id", render_job_id);
      return res.status(502).json({ error: "Failed to reach the video pipeline. Please try again." });
    }

    // ── 4. Respond ────────────────────────────────────────────────────────────
    return res.status(200).json({ render_job_id, id: render_job_id, status: "accepted" });

  } catch (err) {
    console.error("[render-jobs] unexpected error:", err.message);
    return res.status(500).json({ error: "Failed to start render" });
  }
}

// POST /api/render-jobs/:id/emotion-callback
// Kept for backward compatibility with older Make.com scenarios.
export async function emotionCallback(req, res) {
  const jobId = req.params.id;
  try {
    return res.status(200).json({ ok: true, note: "emotion-callback is deprecated; use video-callback" });
  } catch (err) {
    console.error(`[render_job ${jobId}] emotion-callback error:`, err.message);
    res.status(500).json({ error: err.message });
  }
}
