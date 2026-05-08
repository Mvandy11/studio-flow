/**
 * Express application — exported without calling listen().
 * Used by both server/index.js (local dev) and netlify/functions/api.js (Netlify).
 */
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/ai/index.js';
import contestsRouter from './routes/contests.js';
import payoutsRouter from './routes/payouts.js';
import likesRouter from './routes/likes.js';
import announcementsRouter from './routes/announcements.js';
import customEventsRouter from './routes/customEvents.js';
import paymentsRouter from './routes/payments.js';
import submissionsRouter from './routes/submissions.js';
import eventSlotsRouter from './routes/eventSlots.js';
import customEventRequestsRouter from './routes/customEventRequests.js';

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/ai',            aiRoutes);
app.use('/api/contests',      contestsRouter);
app.use('/api/payouts',       payoutsRouter);
app.use('/api/likes',          likesRouter);
app.use('/api/announcements',  announcementsRouter);
app.use('/api/custom-events',  customEventsRouter);
app.use('/api/payments',       paymentsRouter);
app.use('/api/submissions',    submissionsRouter);
app.use('/api/event-slots',            eventSlotsRouter);
app.use('/api/custom-event-requests', customEventRequestsRouter);

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Studio Flow API', timestamp: new Date().toISOString() });
});

// ── 404 ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
