import express from 'express';
import { createIdentity } from '../controllers/identityController.js';
import { supabase } from '../supabase/client.js';

const router = express.Router();

// POST /api/identity/create
router.post('/create', createIdentity);

// GET /api/identity/list — returns all identities for the authenticated user
router.get('/list', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const { data, error } = await supabase
    .from('identities')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ identities: data });
});

export default router;
