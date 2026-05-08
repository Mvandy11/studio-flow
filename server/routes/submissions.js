import express from 'express';
import { createClient } from '@supabase/supabase-js';

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

// GET /api/submissions — list all submissions (admin) or own submissions (user)
router.get('/', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    const supabase = getClient();

    let query = supabase
      .from('contest_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (user) {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'creator_admin') {
        query = query.eq('user_id', user.id);
      }
    } else {
      return res.status(401).json({ error: 'Authentication required.' });
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

    // Only the owner or admin can view
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
