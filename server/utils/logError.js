/**
 * logError — persists a backend error to the backend_errors table.
 *
 * Uses supabaseAdmin (service role) so it works regardless of RLS.
 * Failures are caught and printed to console so logging never crashes
 * the application.
 *
 * @param {Error|unknown} err   - The caught error (or any thrown value)
 * @param {string}        route - The Express req.path or a descriptive label
 */
import { supabase as supabaseAdmin } from '../supabase/client.js';

export async function logError(err, route) {
  try {
    const message = err?.message || String(err);
    const stack   = err?.stack   || null;

    const { error: dbErr } = await supabaseAdmin
      .from('backend_errors')
      .insert({ message, stack, route: route || 'unknown' });

    if (dbErr) {
      console.error('[logError] Failed to persist error to DB:', dbErr.message);
    }
  } catch (fatal) {
    // Never let the logger itself crash the server
    console.error('[logError] Fatal error in logError():', fatal?.message);
  }
}
