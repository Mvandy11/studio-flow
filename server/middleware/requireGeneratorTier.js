import { supabase } from '../supabase/client.js';

const GENERATOR_TIERS = ['founding', 'premier'];

export default async function requireGeneratorTier(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  // Check membership tier
  const { data: membership } = await supabase
    .from('memberships')
    .select('tier')
    .eq('member_id', userId)
    .single();

  if (!membership || !GENERATOR_TIERS.includes(membership.tier)) {
    return res.status(403).json({
      error: 'A Founding or Premier membership is required to use the Video Generator.',
      upgrade_required: true
    });
  }

  // Check monthly render count (limit: 5)
  const month = new Date().toISOString().slice(0, 7);
  const { data: renderCount } = await supabase
    .from('generator_render_counts')
    .select('count')
    .eq('member_id', userId)
    .eq('month', month)
    .single();

  if (renderCount && renderCount.count >= 5) {
    return res.status(403).json({
      error: 'Monthly render limit reached (5/5). Additional renders are $2.99 each.',
      limit_reached: true
    });
  }

  // Increment count
  await supabase.from('generator_render_counts').upsert({
    member_id: userId, month, count: (renderCount?.count || 0) + 1
  }, { onConflict: 'member_id,month' });

  next();
}
