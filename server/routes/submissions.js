import express from 'express';
import supabase from '../supabase.js';
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
router.post('/create', async (req, res) => {
  try {
    const { user_name, user_email, media_url, description } = req.body;

    if (!user_name || !user_email || !media_url) {
      return res.status(400).json({ error: 'user_name, user_email, and media_url are required.' });
    }

    const { data, error } = await supabase
      .from('submissions')
      .insert([{ user_name, user_email, media_url, description }])
      .select()
      .single();

    if (error) throw error;

    await sendEmail({
      to:      'obviouslyinspiredstudio@outlook.com',
      subject: 'New Submission Received',
      text: `A new submission has been received:\n\nName: ${user_name}\nEmail: ${user_email}\nMedia URL: ${media_url}\nDescription: ${description || 'None'}\n\nSubmission ID: ${data.id}`,
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let q = supabase
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

    const { data, error } = await supabase
      .from('submissions')
      .select('id, user_id, user_name, user_email, media_url, description, status, created_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Submission not found.' });

    const { data: profile } = await supabase
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

    const { data: profile } = await supabase
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

    const { data, error } = await supabase
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

    const { data: existing } = await supabase
      .from('submissions')
      .select('user_email')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Submission not found.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (existing.user_email !== user.email && profile?.role !== 'creator_admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { error } = await supabase
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
