import { Router } from 'express';
import denoiseRouter from './denoise.js';
import upscaleRouter from './upscale.js';
import outputsRouter from './outputs.js';
import enhanceRouter from './enhance.js';

const router = Router();

router.use(denoiseRouter);
router.use(upscaleRouter);
router.use(outputsRouter);
router.use('/enhance', enhanceRouter);

export default router;
