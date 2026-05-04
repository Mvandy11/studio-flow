/**
 * Netlify Function — wraps the Studio Flow Express app with serverless-http.
 *
 * All /api/* traffic is routed here by the redirect rule in netlify.toml.
 * The full request path (e.g. /api/contests) is preserved in event.path,
 * so Express routing works without any changes.
 */
import serverless from 'serverless-http';
import app from '../../server/app.js';

export const handler = serverless(app);
