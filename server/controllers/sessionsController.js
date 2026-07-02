import { supabase } from "../supabase/client.js";
import { startRenderJob, getRenderStatusJob } from "../videoRenderer.js";

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
    const { identity_url, script_text, identity_id, scenes, member_id, session_id } = req.body;

    const sceneDescriptions = scenes.map(s => s.description).filter(Boolean);
    console.log('Scene visual descriptions:', sceneDescriptions);

    // Resolve identity_url: use provided or look up from identity_id
    let resolvedIdentityUrl = identity_url;
    let identity = null;
    if (identity_id) {
      const { data: fetchedIdentity } = await supabase
        .from("identities")
        .select("selfie_url, elevenlabs_voice_id")
        .eq("id", identity_id)
        .single();
      identity = fetchedIdentity;
      if (!resolvedIdentityUrl) resolvedIdentityUrl = identity?.selfie_url;
    }

    // Resolve script_text: use provided or build from scenes array
    let resolvedScriptText = script_text;
    if (!resolvedScriptText && Array.isArray(scenes) && scenes.length > 0) {
      resolvedScriptText = scenes.map(s => s.prompt || s.text || '').filter(Boolean).join(' ');
    }

    if (!resolvedIdentityUrl) {
      return res.status(400).json({ error: 'identity_url or identity_id with selfie is required' });
    }
    if (!resolvedScriptText) {
      return res.status(400).json({ error: 'script_text or scenes with prompts are required' });
    }

    // Start D-ID render job
    const didTalkId = await startRenderJob(resolvedIdentityUrl, resolvedScriptText, identity?.elevenlabs_voice_id);

    // Resolve or create session_id
    let resolvedSessionId = session_id;
    if (!resolvedSessionId && member_id) {
      const { data: newSession } = await supabase
        .from("sessions")
        .insert([{ member_id, identity_id, scenes: scenes || [], status: "rendering" }])
        .select()
        .single();
      resolvedSessionId = newSession?.id;
    } else if (resolvedSessionId) {
      await supabase
        .from("sessions")
        .update({ status: "rendering" })
        .eq("id", resolvedSessionId);
    }

    // Insert render_jobs row
    const { data: renderJob, error: jobError } = await supabase
      .from("render_jobs")
      .insert([{
        session_id: resolvedSessionId || null,
        member_id: member_id || req.user?.id || null,
        did_talk_id: didTalkId,
        status: "pending"
      }])
      .select()
      .single();

    if (jobError) return res.status(400).json({ error: jobError });

    res.json({ render_job_id: renderJob.id, did_talk_id: didTalkId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRenderStatus(req, res) {
  try {
    const render_job_id = req.params.id;

    // Fetch the render_jobs row to get did_talk_id
    const { data: renderJob, error: jobFetchError } = await supabase
      .from("render_jobs")
      .select("*")
      .eq("id", render_job_id)
      .single();

    if (jobFetchError || !renderJob) {
      return res.status(404).json({ error: "Render job not found" });
    }

    // Poll D-ID for status
    const { status, videoUrl } = await getRenderStatusJob(renderJob.did_talk_id);

    if (status === "completed" && videoUrl) {
      // Update render_jobs
      await supabase
        .from("render_jobs")
        .update({ status: "completed", video_url: videoUrl, completed_at: new Date().toISOString() })
        .eq("id", render_job_id);

      // Update parent session
      if (renderJob.session_id) {
        await supabase
          .from("sessions")
          .update({ status: "completed", video_url: videoUrl })
          .eq("id", renderJob.session_id);
      }
    } else if (status === "error") {
      await supabase
        .from("render_jobs")
        .update({ status: "error" })
        .eq("id", render_job_id);
    }

    res.json({ status, video_url: videoUrl });
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
