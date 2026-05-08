import express from 'express';
import { createClient } from '@supabase/supabase-js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

function getClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );
}

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await getClient().auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

// POST /api/submissions/create
router.post('/create', async (req, res) => {
  try {
    const { user_name, user_email, media_url, description } = req.body;

    if (!user_name || !user_email || !media_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from('submissions')
      .insert([{ user_name, user_email, media_url, description }])
      .select()
      .single();

    if (error) throw error;

    await sendEmail({
      to:      'obviouslyinspiredstudio@outlook.com',
      subject: 'New Submission Received',
      text: `A new submission has been received:

Name: ${user_name}
Email: ${user_email}
Media URL: ${media_url}
Description: ${description || 'None'}

Submission ID: ${data.id}`,
    });

    return res.json({ success: true, message: 'Submission received.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/submissions — list all submissions (admin) or own submissions (user)
router.get('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const supabase = getClient();
    let query = supabase
      .from('contest_entries')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'creator_admin') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
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

    const supabase = getClient();
    const { data, error } = await supabase
      .from('contest_entries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Submission not found.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (data.user_id !== user.id && profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/submissions/:id — delete a submission (owner or admin)
router.delete('/:id', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const supabase = getClient();
    const { data: existing } = await supabase
      .from('contest_entries')
      .select('user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Submission not found.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (existing.user_id !== user.id && profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { error } = await supabase
      .from('contest_entries')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
