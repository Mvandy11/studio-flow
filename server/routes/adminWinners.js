import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

async function requireAdmin(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Authentication required.' }); return null; }

  const authResp = await supabase.auth.getUser(token);
  const user = authResp.data?.user;
  if (authResp.error || !user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

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

// GET /api/admin/winners — list all winner_history rows (service-role bypasses RLS)
router.get('/', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [winnersRes, contestsRes, eventsRes] = await Promise.all([
      supabase
        .from('winner_history')
        .select('id, user_id, event_id, contest_id, place_number, payout_amount, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('contests').select('id, title').order('title', { ascending: true }),
      supabase.from('events').select('id, title').order('title', { ascending: true }),
    ]);

    res.json({
      winners:  winnersRes.data  || [],
      contests: contestsRes.data || [],
      events:   eventsRes.data   || [],
    });
  } catch (err) {
    console.error('[adminWinners]', err.message);
    res.status(500).json({ error: 'Failed to load winner data.' });
  }
});

export default router;
