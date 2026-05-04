/**
 * Local development entrypoint.
 * Imports the Express app from app.js and starts the HTTP server.
 * On Netlify, netlify/functions/api.js is used instead — it does NOT call listen().
 */
import app from './app.js';

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Studio Flow API running on port ${PORT}`);
});

export default app;
