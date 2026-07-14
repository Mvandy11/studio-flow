import { supabase } from "../supabase/client.js";

// POST /api/render-jobs/:id/emotion-callback
// Kept for backward compatibility with older Make.com scenarios.
// The current pipeline fires Make.com directly via fireMakeWebhook and
// receives results at /api/render-jobs/:id/video-callback instead.
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
