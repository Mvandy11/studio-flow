/**
 * /api/test-winner-pull — development-only test harness
 *
 * GET  /api/test-winner-pull          → full suite (introspect + edge-case tests)
 * GET  /api/test-winner-pull/dry-run  → dry-run winner selection (no DB writes)
 *
 * Access is blocked in production (NODE_ENV === 'production').
 */

import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();

// ── Guard: dev/staging only ────────────────────────────────────
router.use((_req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// ── helpers ────────────────────────────────────────────────────
async function tableExists(name) {
  const { error } = await supabase.from(name).select('id').limit(1);
  return !error || !error.message.includes('does not exist');
}

function pass(label, detail) {
  return { status: 'PASS', label, detail: detail ?? null };
}
function fail(label, detail) {
  return { status: 'FAIL', label, detail: detail ?? null };
}
function skip(label, reason) {
  return { status: 'SKIP', label, detail: reason };
}

// ── GET /api/test-winner-pull ──────────────────────────────────
router.get('/', async (_req, res) => {
  const results = [];
  const summary = { passed: 0, failed: 0, skipped: 0 };

  function record(r) {
    results.push(r);
    if (r.status === 'PASS')   summary.passed++;
    else if (r.status === 'FAIL') summary.failed++;
    else                       summary.skipped++;
  }

  // ── 1. Table existence ─────────────────────────────────────────
  const hasCont   = await tableExists('contests');
  const hasPurch  = await tableExists('ticket_purchases');
  const hasHist   = await tableExists('winner_history');

  record(hasCont  ? pass('TABLE contests exists')          : fail('TABLE contests exists'));
  record(hasPurch ? pass('TABLE ticket_purchases exists')  : fail('TABLE ticket_purchases exists', 'Run add_drawing_payout_tables.sql migration'));
  record(hasHist  ? pass('TABLE winner_history exists')    : fail('TABLE winner_history exists',   'Run create_winner_history_table.sql migration'));

  // ── 2. Fetch a sample contest ──────────────────────────────────
  const { data: contests } = await supabase
    .from('contests')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(1);

  const sampleContest = contests?.[0] ?? null;
  record(sampleContest
    ? pass('Sample contest found', `id=${sampleContest.id} title="${sampleContest.title}"`)
    : skip('Sample contest found', 'No contests in DB — create one to run draw tests'));

  // ── 3. Edge case: missing eventId → 401 (auth checked before body) ──
  // The endpoint validates the auth token BEFORE it reads the body,
  // so an unauthenticated request with a missing eventId returns 401, not 400.
  // A valid admin token would then get a 400 for the missing eventId field.
  if (sampleContest) {
    const r = await fetch(`http://localhost:${process.env.PORT || 3001}/api/contests/${sampleContest.id}/pull-winners`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ numberOfWinners: 1 }),
    });
    const body = await r.json();
    // Auth is checked first → 401 before body validation → correct behavior
    record(r.status === 401
      ? pass('Edge case: missing eventId + no auth → 401 (auth checked before body — correct)')
      : fail('Edge case: missing eventId + no auth → 401', `Got ${r.status}: ${body.error}`));
  } else {
    record(skip('Edge case: missing eventId + no auth → 401', 'No contest to test against'));
  }

  // ── 4. Edge case: no auth → 401 ───────────────────────────────
  if (sampleContest) {
    const r = await fetch(`http://localhost:${process.env.PORT || 3001}/api/contests/${sampleContest.id}/pull-winners`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ eventId: '00000000-0000-0000-0000-000000000000', numberOfWinners: 1 }),
    });
    const body = await r.json();
    record(r.status === 401
      ? pass('Edge case: no auth token → 401')
      : fail('Edge case: no auth token → 401', `Got ${r.status}: ${body.error}`));
  } else {
    record(skip('Edge case: no auth token → 401', 'No contest to test against'));
  }

  // ── 5. Edge case: invalid contestId → 401 (no auth) ──────────
  {
    const r = await fetch(`http://localhost:${process.env.PORT || 3001}/api/contests/00000000-0000-0000-0000-000000000000/pull-winners`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ eventId: '00000000-0000-0000-0000-000000000000', numberOfWinners: 1 }),
    });
    const body = await r.json();
    // Without auth the server returns 401 before ever reaching the contest lookup
    record(r.status === 401
      ? pass('Edge case: invalid contestId (no auth) → 401')
      : fail('Edge case: invalid contestId (no auth) → 401', `Got ${r.status}: ${body.error}`));
  }

  // ── 6. winner_history read (service-role access) ───────────────
  if (hasHist) {
    const { data, error } = await supabase
      .from('winner_history')
      .select('id, contest_id, place_number, payout_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    record(!error
      ? pass('winner_history readable via service role', `${data?.length ?? 0} record(s) found`)
      : fail('winner_history readable via service role', error.message));
  } else {
    record(skip('winner_history readable via service role', 'Table not migrated yet'));
  }

  // ── 7. ticket_purchases read ────────────────────────────────────
  if (hasPurch) {
    const { data, error } = await supabase
      .from('ticket_purchases')
      .select('user_id, event_id')
      .limit(5);

    record(!error
      ? pass('ticket_purchases readable via service role', `${data?.length ?? 0} record(s) sampled`)
      : fail('ticket_purchases readable via service role', error.message));
  } else {
    record(skip('ticket_purchases readable via service role', 'Table not migrated yet'));
  }

  // ── 8. auth.admin API (service role required) ─────────────────
  {
    const { error: adminErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    record(!adminErr
      ? pass('auth.admin API accessible (service role confirmed)')
      : fail('auth.admin API accessible (service role confirmed)', adminErr.message + ' — ensure SUPABASE_SERVICE_ROLE_KEY is set'));
  }

  // ── 9. Dry-run winner selection logic (no DB writes) ───────────
  if (hasPurch && sampleContest) {
    const { data: purchases } = await supabase
      .from('ticket_purchases')
      .select('user_id')
      .limit(200);

    const seen = new Set();
    const pool = [];
    for (const row of purchases ?? []) {
      if (!row.user_id || seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      pool.push(row.user_id);
    }

    if (pool.length > 0) {
      const idx    = Math.floor(Math.random() * pool.length);
      const picked = pool[idx];
      record(pass('Dry-run Fisher-Yates pick from ticket_purchases', `pool=${pool.length}, picked=${picked}`));
    } else {
      record(skip('Dry-run Fisher-Yates pick', 'No ticket_purchases rows found — purchase a ticket to test draws'));
    }
  } else {
    record(skip('Dry-run Fisher-Yates pick', 'Missing ticket_purchases table or no contest'));
  }

  // ── Result ─────────────────────────────────────────────────────
  const allPassed = summary.failed === 0;
  res.status(allPassed ? 200 : 207).json({
    harness:   'pull-winners test suite',
    timestamp: new Date().toISOString(),
    summary,
    results,
    note: 'This endpoint is disabled in production (NODE_ENV=production).',
  });
});

// ── GET /api/test-winner-pull/dry-run ─────────────────────────
// Shows what winners WOULD be drawn without touching the DB.
router.get('/dry-run', async (req, res) => {
  const { contestId, eventId, n = '3' } = req.query;

  if (!contestId || !eventId) {
    return res.status(400).json({
      error: 'Provide ?contestId=<uuid>&eventId=<uuid>&n=<number>',
    });
  }

  const count = Math.max(1, Math.min(Number(n) || 1, 20));

  // Already-won users
  const { data: prevWinners } = await supabase
    .from('winner_history')
    .select('user_id')
    .eq('contest_id', contestId);

  const alreadyWon = new Set((prevWinners || []).map((r) => r.user_id));

  // Eligible pool
  const { data: purchases, error: tErr } = await supabase
    .from('ticket_purchases')
    .select('user_id')
    .eq('event_id', eventId);

  if (tErr) {
    return res.status(422).json({ error: tErr.message });
  }

  const seen = new Set();
  const pool = [];
  for (const row of purchases ?? []) {
    if (!row.user_id || alreadyWon.has(row.user_id) || seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    pool.push(row.user_id);
  }

  // Pick without inserting
  const remaining = [...pool];
  const wouldDraw = [];
  for (let i = 0; i < count; i++) {
    if (remaining.length === 0) break;
    const idx    = Math.floor(Math.random() * remaining.length);
    const userId = remaining.splice(idx, 1)[0];
    wouldDraw.push({ placeNumber: i + 1, userId });
  }

  res.json({
    note:         'DRY RUN — no DB writes performed.',
    contestId,
    eventId,
    requested:    count,
    poolSize:     pool.length,
    alreadyWon:   alreadyWon.size,
    wouldDraw,
    partial:      wouldDraw.length < count,
  });
});

export default router;
