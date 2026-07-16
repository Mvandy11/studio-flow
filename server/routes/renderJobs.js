import express from "express";
import { startRenderJob, emotionCallback } from "../controllers/renderJobsController.js";
import { videoCallback } from "../controllers/sessionsController.js";
import authenticate from "../middleware/authenticate.js";

const router = express.Router();

// POST /api/render-jobs
// Frontend trigger: creates a render job and fires the Make.com webhook.
router.post("/", authenticate, startRenderJob);

// POST /api/render-jobs/:id/video-callback
// Called by Replicate when the generated video is ready (no auth — external callback).
router.post("/:id/video-callback", videoCallback);

// POST /api/render-jobs/:id/emotion-callback
// Kept for backward compatibility with older Make.com scenarios.
router.post("/:id/emotion-callback", emotionCallback);

export default router;
