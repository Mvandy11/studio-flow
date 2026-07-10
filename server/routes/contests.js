import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { supabase } from '../supabase/client.js';
import { supabase as supabaseAdmin } from '../supabase/client.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

const BUCKET         = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';
const ADMIN_EMAIL    = 'obviouslyinspiredstudio@outlook.com';
const CONTEST_PREFIX = 'library/contests';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

// ── Auth helper ───────────────────────────────────────────────
async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ── Admin guard — returns user or sends 401/403 ───────────────
async function requireAdmin(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'creator_admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return user;
}

// ── GET /api/contests ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    let query = supabaseAdmin
      .from('contests')
      .select('id, title, description, category, entry_fee, start_date, end_date, status, created_at, thumbnail_url, prize_pool, winner_count', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: exclude drafts and archived from public view
      query = query.in('status', ['active', 'voting', 'completed']);
    }

    if (category) query = query.eq('category', category);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data: data || [], count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contests/:id ─────────────────────────────────────
// Returns: contest, entries (with like_count), winners
router.get('/:id', async (req, res) => {
  try {
    const cid = req.params.id;

    const [
      { data: contest, error: cErr },
      { data: submissions, error: sErr },
      { data: winners },
    ] = await Promise.all([
      supabaseAdmin
        .from('contests')
        .select('id, title, description, category, entry_fee, start_date, end_date, status, created_at, thumbnail_url, prize_pool, winner_count')
        .eq('id', cid)
        .single(),
      supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('contest_id', cid)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('winners')
        .select('submission_id, rank')
        .eq('contest_id', cid),
    ]);

    if (cErr || !contest) return res.status(404).json({ error: 'Contest not found.' });
    if (sErr) throw sErr;

    const subs = submissions || [];

    // Aggregate like counts per submission
    let entries = subs;
    if (subs.length > 0) {
      const ids = subs.map((s) => s.id);
      const { data: likes } = await supabaseAdmin
        .from('likes')
        .select('entry_id')
        .in('entry_id', ids);

      const countMap = {};
      for (const row of (likes || [])) {
        countMap[row.entry_id] = (countMap[row.entry_id] || 0) + 1;
      }
      entries = subs
        .map((s) => ({ ...s, like_count: countMap[s.id] || 0 }))
        .sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }

    res.json({ contest, entries, winners: winners || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests/:id/enter — submit a contest entry ────
// Validates auth + membership tier server-side so user_id can't be spoofed.
router.post('/:id/enter', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'You must be logged in to submit an entry.' });

    // Membership gate — member_30, creator_50, or creator_admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('membership_tier, membership_active, role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin   = profile?.role === 'creator_admin';
    const isEligible = isAdmin
      || (profile?.membership_active && ['member_30', 'creator_50'].includes(profile?.membership_tier));

    if (!isEligible) {
      return res.status(403).json({
        error: 'A membership ($30/mo or $50/mo) is required to submit contest entries.',
        upgrade_url: '/membership',
      });
    }

    const contestId = req.params.id;

    // Verify the contest exists and is accepting entries
    const { data: contest, error: cErr } = await supabaseAdmin
      .from('contests')
      .select('id, status, title')
      .eq('id', contestId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!contest) return res.status(404).json({ error: 'Contest not found.' });
    if (!['active', 'voting'].includes(contest.status) && !isAdmin) {
      return res.status(400).json({ error: 'This contest is not currently accepting entries.' });
    }

    const { title, description, media_url } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Entry title is required.' });
    if (title.trim().length > 120) return res.status(400).json({ error: 'Title must be 120 characters or fewer.' });

    const { data, error: insertErr } = await supabaseAdmin
      .from('submissions')
      .insert({
        contest_id:  contestId,
        user_id:     user.id,
        user_name:   user.user_metadata?.name || user.email?.split('@')[0] || 'Creator',
        user_email:  user.email,
        title:       title.trim(),
        description: description?.trim() || null,
        media_url:   media_url || null,
        video_url:   media_url || null,
        status:      'active',
      })
      .select('id, title, created_at')
      .single();

    if (insertErr) throw insertErr;

    console.log(`[contests/enter] ✅ entry=${data.id} contest=${contestId} user=${user.id}`);
    res.status(201).json({ success: true, entry: data });
  } catch (err) {
    console.error('[contests/enter] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests (create — admin only) ──────────────────
router.post('/', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const {
      title, description, thumbnail_url, entry_fee, prize_pool,
      winner_count, start_date, end_date,
      submission_start, submission_end, voting_start, voting_end, status, category,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const { data, error } = await supabaseAdmin
      .from('contests')
      .insert({
        id: randomUUID(),
        title,
        description,
        thumbnail_url,
        entry_fee:    Number(entry_fee)    || 0,
        prize_pool:   Number(prize_pool)   || 0,
        winner_count: Number(winner_count) || 1,
        start_date,
        end_date,
        submission_start,
        submission_end,
        voting_start,
        voting_end,
        status:    status   || 'draft',
        category:  category || 'general',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ contest: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/contests/:id (update — admin only) ─────────────
const CONTEST_UPDATABLE = new Set([
  'title', 'description', 'thumbnail_url', 'status', 'category',
  'entry_fee', 'prize_pool', 'winner_count',
  'start_date', 'end_date', 'submission_start', 'submission_end',
  'voting_start', 'voting_end',
]);

router.patch('/:id', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => CONTEST_UPDATABLE.has(k)),
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided.' });
    }

    const { data, error } = await supabaseAdmin
      .from('contests')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ contest: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests/:id/entries (submit entry + email) ─────
router.post('/:id/entries', upload.single('file'), async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: contest } = await supabaseAdmin
      .from('contests')
      .select('id, title, status')
      .eq('id', req.params.id)
      .single();

    if (!contest) return res.status(404).json({ error: 'Contest not found.' });

    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Entry title is required.' });

    let file_url = null;

    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const filename = `${randomUUID()}.${ext}`;
      const storage_path = `${CONTEST_PREFIX}/${req.params.id}/${filename}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storage_path, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadErr) {
        console.error('[contests] Upload error:', uploadErr.message);
      } else {
        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storage_path);
        file_url = urlData?.publicUrl || null;
      }
    }

    const entry = {
      contest_id:  req.params.id,
      user_id:     user.id,
      user_name:   user.user_metadata?.name || user.email?.split('@')[0] || 'Creator',
      user_email:  user.email,
      title,
      description,
      media_url:   file_url,
      video_url:   file_url,
      status:      'active',
    };

    const { data: inserted, error: dbErr } = await supabaseAdmin
      .from('submissions')
      .insert(entry)
      .select()
      .single();

    if (dbErr) {
      if (dbErr.message?.includes('unique') || dbErr.code === '23505') {
        return res.status(409).json({ error: 'You have already submitted an entry to this contest.' });
      }
      throw new Error(dbErr.message);
    }

    // Send email notification (non-blocking)
    sendEmail({
      to:      ADMIN_EMAIL,
      subject: `[Studio Flow] New Contest Submission: ${contest.title}`,
      html: `
        <h2>New Contest Entry</h2>
        <p><strong>Contest:</strong> ${contest.title}</p>
        <p><strong>Submission Title:</strong> ${inserted.title}</p>
        <p><strong>Description:</strong> ${inserted.description || '—'}</p>
        <p><strong>Submitter Email:</strong> ${user.email || '—'}</p>
        ${inserted.media_url ? `<p><strong>File:</strong> <a href="${inserted.media_url}">${inserted.media_url}</a></p>` : ''}
        <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
      `,
    }).catch(() => {});

    res.status(201).json({ entry: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests/:id/entries/:entryId/vote ──────────────
router.post('/:id/entries/:entryId/vote', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: contest } = await supabaseAdmin
      .from('contests')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!contest) return res.status(404).json({ error: 'Contest not found.' });

    // Insert like/vote (unique constraint handles anti-spam)
    const { error: voteErr } = await supabaseAdmin
      .from('likes')
      .insert({
        user_id:  user.id,
        entry_id: req.params.entryId,
      });

    if (voteErr) {
      if (voteErr.message?.includes('unique') || voteErr.code === '23505') {
        return res.status(409).json({ error: 'You have already voted for this entry.' });
      }
      throw voteErr;
    }

    res.json({ success: true, message: 'Vote recorded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/contests/:id/entries/:entryId (admin — mark winner/featured) ──
router.patch('/:id/entries/:entryId', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { is_winner, winner_rank, featured } = req.body;

    if (featured !== undefined) {
      await supabaseAdmin
        .from('submissions')
        .update({ featured: Boolean(featured) })
        .eq('id', req.params.entryId)
        .eq('contest_id', req.params.id);
    }

    if (is_winner !== undefined) {
      if (is_winner) {
        await supabaseAdmin
          .from('winners')
          .upsert({
            contest_id:    req.params.id,
            submission_id: req.params.entryId,
            rank:          winner_rank || 1,
          }, { onConflict: 'contest_id,submission_id' });
      } else {
        await supabaseAdmin
          .from('winners')
          .delete()
          .eq('contest_id', req.params.id)
          .eq('submission_id', req.params.entryId);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', req.params.entryId)
      .single();

    if (error) throw error;
    res.json({ entry: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests/:id/payout (admin — record prize earnings) ──
router.post('/:id/payout', async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { data: contest, error: cErr } = await supabaseAdmin
      .from('contests')
      .select('id, title, prize_pool')
      .eq('id', req.params.id)
      .single();

    if (cErr || !contest) return res.status(404).json({ error: 'Contest not found.' });

    const { data: winners, error: wErr } = await supabaseAdmin
      .from('winners')
      .select('*, submissions(user_id)')
      .eq('contest_id', req.params.id)
      .order('rank', { ascending: true });

    if (wErr) throw wErr;
    if (!winners || winners.length === 0) {
      return res.status(400).json({ error: 'No winners marked. Please mark winners before triggering payout.' });
    }

    const prizePool = Number(contest.prize_pool) || 0;
    if (prizePool <= 0) {
      return res.status(400).json({ error: 'This contest has no prize pool set.' });
    }

    const prizeShare = Math.round((prizePool / winners.length) * 100) / 100;

    const winnerUserIds = winners.map((w) => w.submissions?.user_id || w.user_id).filter(Boolean);

    const { data: winnerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_active')
      .in('id', winnerUserIds);

    const subscribedIds = new Set(
      (winnerProfiles || []).filter((p) => p.subscription_active).map((p) => p.id),
    );

    const blocked = [];
    const payoutTargets = [];

    for (const w of winners) {
      const uid = w.submissions?.user_id || w.user_id;
      if (!uid) continue;
      if (subscribedIds.has(uid)) {
        payoutTargets.push({ ...w, _uid: uid });
      } else {
        blocked.push(uid);
      }
    }

    if (payoutTargets.length === 0) {
      return res.status(403).json({
        error: 'No eligible winners have an active subscription. Only subscribers can receive cash prizes.',
        blocked,
      });
    }

    const results = await Promise.allSettled(
      payoutTargets.map((w) =>
        supabaseAdmin.from('earnings').insert({
          creator_id: w._uid,
          contest_id: req.params.id,
          amount:     prizeShare,
          source:     'contest_prize',
          status:     'pending',
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    res.json({
      success: true,
      winners: succeeded,
      prizeShare,
      total: prizePool,
      blocked_non_subscribers: blocked,
      ...(blocked.length > 0 && {
        warning: `${blocked.length} winner(s) skipped — no active subscription.`,
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests/:id/pull-winners ───────────────────────
// Randomly selects N winners from ticket_purchases, skipping any
// user already recorded in winner_history for this contest.
router.post('/:id/pull-winners', async (req, res) => {
  const contestId = req.params.id;
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { eventId, numberOfWinners = 1, payouts = [] } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }
    const count = Math.max(1, Math.min(Number(numberOfWinners) || 1, 100));

    const { data: contest, error: cErr } = await supabaseAdmin
      .from('contests')
      .select('id, title')
      .eq('id', contestId)
      .maybeSingle();

    if (cErr || !contest) {
      return res.status(404).json({ error: 'Contest not found.' });
    }

    const { data: prevWinners, error: phErr } = await supabaseAdmin
      .from('winner_history')
      .select('user_id')
      .eq('contest_id', contestId);

    if (phErr) {
      console.warn('[pull-winners] winner_history query failed:', phErr.message);
    }

    const alreadyWon = new Set((prevWinners || []).map((r) => r.user_id));

    const { data: purchases, error: tErr } = await supabaseAdmin
      .from('ticket_purchases')
      .select('user_id')
      .eq('event_id', eventId);

    if (tErr) {
      console.warn('[pull-winners] ticket_purchases query failed:', tErr.message);
      return res.status(422).json({ error: 'Could not fetch ticket purchases. Ensure ticket_purchases table exists.' });
    }

    if (!purchases || purchases.length === 0) {
      return res.status(422).json({ error: 'No ticket purchases found for this event.' });
    }

    const seen = new Set();
    const pool = [];
    for (const row of purchases) {
      if (!row.user_id) continue;
      if (alreadyWon.has(row.user_id)) continue;
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      pool.push(row.user_id);
    }

    if (pool.length === 0) {
      return res.status(422).json({ error: 'No eligible participants remaining. All ticket holders have already won.' });
    }

    const drawn = [];
    const remaining = [...pool];

    for (let i = 0; i < count; i++) {
      if (remaining.length === 0) break;

      const idx = Math.floor(Math.random() * remaining.length);
      const userId = remaining[idx];
      remaining.splice(idx, 1);

      const payout    = payouts[i] ?? {};
      const placeNum  = payout.placeNumber  ?? i + 1;
      const payoutAmt = Number(payout.payoutAmount ?? 0);

      const { error: insertErr } = await supabaseAdmin
        .from('winner_history')
        .insert({
          user_id:       userId,
          event_id:      eventId,
          contest_id:    contestId,
          place_number:  placeNum,
          payout_amount: payoutAmt,
        });

      if (insertErr) {
        console.warn(`[pull-winners] Insert failed for place ${placeNum}:`, insertErr.message);
        continue;
      }

      drawn.push({ userId, placeNumber: placeNum, payoutAmount: payoutAmt });
    }

    const enriched = await Promise.all(
      drawn.map(async (w) => {
        const { data: p } = await supabaseAdmin
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', w.userId)
          .maybeSingle();

        let email = null;
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(w.userId);
        if (authErr) {
          console.warn(`[pull-winners] getUserById failed for ${w.userId}:`, authErr.message);
        } else {
          email = authData?.user?.email || null;
        }

        return {
          ...w,
          username:  p?.display_name || p?.username || null,
          avatarUrl: p?.avatar_url   || null,
          email,
        };
      }),
    );

    res.json({
      success:  true,
      contest:  contest.title,
      winners:  enriched,
      poolSize: pool.length,
    });
  } catch (err) {
    console.error('[pull-winners] Unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contests/:id/entries ─────────────────────────────
router.get('/:id/entries', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('contest_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ entries: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
