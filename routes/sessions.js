import express from "express";
import { supabase } from "../server/supabase/client.js";
import { fireMakeWebhook } from "../server/videoRenderer.js";

const router = express.Router();

/**
 * Create a new session
 */
router.post("/create", async (req, res) => {
  try {
    const {
      member_id,
      identity_id,
      title,
      description,
      scenes,
      thumbnail_url
    } = req.body;

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
});

/**
 * Update a session
 */
router.post("/update", async (req, res) => {
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
});

/**
 * Start a video render job
 */
router.post("/render", async (req, res) => {
  try {
    const { session_id } = req.body;

    // Fetch session
    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (error) return res.status(400).json({ error });

    // Start render job
    const render_id = await startRenderJob({
      identity_id: session.identity_id,
      scenes: session.scenes
    });

    // Update session status
    await supabase
      .from("sessions")
      .update({ status: "rendering" })
      .eq("id", session_id);

    res.json({ render_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check render status
 */
router.get("/status/:id", async (req, res) => {
  try {
    const render_id = req.params.id;

    const status = await getRenderStatus(render_id);

    // If completed, update session
    if (status.status === "completed") {
      await supabase
        .from("sessions")
        .update({
          status: "completed",
          video_url: status.video_url
        })
        .eq("id", status.session_id);
    }

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * List sessions for a member
 */
router.get("/list/:member_id", async (req, res) => {
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
});

export default router;
