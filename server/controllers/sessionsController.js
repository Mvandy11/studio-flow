import { supabase } from "../supabase/client.js";
import { startRenderJob, generateAudio, uploadAudio } from "../videoRenderer.js";

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
      if (!identity?.elevenlabs_voice_id) {
        return res.status(400).json({ error: 'This identity has no voice clone. Please go to Create Identity and make a new one.' });
      }
      if (!identity?.selfie_url) {
        return res.status(400).json({ error: 'This identity has no selfie image. Please recreate your identity.' });
      }
    }

    let resolvedScriptText = script_text;
    if (!resolvedScriptText && Array.isArray(scenes) && scenes.length > 0) {
      resolvedScriptText = scenes.map(s => s.prompt || s.text || '').filter(Boolean).join(' ');
    }

    if (!resolvedIdentityUrl) return res.status(400).json({ error: 'identity_url or identity_id with selfie is required' });
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
      .insert([{ session_id: resolvedSessionId || null, member_id: member_id || req.user?.id || null, status: "pending" }])
      .select().single();

    if (jobError) return res.status(400).json({ error: jobError });

    // Respond immediately — render runs in background
    res.json({ render_job_id: renderJob.id });

    // Fire async — do not await
    (async () => {
      try {
        const audioBuffer = await generateAudio(resolvedScriptText, identity?.elevenlabs_voice_id);
        const audioUrl = await uploadAudio(audioBuffer, renderJob.id);
        const videoUrl = await startRenderJob(resolvedIdentityUrl, audioUrl, renderJob.id);
        await supabase.from("render_jobs").update({ status: "completed", video_url: videoUrl, completed_at: new Date().toISOString() }).eq("id", renderJob.id);
        if (resolvedSessionId) {
          await supabase.from("sessions").update({ status: "completed", video_url: videoUrl }).eq("id", resolvedSessionId);
        }
      } catch (bgErr) {
        console.error("Background render failed:", bgErr.message);
        await supabase.from("render_jobs").update({ status: "error" }).eq("id", renderJob.id);
      }
    })();

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
    res.json({ status: renderJob.status, video_url: renderJob.video_url });
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
