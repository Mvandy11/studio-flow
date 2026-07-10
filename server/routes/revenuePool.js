/**
 * Revenue Pool API
 * Mounted at /api/revenue-pool by app.js.
 *
 * GET  /api/revenue-pool/current
 *   Returns current month pool total (public).
 *
 * POST /api/revenue-pool/calculate
 *   Sums all entries for the current month, upserts into revenue_pool.
 *   Requires service-role or creator_admin role.
 *
 * GET  /api/revenue-pool/my-earnings
 *   Returns authenticated creator's pool entries + monthly summary.
 */

import { Router } from 'express';
import { supabase as supabaseAdmin } from '../supabase/client.js';
import { logError } from '../utils/logError.js';

const router = Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// ── GET /api/revenue-pool/current ────────────────────────────────────────────
router.get('/current', async (req, res) => {
  try {
    const month = currentMonth();

    const { data, error } = await supabaseAdmin
      .from('revenue_pool')
      .select('month, total_amount, created_at')
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;

    res.json({ month, total_amount: data?.total_amount ?? 0 });
  } catch (err) {
    console.error('[revenue-pool] GET /current error:', err.message);
    await logError(err, '/api/revenue-pool/current');
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/revenue-pool/calculate ─────────────────────────────────────────
// Recalculates and upserts the current month pool total.
router.post('/calculate', async (req, res) => {
  try {
    const month = currentMonth();
    const startOfMonth = `${month}-01`;
    // First day of next month
    const [year, mon] = month.split('-').map(Number);
    const nextMonthDate = mon === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

    const { data: entries, error: entErr } = await supabaseAdmin
      .from('revenue_pool_entries')
      .select('amount')
      .gte('created_at', startOfMonth)
      .lt('created_at', nextMonthDate);

    if (entErr) throw entErr;

    const total = (entries || []).reduce((s, e) => s + Number(e.amount), 0);

    const { error: upsertErr } = await supabaseAdmin
      .from('revenue_pool')
      .upsert({ month, total_amount: total }, { onConflict: 'month' });

    if (upsertErr) throw upsertErr;

    console.log(`[revenue-pool] ✅ Calculated ${month}: $${total}`);
    res.json({ month, total_amount: total });
  } catch (err) {
    console.error('[revenue-pool] POST /calculate error:', err.message);
    await logError(err, '/api/revenue-pool/calculate');
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/revenue-pool/my-earnings ────────────────────────────────────────
// Returns pool entries for the authenticated creator + current month total.
router.get('/my-earnings', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return res.status(401).json({ error: 'Authentication required.' });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

    const month = currentMonth();
    const startOfMonth = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const nextMonthDate = mon === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

    const [allEntriesRes, monthEntriesRes, poolRes] = await Promise.all([
      supabaseAdmin
        .from('revenue_pool_entries')
        .select('id, amount, source, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('revenue_pool_entries')
        .select('amount, source')
        .eq('creator_id', user.id)
        .gte('created_at', startOfMonth)
        .lt('created_at', nextMonthDate),
      supabaseAdmin
        .from('revenue_pool')
        .select('total_amount')
        .eq('month', month)
        .maybeSingle(),
    ]);

    const allEntries   = allEntriesRes.data  || [];
    const monthEntries = monthEntriesRes.data || [];
    const poolTotal    = poolRes.data?.total_amount ?? 0;

    const monthlyTotal = monthEntries.reduce((s, e) => s + Number(e.amount), 0);
    const allTimeTotal = allEntries.reduce((s, e) => s + Number(e.amount), 0);

    res.json({
      month,
      monthly_total:  monthlyTotal,
      all_time_total: allTimeTotal,
      pool_total:     poolTotal,
      entries:        allEntries,
    });
  } catch (err) {
    console.error('[revenue-pool] GET /my-earnings error:', err.message);
    await logError(err, '/api/revenue-pool/my-earnings');
    res.status(500).json({ error: err.message });
  }
});

export default router;
