import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { requestLogger } from './middleware/logger.js';
import { logError } from './utils/logError.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR  = join(__dirname, '..', 'dist', 'public');

// ─────────────────────────────────────────────────────────────
// Existing route imports
// ─────────────────────────────────────────────────────────────
import aiRoutes                  from './routes/ai/index.js';
import authProfileRouter         from './routes/authProfile.js';
import contestsRouter            from './routes/contests.js';
import payoutsRouter             from './routes/payouts.js';
import likesRouter               from './routes/likes.js';
import announcementsRouter       from './routes/announcements.js';
import customEventsRouter        from './routes/customEvents.js';
import paymentsRouter            from './routes/payments.js';
import submissionsRouter         from './routes/submissions.js';
import eventSlotsRouter          from './routes/eventSlots.js';
import customEventRequestsRouter from './routes/customEventRequests.js';
import adminApprovalRouter       from './routes/adminApproval.js';
import adminRevenueRouter        from './routes/adminRevenue.js';
import adminPayoutRouter         from './routes/adminPayout.js';
import stripeConnectRouter       from './routes/stripeConnect.js';
import slotCreationRouter        from './routes/slotCreation.js';
import eventsRouter              from './routes/events.js';
import testWinnerPullRouter      from './routes/testWinnerPull.js';
import analyticsRouter           from './routes/analytics.js';
import adminWinnersRouter        from './routes/adminWinners.js';
import freeChatRouter            from './routes/freeChat.js';
import commentsRouter            from './routes/comments.js';
import contestCommentsRouter     from './routes/contestComments.js';
import liveEventsRouter          from './routes/liveEvents.js';
import liveChatRouter            from './routes/liveChat.js';
import recordedEventsRouter      from './routes/recordedEvents.js';
import uploadRecordedVideoRouter from './routes/uploadRecordedVideo.js';
import stripePortalRouter        from './routes/stripePortal.js';
import membershipRouter          from './routes/membership.js';
import creatorEventsRouter       from './routes/creatorEvents.js';
import revenuePoolRouter         from './routes/revenuePool.js';
import donationsRouter           from './routes/donations.js';

// ─────────────────────────────────────────────────────────────
// ⭐ NEW — Identity Engine Router
// ─────────────────────────────────────────────────────────────
import identityRouter            from './routes/identity.js';

// ─────────────────────────────────────────────────────────────
// ⭐ NEW — Sessions Router (video sessions backend)
// ─────────────────────────────────────────────────────────────
import sessionsRouter            from './routes/sessions.js';
import renderJobsRouter          from './routes/renderJobs.js';

const app = express();

// ─────────────────────────────────────────────────────────────
// 1. CORS
// ─────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

// ─────────────────────────────────────────────────────────────
// 2. REQUEST LOGGER
// ─────────────────────────────────────────────────────────────
app.use(requestLogger);

// ─────────────────────────────────────────────────────────────
// 3. Body parsers (Stripe raw bytes first)
// ─────────────────────────────────────────────────────────────
app.use(
  [
    '/api/payments/subscription-webhook',
    '/api/payments/donation-webhook',
    '/api/payments/event-webhook',
    '/api/payments/stripe-webhook',
  ],
  express.raw({ type: 'application/json' })
);

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// ─────────────────────────────────────────────────────────────
// 5. All routes (each router mounted exactly once)
// ─────────────────────────────────────────────────────────────
app.use('/api/ai',                    aiRoutes);
app.use('/api/auth',                  authProfileRouter);
app.use('/api/contests',              contestsRouter);
app.use('/api/contests',              contestCommentsRouter);
app.use('/api/payouts',               payoutsRouter);
app.use('/api/likes',                 likesRouter);
app.use('/api/announcements',         announcementsRouter);
app.use('/api/custom-events',         customEventsRouter);
app.use('/api/payments',              paymentsRouter);
app.use('/api/stripe',                stripePortalRouter);
app.use('/api/stripe-connect',        stripeConnectRouter);
app.use('/api/membership',            membershipRouter);
app.use('/api/creator/events',        creatorEventsRouter);
app.use('/api/revenue-pool',          revenuePoolRouter);
app.use('/api/donations',             donationsRouter);
app.use('/api/submissions',           submissionsRouter);
app.use('/api/event-slots',           eventSlotsRouter);
app.use('/api/custom-event-requests', customEventRequestsRouter);
app.use('/api/admin/analytics',       analyticsRouter);
app.use('/api/admin/winners',         adminWinnersRouter);
app.use('/api/admin',                 adminPayoutRouter);
app.use('/api/admin',                 adminRevenueRouter);
app.use('/api/admin',                 adminApprovalRouter);
app.use('/api/slots',                 slotCreationRouter);
app.use('/api/events',                eventsRouter);
app.use('/api/test-winner-pull',      testWinnerPullRouter);
app.use('/api/live',                  liveEventsRouter);
app.use('/api/live',                  liveChatRouter);
app.use('/api/slot',                  recordedEventsRouter);
app.use('/api/events',                uploadRecordedVideoRouter);
app.use('/api/free-chat',             freeChatRouter);
app.use('/api/comments',              commentsRouter);

// ─────────────────────────────────────────────────────────────
// ⭐ NEW — Identity Engine Route
// ─────────────────────────────────────────────────────────────
app.use('/api/identity', identityRouter);

// ─────────────────────────────────────────────────────────────
// ⭐ NEW — Sessions Route (video sessions)
// ─────────────────────────────────────────────────────────────
app.use('/api/sessions', sessionsRouter);

// ─────────────────────────────────────────────────────────────
// ⭐ Render Jobs — inline handlers (no auth required)
// ─────────────────────────────────────────────────────────────
const { supabase: supabaseClient } = await import('./supabase/client.js');

app.post('/api/render-jobs', async (req, res) => {
  try {
    let {
      identity_id, creator_id, image_url, audio_url,
      script, script_text, scene_description,
      emotional_physics, logic_profile, agent_rules,
      voice_style, personality_type, primary_topic,
      energy_level, speaking_pace,
    } = req.body;

    let resolvedScript = script || script_text || '';
    let resolvedScene  = scene_description || '';

    if ((!resolvedScript || !resolvedScene) && identity_id) {
      const { data: identity } = await supabaseClient
        .from('identities')
        .select('script, scene_description, emotional_physics, logic_profile, agent_rules, image_url, audio_url')
        .eq('id', identity_id)
        .single();

      if (identity) {
        if (!resolvedScript)    resolvedScript    = identity.script            || '';
        if (!resolvedScene)     resolvedScene     = identity.scene_description || '';
        if (!emotional_physics) emotional_physics = identity.emotional_physics || null;
        if (!logic_profile)     logic_profile     = identity.logic_profile     || null;
        if (!agent_rules)       agent_rules       = identity.agent_rules       || null;
        if (!image_url)         image_url         = identity.image_url         || '';
        if (!audio_url)         audio_url         = identity.audio_url         || '';
      }
    }

    console.log('[render-jobs] script length:', resolvedScript.length,
                '| image_url:', image_url?.slice(0, 40),
                '| audio_url:', audio_url?.slice(0, 40));

    const { data: job, error } = await supabaseClient
      .from('render_jobs')
      .insert({
        identity_id,
        creator_id,
        script:            resolvedScript,
        scene_description: resolvedScene,
        emotional_physics: emotional_physics || null,
        logic_profile:     logic_profile     || null,
        agent_rules:       agent_rules       || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    const render_job_id = job.id;
    const backendBase   = process.env.BACKEND_URL || 'https://studio-flow-backend.onrender.com';
    const callback_url  = `${backendBase}/api/render-jobs/${render_job_id}/video-callback`;

    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeWebhookUrl) throw new Error('MAKE_WEBHOOK_URL env var is not set');

    console.log('[render-jobs] Calling Make.com webhook:', makeWebhookUrl);

    const webhookRes = await fetch(makeWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        render_job_id,
        creator_id,
        identity_id,
        image_url:         image_url         || '',
        audio_url:         audio_url         || '',
        video_url:         '',
        callback_url,
        script:            resolvedScript,
        scene_description: resolvedScene,
        voice_style:       voice_style       || '',
        personality_type:  personality_type  || '',
        primary_topic:     primary_topic     || '',
        energy_level:      energy_level      || '',
        speaking_pace:     speaking_pace     || '',
        emotional_physics: emotional_physics || null,
        logic_profile:     logic_profile     || null,
        agent_rules:       agent_rules       || null,
      }),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '');
      throw new Error(`Make.com webhook returned ${webhookRes.status}: ${text}`);
    }

    console.log('[render-jobs] Make.com webhook OK — job:', render_job_id);
    res.json({ success: true, render_job_id, id: render_job_id });
  } catch (err) {
    console.error('[render-jobs] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/render-jobs/:id/video-callback', async (req, res) => {
  try {
    const { id }  = req.params;
    const payload = req.body;

    const video_url = Array.isArray(payload.output)
      ? payload.output[0]
      : payload.output;

    if (video_url) {
      await supabaseClient
        .from('render_jobs')
        .update({ video_url, status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      console.log(`[video-callback] saved video_url for job ${id}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('video-callback error:', err);
    res.status(500).json({ error: err.message });
  }
});

console.log('Routes registered: POST /api/render-jobs OK');

// ─────────────────────────────────────────────────────────────
// ⭐ Render Jobs router (kept for legacy emotion-callback)
// ─────────────────────────────────────────────────────────────
app.use('/api/render-jobs', renderJobsRouter);

// ─────────────────────────────────────────────────────────────
// 6. Health check
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Proxy — forward any unhandled /api/* to the canonical backend.
// Comes AFTER all inline route handlers so specific routes win.
// Comes BEFORE the SPA catch-all so it is never swallowed.
// ─────────────────────────────────────────────────────────────
app.use('/api', createProxyMiddleware({
  target: 'https://studio-flow-backend.onrender.com',
  changeOrigin: true,
  secure: true,
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Backend unavailable' });
    },
  },
}));

console.log('Routes registered: POST /api/render-jobs OK');
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    server:    'Studio Flow API',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// 7. Serve built React frontend in production
// ─────────────────────────────────────────────────────────────
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// ─────────────────────────────────────────────────────────────
// 8. Global error handler
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [server] ❌ Unhandled error on ${req.method} ${req.path}:`);
  console.error(err.stack || err.message);
  logError(err, req.path).catch(() => {});
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;

