import express from "express";
import { emotionCallback } from "../controllers/renderJobsController.js";

const router = express.Router();

// No auth middleware — this endpoint is called by Make.com, not by our own
// authenticated frontend. Validated instead via render_job_id + status checks.
router.post("/:id/emotion-callback", emotionCallback);

export default router;
