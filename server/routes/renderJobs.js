import express from "express";
import { emotionCallback } from "../controllers/renderJobsController.js";
import { videoCallback } from "../controllers/sessionsController.js";

const router = express.Router();

// Called by Make.com when the final rendered video is ready.
// Body: { video_url, identity_id, creator_id }
router.post("/:id/video-callback", videoCallback);

// Kept for backward compatibility with older Make.com scenarios.
router.post("/:id/emotion-callback", emotionCallback);

export default router;
