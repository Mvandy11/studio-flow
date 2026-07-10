import express from 'express';
import { supabase } from '../supabase/client.js';
import { supabase as supabaseAdmin } from '../supabase/client.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

// POST /api/submissions/create
// Generic contest submission: requires auth and an optional contest_id.
router.post('/create', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { contest_id, user_name, media_url, description } = req.body;

    if (!media_url) {
      return res.status(400).json({ error: 'media_url is required.' });
    }

    // Validate the contest exists if one is provided
    if (contest_id) {
      const { data: contest } = await supabaseAdmin
        .from('contests')
        .select('id, title')
        .eq('id', contest_id)
        .maybeSingle();

      if (!contest) {
        return res.status(404).json({ error: 'Contest not found.' });
      }
    }

    const displayName = user_name?.trim() ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Creator';

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert({
        contest_id:  contest_id || null,
        user_id:     user.id,
        user_name:   displayName,
        user_email:  user.email,
        media_url,
        description,
        status:      'active',
      })
      .select()
      .single();

    if (error) throw error;

    await sendEmail({
      to:      'obviouslyinspiredstudio@outlook.com',
      subject: 'New Submission Received',
      text:    `New submission from ${displayName} (${user.email})\nMedia: ${media_url}\nDescription: ${description || 'None'}\nSubmission ID: ${data.id}`,
    });

    return res.json({ success: true, message: 'Submission received.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions — admin sees all; user sees own
router.get('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let q = supabaseAdmin
      .from('submissions')
      .select('id, user_id, user_name, user_email, media_url, description, status, created_at')
      .order('created_at', { ascending: false });

    if (profile?.role !== 'creator_admin') {
      q = q.eq('user_email', user.email);
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions/:id — single submission
router.get('/:id', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, user_name, user_email, media_url, description, status, created_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Submission not found.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (data.user_email !== user.email && profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/submissions/:id — admin only (update status / feature)
router.patch('/:id', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const allowed = ['status', 'featured'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided.' });
    }

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/submissions/:id — owner or admin
router.delete('/:id', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const { data: existing } = await supabaseAdmin
      .from('submissions')
      .select('user_email')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Submission not found.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (existing.user_email !== user.email && profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { error } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
