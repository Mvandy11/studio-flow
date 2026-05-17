// Canonical route file for POST /api/ai/denoise
// Full implementation lives in server/routes/ai/denoise.js (package-scoped for
// Express/multer/openai dependency resolution). This file is the declared home
// of the route per project conventions — it re-exports the Express router so
// any import from this path works identically.
export { default } from '../../../../server/routes/ai/denoise.js';
