/**
 * Inserts the two comedy contests into Supabase.
 * Run: pnpm --filter @workspace/scripts add-comedy-contests
 *
 * Requires env vars: SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const now         = new Date();
const endOfMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

const contests = [
  {
    title:            'Funniest Baby Moments',
    description:      'Submit your funniest baby moments — caught on camera! The most hilarious clip wins.',
    thumbnail_url:    'https://placehold.co/400x300/1a1a2e/ffffff?text=👶😂',
    entry_fee:        0,       // membership entry is free; $5 ticket is via Stripe
    prize_pool:       0,       // grows as contest tickets are sold
    winner_count:     1,
    start_date:       now.toISOString(),
    end_date:         endOfMonth.toISOString(),
    submission_start: now.toISOString(),
    submission_end:   endOfMonth.toISOString(),
    voting_start:     null,
    voting_end:       null,
    status:           'active',
    created_by:       null,
  },
  {
    title:            "World's Funniest Video",
    description:      "Think you've captured the world's funniest video? Enter now and let the votes decide!",
    thumbnail_url:    'https://placehold.co/400x300/1a1a2e/ffffff?text=🎬😂',
    entry_fee:        0,
    prize_pool:       0,
    winner_count:     1,
    start_date:       now.toISOString(),
    end_date:         endOfMonth.toISOString(),
    submission_start: now.toISOString(),
    submission_end:   endOfMonth.toISOString(),
    voting_start:     null,
    voting_end:       null,
    status:           'active',
    created_by:       null,
  },
];

console.log('Inserting 2 comedy contests into Supabase…');

const { data, error } = await supabase
  .from('contests')
  .insert(contests)
  .select('id, title, status');

if (error) {
  console.error('Insert failed:', error.message);
  process.exit(1);
}

console.log('Done! Inserted:');
data?.forEach((c) => console.log(`  ✓ ${c.title} — ${c.id} [${c.status}]`));
