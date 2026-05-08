import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// POST /api/slots/manual-create
router.post('/manual-create', async (req, res) => {
  try {
    const { user_id, title, password, submission_id, request_id } = req.body;

    if (!title || !password) {
      return res.status(400).json({ error: 'title and password are required.' });
    }

    const { data, error } = await supabase
      .from('event_slots')
      .insert([{ user_id, title, password, submission_id: submission_id || null, request_id: request_id || null }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('[slots/manual-create]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/slots/assign-submission
router.post('/assign-submission', async (req, res) => {
  try {
    const { slot_id, submission_id } = req.body;

    if (!slot_id || !submission_id) {
      return res.status(400).json({ error: 'slot_id and submission_id are required.' });
    }

    const { data, error } = await supabase
      .from('event_slots')
      .update({ submission_id })
      .eq('id', slot_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Slot not found.' });
    return res.json(data);
  } catch (err) {
    console.error('[slots/assign-submission]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/slots/user/:user_id
router.get('/user/:user_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_slots')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[slots/user]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
