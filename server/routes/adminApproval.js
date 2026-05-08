import express from 'express';
import supabase from '../supabase.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// POST /api/admin/approve
router.post('/approve', async (req, res) => {
  try {
    const { submission_id, user_id, title, password, request_id } = req.body;

    if (!submission_id || !title || !password) {
      return res.status(400).json({ error: 'submission_id, title, and password are required.' });
    }

    // 1. Fetch the submission
    const { data: submission, error: fetchErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    // 2. Insert into event_slots
    const { data: slot, error: slotErr } = await supabase
      .from('event_slots')
      .insert([{
        user_id:       user_id || submission.user_id || null,
        request_id:    request_id || null,
        submission_id,
        title,
        password,
      }])
      .select()
      .single();

    if (slotErr) throw slotErr;

    // 3. Update submission status to approved
    const { error: updateErr } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', submission_id);

    if (updateErr) throw updateErr;

    // 4. Email the creator
    const creatorEmail = submission.user_email || null;
    if (creatorEmail) {
      await sendEmail({
        to:      creatorEmail,
        subject: 'Your submission has been approved',
        text: `Congratulations! Your submission has been approved.

Slot Title: ${title}
Upload Password: ${password}

Use this password to upload your content to your event slot.

— Studio Flow Team`,
      });
    }

    return res.json({ success: true, slot_id: slot.id });
  } catch (err) {
    console.error('[admin/approve]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/reject
router.post('/reject', async (req, res) => {
  try {
    const { submission_id, reason } = req.body;

    if (!submission_id) {
      return res.status(400).json({ error: 'submission_id is required.' });
    }

    // Fetch submission for email
    const { data: submission, error: fetchErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    // Update status to rejected
    const { error: updateErr } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', submission_id);

    if (updateErr) throw updateErr;

    // Email the creator
    const creatorEmail = submission.user_email || null;
    if (creatorEmail) {
      await sendEmail({
        to:      creatorEmail,
        subject: 'Your submission was not approved',
        text: `Thank you for submitting to Studio Flow.

After review, your submission was not approved at this time${reason ? `:\n\n${reason}` : '.'}

You are welcome to submit again in a future round.

— Studio Flow Team`,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[admin/reject]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
