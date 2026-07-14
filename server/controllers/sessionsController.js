import axios from "axios";
import { supabase } from "../supabase/client.js";
import { fireMakeWebhook } from "../videoRenderer.js";

export async function createSession(req, res) {
  try {
    const { member_id, identity_id, title, description, scenes, thumbnail_url } = req.body;
    const { data, error } = await supabase
      .from("sessions")
      .insert([{ member_id, identity_id, title, description, scenes, thumbnail_url, status: "draft" }])
      .select().single();
    if (error) return res.status(400).json({ error });
    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateSession(req, res) {
  try {
    const { session_id, updates } = req.body;
    const { data, error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", session_id)
      .select().single();
    if (error) return res.status(400).json({ error });
    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startRender(req, res) {
  try {
    const { identity_id, member_id, session_id } = req.body;

    if (!identity_id) return res.status(400).json({ error: 'identity_id is required.' });

    const { data: identity, error: identityError } = await supabase
      .from("identities")
      .select("source_video_url, selfie_url")
      .eq("id", identity_id)
      .single();

    if (identityError || !identity) return res.status(404).json({ error: 'Identity not found.' });

    const videoUrl = identity.source_video_url;
    if (!videoUrl) return res.status(400).json({ error: 'This identity has no source video. Please upload a video when creating your identity.' });

    const { data: renderJob, error: jobError } = await supabase
      .from("render_jobs")
      .insert([{
        session_id: session_id || null,
        member_id: member_id || req.user?.id || null,
        identity_url: identity.selfie_url || null,
        source_video_url: videoUrl,
        status: "pending"
      }])
      .select().single();

    if (jobError) return res.status(400).json({ error: jobError.message });

    if (!process.env.MAKE_WEBHOOK_URL) {
      await supabase.from("render_jobs").update({ status: "error", error: "MAKE_WEBHOOK_URL is not configured." }).eq("id", renderJob.id);
      return res.status(500).json({ error: "Video pipeline is not configured (missing MAKE_WEBHOOK_URL)." });
    }
    if (!process.env.APP_BASE_URL) {
      await supabase.from("render_jobs").update({ status: "error", error: "APP_BASE_URL is not configured." }).eq("id", renderJob.id);
      return res.status(500).json({ error: "Video pipeline is not configured (missing APP_BASE_URL)." });
    }

    await supabase.from("render_jobs").update({ status: "processing" }).eq("id", renderJob.id);

    try {
      await fireMakeWebhook(renderJob.id, identity_id, member_id, videoUrl);
    } catch (webhookErr) {
      await supabase.from("render_jobs").update({ status: "error", error: `Make webhook failed: ${webhookErr.message}` }).eq("id", renderJob.id);
      return res.status(502).json({ error: "Failed to reach the video pipeline. Please try again." });
    }

    return res.json({ render_job_id: renderJob.id, status: "processing" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function videoCallback(req, res) {
  try {
    const render_job_id = req.params.id;
    const { video_url, identity_id, creator_id } = req.body;

    if (!video_url) return res.status(400).json({ error: 'video_url is required in callback body.' });

    const { data: renderJob } = await supabase
      .from("render_jobs")
      .select("session_id")
      .eq("id", render_job_id)
      .single();

    await supabase.from("render_jobs").update({
      status: "completed",
      video_url,
      completed_at: new Date().toISOString()
    }).eq("id", render_job_id);

    if (renderJob?.session_id) {
      await supabase.from("sessions").update({ status: "completed", video_url }).eq("id", renderJob.session_id);
    }

    console.log(`[render_job ${render_job_id}] Completed. Video: ${video_url}`);
    return res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRenderStatus(req, res) {
  try {
    const render_job_id = req.params.id;
    const { data: renderJob, error } = await supabase
      .from("render_jobs")
      .select("*")
      .eq("id", render_job_id)
      .single();
    if (error || !renderJob) return res.status(404).json({ error: "Render job not found" });
    res.json({
      status: renderJob.status,
      video_url: renderJob.video_url || null,
      error: renderJob.error || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listSessions(req, res) {
  try {
    const member_id = req.params.member_id;
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("member_id", member_id)
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error });
    res.json({ sessions: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
