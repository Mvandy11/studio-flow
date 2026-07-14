import express from "express";
import {
  createSession,
  updateSession,
  startRender,
  getRenderStatus,
  listSessions,
  videoCallback
} from "../controllers/sessionsController.js";
import requireGeneratorTier from "../middleware/requireGeneratorTier.js";
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

router.post("/create", createSession);
router.post("/update", updateSession);
router.post("/render", authenticate, requireGeneratorTier, startRender);
router.get("/status/:id", getRenderStatus);
router.get("/list/:member_id", listSessions);

// Alias routes matching what the frontend VideoGenerator calls
router.post("/video/generate", authenticate, requireGeneratorTier, startRender);
router.get("/video/status/:id", authenticate, getRenderStatus);

// Called by Make.com when the rendered video is ready — no auth (external callback)
router.post("/render-jobs/:id/video-callback", videoCallback);

export default router;
