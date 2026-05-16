import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import supabase from '../supabase.js';

const router = express.Router();

const BUCKET         = process.env.SUPABASE_STORAGE_BUCKET || 'studio-flow-library';
const ADMIN_EMAIL    = 'obviouslyinspiredstudio@outlook.com';
const CONTEST_PREFIX = 'library/contests';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

// ── Email setup (graceful degradation if SMTP not configured) ─
function createMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendSubmissionEmail(contest, entry, submitterEmail) {
  const mailer = createMailer();
  if (!mailer) return; // SMTP not configured — skip silently

  const subject = `[Studio Flow] New Contest Submission: ${contest.title}`;
  const html = `
    <h2>New Contest Entry</h2>
    <p><strong>Contest:</strong> ${contest.title}</p>
    <p><strong>Submission Title:</strong> ${entry.title}</p>
    <p><strong>Description:</strong> ${entry.description || '—'}</p>
    <p><strong>Submitter Email:</strong> ${submitterEmail || '—'}</p>
    ${entry.file_url ? `<p><strong>File:</strong> <a href="${entry.file_url}">${entry.file_url}</a></p>` : ''}
    <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
    <hr/>
    <p style="color:#888;font-size:12px">Studio Flow Contest System</p>
  `;

  try {
    await mailer.sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error('[contests] Email send error:', err.message);
  }
}

// ── Auth helper ───────────────────────────────────────────────
async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ── GET /api/contests ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('contests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      // Explicit status filter (e.g. admin dashboard requesting 'draft')
      query = query.eq('status', status);
    } else {
      // Default: show all publicly visible contests — exclude drafts and archived
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

    // Fetch contest + active submissions + winners in parallel
    const [
      { data: contest, error: cErr },
      { data: submissions, error: sErr },
      { data: winners },
    ] = await Promise.all([
      supabase.from('contests').select('*').eq('id', cid).single(),
      supabase.from('submissions').select('*').eq('contest_id', cid).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('winners').select('submission_id, rank').eq('contest_id', cid),
    ]);

    if (cErr || !contest) return res.status(404).json({ error: 'Contest not found.' });
    if (sErr) throw sErr;

    const subs = submissions || [];

    // Aggregate like counts per submission
    let entries = subs;
    if (subs.length > 0) {
      const ids = subs.map((s) => s.id);
      const { data: likes } = await supabase
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

// ── POST /api/contests (create — admin only) ──────────────────
router.post('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const {
      title, description, thumbnail_url, entry_fee, prize_pool,
      winner_count, start_date, end_date,
      submission_start, submission_end, voting_start, voting_end, status, category,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const { data, error } = await supabase
      .from('contests')
      .insert({
        id: randomUUID(),
        title, description, thumbnail_url,
        entry_fee:    Number(entry_fee)   || 0,
        prize_pool:   Number(prize_pool)  || 0,
        winner_count: Number(winner_count)|| 1,
        start_date, end_date,
        submission_start, submission_end,
        voting_start, voting_end,
        status: status || 'draft',
        category: category || 'general',
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
router.patch('/:id', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const { data, error } = await supabase
      .from('contests')
      .update(req.body)
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

    const { data: contest } = await supabase
      .from('contests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!contest) return res.status(404).json({ error: 'Contest not found.' });

    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Entry title is required.' });

    let file_url = null;
    let storage_path = null;

    // Upload file if provided
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const filename = `${randomUUID()}.${ext}`;
      storage_path = `${CONTEST_PREFIX}/${req.params.id}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storage_path, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadErr) console.error('[contests] Upload error:', uploadErr.message);
      else {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);
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

    const { data: inserted, error: dbErr } = await supabase
      .from('submissions')
      .insert(entry)
      .select()
      .single();

    if (dbErr) throw new Error(dbErr.message);

    // Send email notification (non-blocking)
    sendSubmissionEmail(contest, inserted, user.email).catch(() => {});

    res.status(201).json({ entry: inserted });
  } catch (err) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: 'You have already submitted an entry to this contest.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contests/:id/entries/:entryId/vote ──────────────
router.post('/:id/entries/:entryId/vote', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: contest } = await supabase
      .from('contests')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!contest) return res.status(404).json({ error: 'Contest not found.' });

    // Insert like/vote (unique constraint handles anti-spam)
    const { error: voteErr } = await supabase
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
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const { is_winner, winner_rank, featured } = req.body;

    // Update featured flag on the submission
    if (featured !== undefined) {
      await supabase
        .from('submissions')
        .update({ featured: Boolean(featured) })
        .eq('id', req.params.entryId)
        .eq('contest_id', req.params.id);
    }

    // Track winners in the winners table
    if (is_winner !== undefined) {
      if (is_winner) {
        await supabase
          .from('winners')
          .upsert({
            contest_id:    req.params.id,
            submission_id: req.params.entryId,
            rank:          winner_rank || 1,
          }, { onConflict: 'contest_id,submission_id' });
      } else {
        await supabase
          .from('winners')
          .delete()
          .eq('contest_id', req.params.id)
          .eq('submission_id', req.params.entryId);
      }
    }

    const { data, error } = await supabase
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
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const { data: contest, error: cErr } = await supabase
      .from('contests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (cErr || !contest) return res.status(404).json({ error: 'Contest not found.' });

    const { data: winners, error: wErr } = await supabase
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

    const results = await Promise.allSettled(
      winners.map((w) =>
        supabase.from('earnings').insert({
          creator_id: w.submissions?.user_id || w.user_id,
          contest_id: req.params.id,
          amount:     prizeShare,
          source:     'contest_prize',
          status:     'pending',
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    res.json({ success: true, winners: succeeded, prizeShare, total: prizePool });
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
    // ── 1. Admin auth ──────────────────────────────────────────
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    // ── 2. Parse + validate body ───────────────────────────────
    const { eventId, numberOfWinners = 1, payouts = [] } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }
    const count = Math.max(1, Math.min(Number(numberOfWinners) || 1, 100));

    console.log('[pull-winners] Starting draw', { contestId, eventId, numberOfWinners: count });

    // ── 3. Verify contest exists ───────────────────────────────
    const { data: contest, error: cErr } = await supabase
      .from('contests')
      .select('id, title')
      .eq('id', contestId)
      .maybeSingle();

    if (cErr || !contest) {
      return res.status(404).json({ error: 'Contest not found.' });
    }

    // ── 4. Get users already in winner_history for this contest ─
    const { data: prevWinners, error: phErr } = await supabase
      .from('winner_history')
      .select('user_id')
      .eq('contest_id', contestId);

    if (phErr) {
      // winner_history table may not exist yet — treat as empty
      console.warn('[pull-winners] winner_history query failed:', phErr.message);
    }

    const alreadyWon = new Set((prevWinners || []).map((r) => r.user_id));

    // ── 5. Fetch all ticket purchasers for this event ──────────
    const { data: purchases, error: tErr } = await supabase
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

    // ── 6. Build eligible pool (unique users, not already won) ──
    const seen = new Set();
    const pool = [];
    for (const row of purchases) {
      if (!row.user_id) continue;
      if (alreadyWon.has(row.user_id)) continue;
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      pool.push(row.user_id);
    }

    console.log('[pull-winners] Eligible pool size:', pool.length);

    if (pool.length === 0) {
      return res.status(422).json({ error: 'No eligible participants remaining. All ticket holders have already won.' });
    }

    // ── 7. Draw winners one at a time ──────────────────────────
    const drawn = [];
    const remaining = [...pool];

    for (let i = 0; i < count; i++) {
      if (remaining.length === 0) break;

      // Fisher-Yates single pick
      const idx = Math.floor(Math.random() * remaining.length);
      const userId = remaining[idx];
      remaining.splice(idx, 1); // remove so can't be picked again this round

      const payout  = payouts[i] ?? {};
      const placeNum   = payout.placeNumber  ?? i + 1;
      const payoutAmt  = Number(payout.payoutAmount ?? 0);

      // Insert into winner_history
      const { error: insertErr } = await supabase
        .from('winner_history')
        .insert({
          user_id:       userId,
          event_id:      eventId,
          contest_id:    contestId,
          place_number:  placeNum,
          payout_amount: payoutAmt,
        });

      if (insertErr) {
        // Unique constraint on (contest_id, place_number) — skip silently
        console.warn(`[pull-winners] Insert failed for place ${placeNum}:`, insertErr.message);
        continue;
      }

      drawn.push({ userId, placeNumber: placeNum, payoutAmount: payoutAmt });
    }

    // ── 8. Enrich winners with profile info ────────────────────
    const enriched = await Promise.all(
      drawn.map(async (w) => {
        const { data: p } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', w.userId)
          .maybeSingle();

        let email = null;
        const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(w.userId);
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

    console.log('[pull-winners] Drew winners:', enriched.map((w) => ({ place: w.placeNumber, userId: w.userId })));

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
    const { data, error } = await supabase
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
