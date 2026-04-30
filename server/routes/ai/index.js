import { Router } from 'express';
import denoiseRouter from './denoise.js';
import upscaleRouter from './upscale.js';
import outputsRouter from './outputs.js';

const router = Router();

router.use(denoiseRouter);
router.use(upscaleRouter);
router.use(outputsRouter);

export default router;
