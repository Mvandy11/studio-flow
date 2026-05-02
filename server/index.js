import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRoutes from './routes/ai/index.js';
import contestsRouter from './routes/contests.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.API_PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/ai', aiRoutes);
app.use('/api/contests', contestsRouter);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Studio Flow API', timestamp: new Date().toISOString() });
});

// ── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Studio Flow API running on port ${PORT}`);
});

export default app;
