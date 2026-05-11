/**
 * One-time contest seed script.
 * Run: node server/scripts/seed-contests.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or key env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CONTESTS = [
  { title: 'Ultimate Creative Mashup',      description: 'Blend any two ideas into one wild creation — video, art, or animation.',           entry_fee: 0, status: 'active' },
  { title: 'Best Freestyle or Remix',        description: 'Show off your flow, remix skills, or original beat.',                              entry_fee: 0, status: 'active' },
  { title: '60-Second Short Film Challenge', description: 'Tell a complete story in one minute.',                                              entry_fee: 0, status: 'active' },
  { title: 'Funniest Skit or Sketch',        description: 'Your funniest scripted or improv moment.',                                         entry_fee: 0, status: 'active' },
  { title: 'Photo of the Month',             description: 'Your most striking, artistic, or meaningful photo.',                                entry_fee: 0, status: 'active' },
  { title: 'Best Graphic or Poster Design',  description: 'Showcase your design skills with a poster, cover, or graphic.',                    entry_fee: 0, status: 'active' },
  { title: 'Most Viral Moment',              description: "Any category, any style — the clip with the biggest 'wow' factor wins.",           entry_fee: 0, status: 'active' },
  { title: 'Best Sports Moments',            description: 'Your most impressive sports highlight.',                                            entry_fee: 0, status: 'active' },
  { title: 'Best Sports Tricks',             description: 'Show off your best trick play or skill move.',                                     entry_fee: 0, status: 'active' },
  { title: 'Best Sports Bloopers',           description: 'Your funniest sports fail or unexpected moment.',                                   entry_fee: 0, status: 'active' },
  { title: 'Best Dunk',                      description: 'Your most explosive or creative dunk.',                                            entry_fee: 0, status: 'active' },
  { title: 'Best QB/WR Throw & Catch',       description: 'Your best quarterback-to-receiver highlight.',                                     entry_fee: 0, status: 'active' },
];

let inserted = 0;
let skipped  = 0;
const errors = [];

for (const contest of CONTESTS) {
  const { data: existing } = await supabase
    .from('contests')
    .select('id')
    .eq('title', contest.title)
    .maybeSingle();

  if (existing) {
    console.log(`  skip  "${contest.title}" (already exists)`);
    skipped++;
    continue;
  }

  const { error } = await supabase.from('contests').insert(contest);
  if (error) {
    console.error(`  ERROR "${contest.title}": ${error.message}`);
    errors.push(contest.title);
  } else {
    console.log(`  + inserted "${contest.title}"`);
    inserted++;
  }
}

console.log(`\nDone — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors.length}`);
if (errors.length) {
  console.log('  Failed:', errors.join(', '));
  console.log('\n  If you see RLS errors, add SUPABASE_SERVICE_ROLE_KEY to your Replit secrets.');
}
