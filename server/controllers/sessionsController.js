import axios from "axios";
import { supabase } from "../supabase/client.js";
import { fireMakeWebhook } from "../videoRenderer.js";

export async function createSession(req, res) {
  try {
    const { member_id, identity_id, title, description, scenes, thumbnail_url } = req.body;

    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          member_id,
          identity_id,
          title,
          description,
          scenes,
          thumbnail_url,
          status: "draft"
        }
      ])
      .select()
      .single();

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
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startRender(req, res) {
  try {
    const {
      identity_url,
      identity_type,
      script_text,
      identity_id,
      scenes,
      member_id,
      session_id
    } = req.body;

    const isVideoIdentity = identity_type === 'video';

    let resolvedIdentityUrl = identity_url;
    let identity = null;

    if (isVideoIdentity) {
      // Video identity — sourced from identity_records, no selfie/voice requirements
      if (!resolvedIdentityUrl) {
        return res.status(400).json({ error: 'identity_url (video_url) is required for video identities' });
      }
    } else {
      // Legacy identity — fetch from identities table and require voice + selfie
      if (identity_id) {
        const { data: fetchedIdentity } = await supabase
          .from("identities")
          .select("selfie_url, elevenlabs_voice_id, source_video_url")
          .eq("id", identity_id)
          .single();
        identity = fetchedIdentity;
        if (!resolvedIdentityUrl) resolvedIdentityUrl = identity?.selfie_url;
        if (!identity?.elevenlabs_voice_id) {
          return res.status(400).json({ error: 'This identity has no voice clone. Please go to Create Identity and make a new one.' });
        }
        if (!identity?.selfie_url) {
          return res.status(400).json({ error: 'This identity has no selfie image. Please recreate your identity.' });
        }
      }
    }

    let resolvedScriptText = script_text;
    if (!resolvedScriptText && Array.isArray(scenes) && scenes.length > 0) {
      resolvedScriptText = scenes.map(s => s.prompt || s.text || '').filter(Boolean).join(' ');
    }

    if (!resolvedIdentityUrl) return res.status(400).json({ error: 'identity_url is required' });
    if (!resolvedScriptText) return res.status(400).json({ error: 'script_text or scenes with prompts are required' });

    let resolvedSessionId = session_id;
    if (!resolvedSessionId && member_id) {
      const { data: newSession } = await supabase
        .from("sessions")
        .insert([{ member_id, identity_id, scenes: scenes || [], status: "rendering" }])
        .select().single();
      resolvedSessionId = newSession?.id;
    } else if (resolvedSessionId) {
      await supabase.from("sessions").update({ status: "rendering" }).eq("id", resolvedSessionId);
    }

    const { data: renderJob, error: jobError } = await supabase
      .from("render_jobs")
      .insert([{
        session_id: resolvedSessionId || null,
        member_id: member_id || req.user?.id || null,
        status: "pending",
        script_text: resolvedScriptText,
        identity_url: resolvedIdentityUrl,
        identity_type: isVideoIdentity ? 'video' : 'legacy',
        voice_id: identity?.elevenlabs_voice_id || null,
        source_video_url: isVideoIdentity ? resolvedIdentityUrl : (identity?.source_video_url || null)
      }])
      .select().single();

    if (jobError) return res.status(400).json({ error: jobError });

    if (!process.env.MAKE_WEBHOOK_URL) {
      await supabase.from("render_jobs").update({ status: "error", error: "MAKE_WEBHOOK_URL is not configured" }).eq("id", renderJob.id);
      return res.status(500).json({ error: "Emotion pipeline is not configured (missing MAKE_WEBHOOK_URL)." });
    }
    if (!process.env.APP_BASE_URL) {
      await supabase.from("render_jobs").update({ status: "error", error: "APP_BASE_URL is not configured" }).eq("id", renderJob.id);
      return res.status(500).json({ error: "Emotion pipeline is not configured (missing APP_BASE_URL)." });
    }

    await supabase.from("render_jobs").update({ status: "awaiting_emotion" }).eq("id", renderJob.id);

    // Build the Make.com payload — shape depends on identity type
    const makePayload = {
      render_job_id: renderJob.id,
      script_text: resolvedScriptText,
      identity_type: isVideoIdentity ? 'video' : 'legacy',
      callback_url: `${process.env.APP_BASE_URL}/api/render-jobs/${renderJob.id}/emotion-callback`,
      ...(isVideoIdentity
        ? { video_url: resolvedIdentityUrl }
        : {
            selfie_url: resolvedIdentityUrl,
            elevenlabs_voice_id: identity?.elevenlabs_voice_id || null
          }
      )
    };

    try {
      await axios.post(process.env.MAKE_WEBHOOK_URL, makePayload, { timeout: 15000 });
    } catch (webhookErr) {
      console.error(`[render_job ${renderJob.id}] Make.com webhook POST failed:`, webhookErr.message);
      await supabase.from("render_jobs").update({ status: "error", error: `Failed to reach emotion pipeline: ${webhookErr.message}` }).eq("id", renderJob.id);
      return res.status(502).json({ error: "Failed to start the emotion detection pipeline. Please try again." });
    }

    return res.json({ render_job_id: renderJob.id, status: "awaiting_emotion" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Runs the existing render pipeline (audio generation -> upload -> Replicate render)
// using whatever script text is passed in (the emotion-rewritten script when available,
// falling back to the original). Called by the emotion-callback handler once Make.com
// has returned the detected emotion + rewritten script. Does not throw — persists any
// failure onto the render_jobs row instead.
export async function runRenderPipeline(renderJob, scriptTextForRender) {
  try {
    await fireMakeWebhook(
      renderJob.id,
      renderJob.identity_id ?? null,
      renderJob.member_id ?? null,
      renderJob.identity_url
    );
    // Make.com will handle the actual render and call back via /api/render-jobs/:id/video-callback
    // Status stays "rendering" until that callback updates it to "completed"
  } catch (bgErr) {
    console.error(`[render_job ${renderJob.id}] Background render failed:`, bgErr.message);
    await supabase.from("render_jobs").update({ status: "error", error: bgErr.message }).eq("id", renderJob.id);
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
      video_url: renderJob.video_url,
      emotion: renderJob.emotion || null,
      rewritten_script: renderJob.rewritten_script || null
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
