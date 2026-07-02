import { supabase } from '../supabase/client.js';

const GENERATOR_TIERS = ['founding', 'premier'];

export default async function requireGeneratorTier(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { data: profile } = await supabase
    .from('profiles').select('membership_tier').eq('id', userId).single();

  if (!profile || !GENERATOR_TIERS.includes(profile.membership_tier)) {
    return res.status(403).json({
      error: 'A Founding or Premier membership is required to use the Video Generator.',
      upgrade_required: true
    });
  }

  const month = new Date().toISOString().slice(0, 7);
  const { data: rc } = await supabase
    .from('generator_render_counts')
    .select('count').eq('member_id', userId).eq('month', month).single();

  if (rc && rc.count >= 5) {
    return res.status(403).json({
      error: 'Monthly render limit reached (5/5). Additional renders are $2.99 each.',
      limit_reached: true
    });
  }

  await supabase.from('generator_render_counts').upsert(
    { member_id: userId, month, count: (rc?.count || 0) + 1 },
    { onConflict: 'member_id,month' }
  );
  next();
}
