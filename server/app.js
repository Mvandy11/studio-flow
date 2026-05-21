import express from 'express';
import cors from 'cors';

import aiRoutes from './routes/ai/index.js';
import authProfileRouter from './routes/authProfile.js';
import contestsRouter from './routes/contests.js';
import payoutsRouter from './routes/payouts.js';
import likesRouter from './routes/likes.js';
import announcementsRouter from './routes/announcements.js';
import customEventsRouter from './routes/customEvents.js';
import paymentsRouter from './routes/payments.js';
import submissionsRouter from './routes/submissions.js';
import eventSlotsRouter from './routes/eventSlots.js';
import customEventRequestsRouter from './routes/customEventRequests.js';
import adminApprovalRouter from './routes/adminApproval.js';
import slotCreationRouter from './routes/slotCreation.js';
import eventsRouter from './routes/events.js';
import testWinnerPullRouter from './routes/testWinnerPull.js';
import analyticsRouter from './routes/analytics.js';
import adminWinnersRouter from './routes/adminWinners.js';
import freeChatRouter from './routes/freeChat.js';

const app = express();

// ─────────────────────────────────────────────────────────────
// 1. CORS
// ─────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

// ─────────────────────────────────────────────────────────────
// 2. STRIPE WEBHOOK — MUST COME BEFORE express.json()
//    This preserves the raw body for signature verification.
// ─────────────────────────────────────────────────────────────
app.use(
  '/api/payments/subscription-webhook',
  express.raw({ type: 'application/json' }),
  paymentsRouter
);

// ─────────────────────────────────────────────────────────────
// 3. Normal body parsers (AFTER webhook)
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// ─────────────────────────────────────────────────────────────
// 4. All other routes
// ─────────────────────────────────────────────────────────────
app.use('/api/ai',                    aiRoutes);
app.use('/api/auth',                  authProfileRouter);
app.use('/api/contests',              contestsRouter);
app.use('/api/payouts',               payoutsRouter);
app.use('/api/likes',                 likesRouter);
app.use('/api/announcements',         announcementsRouter);
app.use('/api/custom-events',         customEventsRouter);
app.use('/api/payments',              paymentsRouter);
app.use('/api/submissions',           submissionsRouter);
app.use('/api/event-slots',           eventSlotsRouter);
app.use('/api/custom-event-requests', customEventRequestsRouter);
app.use('/api/admin/analytics',       analyticsRouter);
app.use('/api/admin/winners',         adminWinnersRouter);
app.use('/api/admin',                 adminApprovalRouter);
app.use('/api/slots',                 slotCreationRouter);
app.use('/api/events',                eventsRouter);
app.use('/api/test-winner-pull',      testWinnerPullRouter);
app.use('/api/free-chat',             freeChatRouter);

// ─────────────────────────────────────────────────────────────
// 5. Health check
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Studio Flow API', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────
// 6. 404
// ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─────────────────────────────────────────────────────────────
// 7. Error handler
// ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
