/**
 * Request logger middleware.
 *
 * Logs method, path, status, duration, and user-agent for every request.
 * Skips logging the raw body on Stripe webhook paths (body is a Buffer).
 * All output goes to stdout so it appears in the Replit console.
 */

const WEBHOOK_PATHS = [
  '/api/payments/subscription-webhook',
  '/api/payments/donation-webhook',
  '/api/payments/event-webhook',
];

export function requestLogger(req, res, next) {
  const start = Date.now();
  const ts    = new Date().toISOString();

  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    const color  = status >= 500 ? '31' : status >= 400 ? '33' : status >= 300 ? '36' : '32';
    const body   = WEBHOOK_PATHS.includes(req.path)
      ? '<raw-webhook-body>'
      : req.body && Object.keys(req.body).length
        ? JSON.stringify(sanitizeBody(req.body))
        : '';

    console.log(
      `[${ts}] \x1b[${color}m${status}\x1b[0m ${req.method} ${req.path}` +
      ` — ${ms}ms` +
      (body ? ` | body: ${body.slice(0, 200)}` : '') +
      ` | ua: ${(req.get('user-agent') || '—').slice(0, 60)}`
    );
  });

  next();
}

/** Remove sensitive fields before logging the request body. */
function sanitizeBody(body) {
  const REDACT = new Set(['password', 'stream_key', 'token', 'secret', 'authorization']);
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = REDACT.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}
