import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.js';
import { logError } from './utils/logError.js';

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
import slotCreationRouter        from './routes/slotCreation.js';
import eventsRouter              from './routes/events.js';
import testWinnerPullRouter      from './routes/testWinnerPull.js';
import analyticsRouter           from './routes/analytics.js';
import adminWinnersRouter        from './routes/adminWinners.js';
import freeChatRouter            from './routes/freeChat.js';
import commentsRouter           from './routes/comments.js';
import contestCommentsRouter    from './routes/contestComments.js';
import liveEventsRouter         from './routes/liveEvents.js';
import liveChatRouter           from './routes/liveChat.js';
import recordedEventsRouter     from './routes/recordedEvents.js';
import uploadRecordedVideoRouter from './routes/uploadRecordedVideo.js';
import stripePortalRouter       from './routes/stripePortal.js';
import membershipRouter         from './routes/membership.js';
import creatorEventsRouter      from './routes/creatorEvents.js';
import revenuePoolRouter        from './routes/revenuePool.js';

const app = express();

// ─────────────────────────────────────────────────────────────
// 1. CORS
// ─────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

// ─────────────────────────────────────────────────────────────
// 2. REQUEST LOGGER — mounted before routes so every request is logged.
//    Skips printing the raw body on Stripe webhook paths.
// ─────────────────────────────────────────────────────────────
app.use(requestLogger);

// ─────────────────────────────────────────────────────────────
// 3. STRIPE WEBHOOK — raw body MUST be parsed before express.json()
//    Applying express.raw() per path keeps req.body as a Buffer
//    only for webhook endpoints; all other routes get JSON.
// ─────────────────────────────────────────────────────────────
const RAW_JSON = express.raw({ type: 'application/json' });
app.use('/api/payments/subscription-webhook', RAW_JSON);
app.use('/api/payments/donation-webhook',     RAW_JSON);
app.use('/api/payments/event-webhook',        RAW_JSON);

// ─────────────────────────────────────────────────────────────
// 4. Normal body parsers (AFTER webhook raw)
// ─────────────────────────────────────────────────────────────
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
app.use('/api/membership',            membershipRouter);
app.use('/api/creator/events',        creatorEventsRouter);
app.use('/api/revenue-pool',          revenuePoolRouter);
app.use('/api/submissions',           submissionsRouter);
app.use('/api/event-slots',           eventSlotsRouter);
app.use('/api/custom-event-requests', customEventRequestsRouter);
app.use('/api/admin/analytics',       analyticsRouter);
app.use('/api/admin/winners',         adminWinnersRouter);
app.use('/api/admin',                 adminApprovalRouter);
app.use('/api/slots',                 slotCreationRouter);
app.use('/api/events',                eventsRouter);
app.use('/api/test-winner-pull',      testWinnerPullRouter);
app.use('/api/live',                  liveEventsRouter);
app.use('/api/live',                  liveChatRouter);
app.use('/api/slot',                  recordedEventsRouter);
app.use('/api/events',               uploadRecordedVideoRouter);
app.use('/api/free-chat',             freeChatRouter);
app.use('/api/comments',             commentsRouter);

// ─────────────────────────────────────────────────────────────
// 6. Health check
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    server:    'Studio Flow API',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// 7. 404
// ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─────────────────────────────────────────────────────────────
// 8. Global error handler — logs full stack, returns JSON
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [server] ❌ Unhandled error on ${req.method} ${req.path}:`);
  console.error(err.stack || err.message);
  logError(err, req.path).catch(() => {});
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
