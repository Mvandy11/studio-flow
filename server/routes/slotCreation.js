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

// PATCH /api/slots/:id/event-mode  — slot owner chooses Live or Recorded
router.patch('/:id/event-mode', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (authErr || !user) return res.status(401).json({ error: 'Authentication required.' });

    const { event_mode, video_url } = req.body;
    if (!event_mode || !['live', 'recorded'].includes(event_mode)) {
      return res.status(400).json({ error: 'event_mode must be "live" or "recorded".' });
    }

    // Verify ownership
    const { data: slot, error: slotErr } = await supabase
      .from('event_slots')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (slotErr || !slot) return res.status(404).json({ error: 'Slot not found.' });
    if (slot.user_id !== user.id) return res.status(403).json({ error: 'Forbidden.' });

    // Update slot
    const slotUpdates = { event_mode };
    if (event_mode === 'recorded' && video_url) slotUpdates.video_url = video_url;

    const { data: updatedSlot, error: updateErr } = await supabase
      .from('event_slots')
      .update(slotUpdates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Also update the linked events row (linked via live_room_id = slot.id)
    const eventUpdates = { event_mode, updated_at: new Date().toISOString() };
    if (event_mode === 'recorded' && video_url) eventUpdates.video_url = video_url;

    await supabase
      .from('events')
      .update(eventUpdates)
      .eq('live_room_id', req.params.id);

    return res.json({ slot: updatedSlot, event_mode });
  } catch (err) {
    console.error('[slots/event-mode]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
