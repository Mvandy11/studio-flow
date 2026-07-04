import { supabase } from "../supabase/client.js";
import { runRenderPipeline } from "./sessionsController.js";

const ALLOWED_EMOTIONS = ['excited', 'urgent', 'warm', 'calm', 'intense', 'confident'];
const DEFAULT_EMOTION = 'confident';

function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

// POST /api/render-jobs/:id/emotion-callback
// Called by the Make.com "AI Architect" scenario once GPT-4o has detected the
// emotion and rewritten the script. Not authenticated (per spec) — validated
// instead by matching :id to the body's render_job_id and checking job status.
export async function emotionCallback(req, res) {
  const jobId = req.params.id;
  try {
    const { render_job_id, emotion, rewritten_script } = req.body || {};

    if (render_job_id && render_job_id !== jobId) {
      console.error(`[render_job ${jobId}] emotion-callback: render_job_id mismatch (body=${render_job_id})`);
      return res.status(400).json({ error: "render_job_id in body does not match URL param" });
    }

    const { data: renderJob, error: fetchError } = await supabase
      .from("render_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !renderJob) {
      console.error(`[render_job ${jobId}] emotion-callback: job not found`, fetchError?.message);
      return res.status(404).json({ error: "Render job not found" });
    }

    if (renderJob.status !== "awaiting_emotion") {
      console.error(`[render_job ${jobId}] emotion-callback: unexpected status "${renderJob.status}" (duplicate or stale callback)`);
      return res.status(409).json({ error: `Render job is not awaiting emotion (current status: ${renderJob.status})` });
    }

    const resolvedEmotion = ALLOWED_EMOTIONS.includes(emotion) ? emotion : DEFAULT_EMOTION;
    const sanitizedRewrittenScript = stripHtml(rewritten_script || "").trim();
    const scriptForRender = sanitizedRewrittenScript || renderJob.script_text;

    await supabase.from("render_jobs").update({
      emotion: resolvedEmotion,
      rewritten_script: sanitizedRewrittenScript || null,
      status: "emotion_detected"
    }).eq("id", jobId);

    await supabase.from("render_jobs").update({ status: "rendering" }).eq("id", jobId);

    // Respond immediately — the render pipeline runs in the background.
    res.status(200).json({ ok: true, status: "rendering" });

    runRenderPipeline({ ...renderJob, emotion: resolvedEmotion }, scriptForRender).catch(err => {
      console.error(`[render_job ${jobId}] runRenderPipeline threw unexpectedly:`, err.message);
    });
  } catch (err) {
    console.error(`[render_job ${jobId}] emotion-callback error:`, err.message);
    res.status(500).json({ error: err.message });
  }
}
