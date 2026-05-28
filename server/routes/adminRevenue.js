import { Router } from 'express';
import supabaseAdmin from '../supabase/supabaseAdmin.js';

const router = Router();

router.get('/revenue-summary', async (req, res) => {
  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return res.status(401).json({ error: 'Authorization header is required.' });

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required.' });

    const { data, error: viewErr } = await supabaseAdmin
      .from('platform_revenue_summary').select('*').maybeSingle();
    if (viewErr) return res.status(500).json({ error: 'Failed to load revenue summary.' });

    return res.json({
      member_30_count:          Number(data?.member_30_count ?? 0),
      creator_50_count:         Number(data?.creator_50_count ?? 0),
      contest_pool_monthly:     Number(data?.contest_pool_monthly ?? 0),
      event_pool_monthly:       Number(data?.event_pool_monthly ?? 0),
      donations_total:          Number(data?.donations_total ?? 0),
      donations_this_month:     Number(data?.donations_this_month ?? 0),
      earnings_paid_total:      Number(data?.earnings_paid_total ?? 0),
      earnings_pending_total:   Number(data?.earnings_pending_total ?? 0),
      earnings_paid_this_month: Number(data?.earnings_paid_this_month ?? 0),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
