/**
 * /api/stripe — Stub router.
 *
 * Studio Flow 2.0 uses Stripe Payment Links only.
 * The Stripe Customer Portal is not used. This router exists so existing
 * frontend calls receive a clean 503 instead of a 404.
 */
import { Router } from 'express';

const router = Router();

router.post('/create-portal-session', (_req, res) => {
  res.status(503).json({
    error: 'The Stripe billing portal is not available. Studio Flow 2.0 uses Payment Links for membership management.',
  });
});

export default router;
