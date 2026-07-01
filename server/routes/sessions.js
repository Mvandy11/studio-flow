import express from "express";
import {
  createSession,
  updateSession,
  startRender,
  getRenderStatus,
  listSessions
} from "../controllers/sessionsController.js";

const router = express.Router();

router.post("/create", createSession);
router.post("/update", updateSession);
router.post("/render", startRender);
router.get("/status/:id", getRenderStatus);
router.get("/list/:member_id", listSessions);

export default router;
