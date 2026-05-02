import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

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
    const { status, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('contests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data: data || [], count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contests/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data: contest, error: cErr } = await supabase
      .from('contests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (cErr || !contest) return res.status(404).json({ error: 'Contest not found.' });

    const { data: entries, error: eErr } = await supabase
      .from('contest_entries')
      .select('*')
      .eq('contest_id', req.params.id)
      .order('vote_count', { ascending: false });

    if (eErr) throw eErr;

    res.json({ contest, entries: entries || [] });
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
      submission_start, submission_end, voting_start, voting_end, status,
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

    const now = new Date();
    const subStart = contest.submission_start ? new Date(contest.submission_start) : null;
    const subEnd   = contest.submission_end   ? new Date(contest.submission_end)   : null;

    if (subStart && now < subStart) {
      return res.status(400).json({ error: 'Submissions have not opened yet.' });
    }
    if (subEnd && now > subEnd) {
      return res.status(400).json({ error: 'Submission window has closed.' });
    }

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
      id:              randomUUID(),
      contest_id:      req.params.id,
      user_id:         user.id,
      title,
      description,
      file_url,
      storage_path,
      submitter_email: user.email,
      created_at:      new Date().toISOString(),
    };

    const { data: inserted, error: dbErr } = await supabase
      .from('contest_entries')
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
      .select('voting_start, voting_end, status')
      .eq('id', req.params.id)
      .single();

    if (!contest) return res.status(404).json({ error: 'Contest not found.' });

    const now = new Date();
    const voteStart = contest.voting_start ? new Date(contest.voting_start) : null;
    const voteEnd   = contest.voting_end   ? new Date(contest.voting_end)   : null;

    if (voteStart && now < voteStart) {
      return res.status(400).json({ error: 'Voting has not started yet.' });
    }
    if (voteEnd && now > voteEnd) {
      return res.status(400).json({ error: 'Voting has closed.' });
    }

    // Insert vote (unique constraint handles anti-spam)
    const { error: voteErr } = await supabase
      .from('contest_votes')
      .insert({
        id:         randomUUID(),
        contest_id: req.params.id,
        entry_id:   req.params.entryId,
        user_id:    user.id,
      });

    if (voteErr) {
      if (voteErr.message?.includes('unique')) {
        return res.status(409).json({ error: 'You have already voted for this entry.' });
      }
      throw voteErr;
    }

    // Increment vote_count on the entry
    await supabase.rpc('increment_vote_count', { entry_id: req.params.entryId }).catch(() => {
      // Fallback: manual update
      return supabase
        .from('contest_entries')
        .select('vote_count')
        .eq('id', req.params.entryId)
        .single()
        .then(({ data }) => {
          if (data) {
            return supabase
              .from('contest_entries')
              .update({ vote_count: (data.vote_count || 0) + 1 })
              .eq('id', req.params.entryId);
          }
        });
    });

    res.json({ success: true, message: 'Vote recorded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contests/:id/entries ─────────────────────────────
router.get('/:id/entries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contest_entries')
      .select('*')
      .eq('contest_id', req.params.id)
      .order('vote_count', { ascending: false });

    if (error) throw error;
    res.json({ entries: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
