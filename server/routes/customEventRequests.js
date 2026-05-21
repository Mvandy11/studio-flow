import express from 'express';
import supabase from '../supabase/supabase.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

async function getUserFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

async function requireAuth(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return null; }
  return user;
}

// GET /api/custom-event-requests — list all requests (admin only, or own requests)
router.get('/', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'creator_admin';

    const query = supabase
      .from('custom_event_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Non-admins only see their own requests
    if (!isAdmin) query.eq('user_id', user.id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[custom-event-requests] list:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom-event-requests/create
router.post('/create', async (req, res) => {
  try {
    const { user_id, title, event_type, price, description } = req.body;

    if (!title || !event_type) {
      return res.status(400).json({ error: 'title and event_type are required.' });
    }

    const { data, error } = await supabase
      .from('custom_event_requests')
      .insert([{ user_id, title, event_type, price, description, status: 'pending' }])
      .select()
      .single();

    if (error) throw error;

    await sendEmail({
      to:      'obviouslyinspiredstudio@outlook.com',
      subject: 'New Custom Event Request',
      text: `A new custom event request has been submitted:

Title: ${title}
Type: ${event_type}
Price: ${price ?? 'N/A'}
Description: ${description || 'None'}
User ID: ${user_id || 'Anonymous'}

Request ID: ${data.id}`,
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[custom-event-requests] create:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/custom-event-requests/pending
router.get('/pending', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from('custom_event_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[custom-event-requests] pending:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/custom-event-requests/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { data, error } = await supabase
      .from('custom_event_requests')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Request not found.' });
    res.json(data);
  } catch (err) {
    console.error('[custom-event-requests] get one:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/custom-event-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { error } = await supabase
      .from('custom_event_requests')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[custom-event-requests] delete:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
