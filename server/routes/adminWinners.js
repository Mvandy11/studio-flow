import express from 'express';
import supabase from '../supabase/supabase.js';

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireAdmin(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  const authResp = await supabase.auth.getUser(token);
  const user = authResp.data?.user;
  if (authResp.error || !user) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const r = profile?.role;
  if (r !== 'admin' && r !== 'creator_admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return user;
}

// Wraps a Supabase query so it never throws — always resolves to { data: [] }
// when the table is missing, empty, or an RLS error occurs.
function safe(query) {
  return query
    .then(({ data, error }) => {
      if (error) {
        console.warn('[adminWinners] query error (returning []):', error.message);
        return { data: [] };
      }
      return { data: data ?? [] };
    })
    .catch((err) => {
      console.warn('[adminWinners] query threw (returning []):', err?.message);
      return { data: [] };
    });
}

// ── GET /api/admin/winners ────────────────────────────────────────────────────
// Returns winner_history rows plus lookup lists for contests/events.
// Uses service-role client → bypasses all RLS.
// Always returns valid JSON — empty arrays / zero totals when tables have no data.
router.get('/', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [winnersRes, contestsRes, eventsRes] = await Promise.all([
      safe(
        supabase
          .from('winner_history')
          .select('id, user_id, event_id, contest_id, place_number, payout_amount, created_at')
          .order('created_at', { ascending: false })
      ),
      safe(
        supabase
          .from('contests')
          .select('id, title')
          .order('title', { ascending: true })
      ),
      safe(
        supabase
          .from('events')
          .select('id, title')
          .order('title', { ascending: true })
      ),
    ]);

    const winners = winnersRes.data;

    // Compute summary totals — safe against empty / null data
    const totalWinners  = winners.length;
    const totalPayout   = winners.reduce((sum, w) => sum + Number(w.payout_amount || 0), 0);
    const uniqueWinners = new Set(winners.map(w => w.user_id).filter(Boolean)).size;

    res.json({
      winners,
      contests:     contestsRes.data,
      events:       eventsRes.data,
      totalWinners,
      totalPayout,
      uniqueWinners,
    });
  } catch (err) {
    console.error('[adminWinners] unhandled error:', err.message);
    // Always return valid JSON — never HTML
    res.status(500).json({
      error:        'Failed to load winner data.',
      winners:      [],
      contests:     [],
      events:       [],
      totalWinners:  0,
      totalPayout:   0,
      uniqueWinners: 0,
    });
  }
});

export default router;
