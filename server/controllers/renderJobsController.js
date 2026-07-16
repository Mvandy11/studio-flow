import { supabase } from "../supabase/client.js";
import { fireMakeWebhook } from "../videoRenderer.js";

// POST /api/render-jobs
// Triggered by the frontend when the user clicks "Generate My Video".
export async function startRenderJob(req, res) {
  const creator_id = req.user?.id;
  if (!creator_id) return res.status(401).json({ error: "Not authenticated" });

  const { identity_id, script, scenes } = req.body;
  if (!identity_id) return res.status(400).json({ error: "identity_id is required" });

  try {
    // ── 1. Look up the identity (try identity_records first, then identities) ──
    let image_url = null;
    let audio_url = null;
    let video_url_src = null;

    const { data: ir } = await supabase
      .from("identity_records")
      .select("image_url, audio_url, video_url")
      .eq("id", identity_id)
      .maybeSingle();

    if (ir) {
      image_url   = ir.image_url  || null;
      audio_url   = ir.audio_url  || null;
      video_url_src = ir.video_url || null;
    } else {
      const { data: leg } = await supabase
        .from("identities")
        .select("image_url, audio_url, source_video_url, selfie_url, voice_url")
        .eq("id", identity_id)
        .maybeSingle();

      if (!leg) return res.status(404).json({ error: "Identity not found" });

      image_url   = leg.image_url  || leg.selfie_url  || null;
      audio_url   = leg.audio_url  || leg.voice_url   || null;
      video_url_src = leg.source_video_url || null;
    }

    // ── 2. Insert render_job row ──────────────────────────────────────────────
    const { data: job, error: insertErr } = await supabase
      .from("render_jobs")
      .insert({
        creator_id,
        identity_id,
        script:     script  || null,
        scenes:     scenes  || null,
        status:     "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !job) {
      console.error("[render-jobs] insert error:", insertErr?.message);
      return res.status(500).json({ error: "Failed to start render" });
    }

    const render_job_id = job.id;

    // ── 3. Fire Make.com webhook ──────────────────────────────────────────────
    try {
      await fireMakeWebhook(
        render_job_id,
        identity_id,
        creator_id,
        video_url_src,   // video_url (null for component-based identities)
        image_url,        // image_url
        audio_url         // audio_url
      );
    } catch (webhookErr) {
      console.error("[render-jobs] webhook error:", webhookErr.message);
      await supabase
        .from("render_jobs")
        .update({ status: "error", error_message: `Webhook failed: ${webhookErr.message}` })
        .eq("id", render_job_id);
      return res.status(502).json({ error: "Failed to start render" });
    }

    // ── 4. Respond ────────────────────────────────────────────────────────────
    return res.status(200).json({ render_job_id, status: "accepted" });

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
    const { render_job_id } = req.body || {};

    if (render_job_id && render_job_id !== jobId) {
      return res.status(400).json({ error: "render_job_id in body does not match URL param" });
    }

    const { data: renderJob, error: fetchError } = await supabase
      .from("render_jobs")
      .select("id, status")
      .eq("id", jobId)
      .single();

    if (fetchError || !renderJob) {
      return res.status(404).json({ error: "Render job not found" });
    }

    // No-op acknowledgement — rendering is now handled by video-callback
    return res.status(200).json({ ok: true, note: "emotion-callback is deprecated; use video-callback" });
  } catch (err) {
    console.error(`[render_job ${jobId}] emotion-callback error:`, err.message);
    res.status(500).json({ error: err.message });
  }
}
