/* ── Studio Flow — Static platform data ──────────────────── */

/* Monthly contest helpers ─────────────────────────────────── */

/** Returns "YYYY-MM" for the current month */
export function currentMonthSuffix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns ISO deadline string for the last moment of the current month */
export function currentMonthDeadline() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

/**
 * Returns the event_id used in the DB for a contest this month.
 * Changes each month → automatic monthly reset (new IDs = clean slate).
 */
export function monthlyContestId(slug) {
  return `${slug}-${currentMonthSuffix()}`;
}

/* ── Contest definitions (24 total) ──────────────────────── */
const _CONTEST_DEFS = [
  // ── Original creative contests ──────────────────────────
  {
    slug:        'best-photo',
    emoji:       '📸',
    title:       'Best Photo',
    description: 'Submit your best original photo — any style, any subject. Show your eye for composition.',
    category:    'creative',
  },
  {
    slug:        'best-video',
    emoji:       '🎬',
    title:       'Best Video',
    description: 'Best original video of any genre — documentary, narrative, music video, or vlog.',
    category:    'creative',
  },
  {
    slug:        'best-ai-art',
    emoji:       '🖼',
    title:       'Best AI Art',
    description: 'Most impressive AI-generated artwork. Prompt craft, post-processing, and visual impact all count.',
    category:    'ai',
  },
  {
    slug:        'best-ai-character',
    emoji:       '🧬',
    title:       'Best AI Character',
    description: 'Create the most compelling AI-generated character — design, backstory, and visual presentation.',
    category:    'ai',
  },
  {
    slug:        'best-ai-scene',
    emoji:       '🎭',
    title:       'Best AI Scene',
    description: 'Best AI-generated cinematic scene — lighting, composition, and storytelling in a single frame.',
    category:    'ai',
  },
  {
    slug:        'best-ai-story',
    emoji:       '📖',
    title:       'Best AI Story',
    description: 'Most captivating AI-assisted narrative — short fiction, world-building, or interactive story.',
    category:    'ai',
  },
  {
    slug:        'best-ai-animation',
    emoji:       '🎞',
    title:       'Best AI Animation',
    description: 'Smoothest, most creative AI-generated or AI-assisted animation sequence.',
    category:    'ai',
  },
  {
    slug:        'best-ai-music',
    emoji:       '🎵',
    title:       'Best AI Music / Audio',
    description: 'Best AI-generated or AI-assisted music track, soundscape, or audio production.',
    category:    'ai',
  },
  {
    slug:        'best-creator',
    emoji:       '👑',
    title:       'Best Creator of the Month',
    description: 'Best all-around creator output this month — consistency, quality, and audience impact.',
    category:    'creator',
  },
  {
    slug:        'best-overall',
    emoji:       '🏆',
    title:       'Best Overall Submission',
    description: 'The single best submission across all categories for the month.',
    category:    'creative',
  },
  {
    slug:        'best-short-film',
    emoji:       '🎥',
    title:       'Best Short Film',
    description: 'Best original short film — any genre, up to 15 minutes. Story, cinematography, and editing judged.',
    category:    'film',
  },
  {
    slug:        'best-ai-short-film',
    emoji:       '🤖',
    title:       'Best AI Short Film',
    description: 'Best AI-generated or AI-assisted short film. Any genre, any tool — pure cinematic creativity.',
    category:    'ai',
  },
  {
    slug:        'best-cosplay',
    emoji:       '🦸',
    title:       'Best Cosplay',
    description: 'Most impressive cosplay — craftsmanship, accuracy, and performance all considered.',
    category:    'creative',
  },
  {
    slug:        'best-transformation',
    emoji:       '✨',
    title:       'Best Transformation',
    description: 'Most dramatic before/after transformation — body, space, art, or any creative subject.',
    category:    'creative',
  },
  {
    slug:        'best-makeup-fx',
    emoji:       '💄',
    title:       'Best Makeup / FX',
    description: 'Best makeup artistry or practical special effects work — from beauty to horror.',
    category:    'creative',
  },
  {
    slug:        'best-fan-edit',
    emoji:       '✂️',
    title:       'Best Fan Edit',
    description: 'Best fan-made edit of existing content — trailers, tribute videos, supercuts.',
    category:    'film',
  },
  {
    slug:        'best-highlight-reel',
    emoji:       '🎞️',
    title:       'Best Highlight Reel',
    description: 'Best personal highlight reel — gaming, sports, creativity, or life moments.',
    category:    'creative',
  },
  {
    slug:        'best-comedy-clip',
    emoji:       '😂',
    title:       'Best Comedy Clip',
    description: 'Funniest original comedy video — skits, stand-up clips, or spontaneous moments.',
    category:    'creative',
  },
  {
    slug:        'best-viral-moment',
    emoji:       '🔥',
    title:       'Best Viral Moment',
    description: 'The most share-worthy, reaction-worthy moment captured on video this month.',
    category:    'creative',
  },
  // ── New sports contests ──────────────────────────────────
  {
    slug:        'best-catch-football',
    emoji:       '🏈',
    title:       'Best Catch (Football)',
    description: 'Most spectacular football catch — pro, college, backyard, or fantasy league. One-handed grabs welcome.',
    category:    'sports',
  },
  {
    slug:        'best-dunk-basketball',
    emoji:       '🏀',
    title:       'Best Dunk (Basketball)',
    description: 'Most impressive basketball dunk — power, creativity, and hang time all count.',
    category:    'sports',
  },
  {
    slug:        'funniest-sports-moment',
    emoji:       '😆',
    title:       'Funniest Professional Sports Moment',
    description: 'The most hilarious professional sports blooper, reaction, or sideline moment this month.',
    category:    'sports',
  },
  {
    slug:        'best-sports-highlight',
    emoji:       '⚡',
    title:       'Best Sports Highlight of the Month',
    description: 'Single greatest sports highlight across any sport — skill, clutch play, or pure athleticism.',
    category:    'sports',
  },
  // ── New AI Episode / Narrative Art ──────────────────────
  {
    slug:        'best-ai-episode',
    emoji:       '🎬',
    title:       'Narrative Art / AI Episode',
    description: 'AI films, full episodes, art series, or cinematic scenes with a narrative arc. Storytelling meets AI craft.',
    category:    'ai',
  },
];

/* Generate this month's live contest objects */
export const CONTESTS = _CONTEST_DEFS.map((def) => ({
  ...def,
  id:      monthlyContestId(def.slug),  // e.g. "best-photo-2026-05"
  status:  'active',
}));

/* Category labels for filtering */
export const CONTEST_CATEGORIES = [
  { id: 'all',     label: 'All' },
  { id: 'ai',      label: 'AI' },
  { id: 'sports',  label: 'Sports' },
  { id: 'film',    label: 'Film' },
  { id: 'creator', label: 'Creator' },
  { id: 'creative',label: 'Creative' },
];

/**
 * Events — price is always $2 or $5 to match the two global Stripe payment links.
 *   $2 = casual / standard admission
 *   $5 = premium / curated event
 * Paid ticket unlocks viewing + attendance.
 * Every purchase automatically issues 1 FREE view-only companion ticket.
 */
export const EVENTS = [
  {
    id:          'ev-showcase',
    title:       'Creator Showcase Night',
    price:       5,
    tier:        'premium',
    date:        'June 10, 2026 • 7:00 PM',
    venue:       'Studio Flow Live Hall',
    description: 'Showcase your creative work — videos, music, or art — to a live engaged audience. Networking and prizes.',
    emoji:       '🌟',
  },
  {
    id:          'ev-beat',
    title:       'Beat Battle Live',
    price:       5,
    tier:        'premium',
    date:        'June 17, 2026 • 8:00 PM',
    venue:       'The Sound Studio',
    description: 'Top producers go head-to-head. Live crowd voting. Cash prize for the winner.',
    emoji:       '🎧',
  },
  {
    id:          'ev-comedy',
    title:       'Comedy Open Mic',
    price:       2,
    tier:        'standard',
    date:        'June 24, 2026 • 9:00 PM',
    venue:       'Studio Laughs Venue',
    description: 'Open mic night for comedians of all levels. 5 minutes on stage, full crowd, real energy.',
    emoji:       '🎤',
  },
  {
    id:          'ev-art',
    title:       'Art & Design Expo',
    price:       5,
    tier:        'premium',
    date:        'July 8, 2026 • 6:00 PM',
    venue:       'Gallery Space Downtown',
    description: 'A curated expo featuring digital and physical art. Meet the creators, buy originals.',
    emoji:       '🎨',
  },
  {
    id:          'ev-producer',
    title:       'Producer Workshop',
    price:       5,
    tier:        'premium',
    date:        'July 15, 2026 • 2:00 PM',
    venue:       'Studio Flow HQ',
    description: 'Hands-on production workshop with industry pros. DAW walkthroughs, workflow secrets, Q&A.',
    emoji:       '🎚',
  },
  {
    id:          'ev-freestyle',
    title:       'Freestyle Friday',
    price:       2,
    tier:        'standard',
    date:        'July 25, 2026 • 8:00 PM',
    venue:       'The Cipher Spot',
    description: 'Open freestyle session for MCs and performers. Beat providers on deck. Cypher format.',
    emoji:       '🔥',
  },
];

export const EDUCATION_CATEGORIES = [
  {
    id:     'science',
    label:  'Live Science Projects',
    color:  '#22c55e',
    emoji:  '🧪',
    sessions: [
      { id: 'sci-chem',  title: 'Kitchen Chemistry 101',    instructor: 'Dr. Patel',    date: 'June 5, 2026',   duration: '2h',   price: 10, capacity: 50, description: 'Hands-on chemistry experiments you can safely do at home. Perfect for curious minds of all ages.' },
      { id: 'sci-tesla', title: 'Build a Tesla Coil',       instructor: 'Prof. Reed',   date: 'June 12, 2026',  duration: '3h',   price: 15, capacity: 30, description: 'Step-by-step guide to building a working Tesla coil. Safety protocols included.' },
      { id: 'sci-pi',    title: 'Raspberry Pi Robotics',    instructor: 'Alex Kim',     date: 'June 19, 2026',  duration: '4h',   price: 20, capacity: 25, description: 'Build and program a robot using a Raspberry Pi. No prior coding experience needed.' },
    ],
  },
  {
    id:     'education',
    label:  'Educational Sessions',
    color:  '#3b82f6',
    emoji:  '📚',
    sessions: [
      { id: 'edu-theory',    title: 'Music Theory Masterclass',        instructor: 'Marcus Olu', date: 'June 7, 2026',  duration: '2.5h', price: 15, capacity: 40, description: 'Learn music theory fundamentals through practical examples. Scales, chords, progressions.' },
      { id: 'edu-video',     title: 'Video Editing Bootcamp',          instructor: 'Tia Reeves', date: 'June 14, 2026', duration: '3h',   price: 20, capacity: 35, description: 'Go from raw footage to polished video. Covers DaVinci Resolve and Premiere Pro workflows.' },
      { id: 'edu-monetize',  title: 'Content Monetization Strategy',   instructor: 'Jordan P.',  date: 'June 21, 2026', duration: '1.5h', price: 12, capacity: 60, description: 'Real strategies for monetizing your content across YouTube, TikTok, and brand deals.' },
    ],
  },
  {
    id:     'diy',
    label:  'DIY Home Improvement',
    color:  '#f97316',
    emoji:  '🔨',
    sessions: [
      { id: 'diy-bath',  title: 'Bathroom Renovation Basics', instructor: 'Mike Torres', date: 'June 6, 2026',  duration: '2h',   price: 10, capacity: 30, description: 'Full bathroom reno walkthrough — tiling, fixtures, plumbing basics. Save thousands by DIY.' },
      { id: 'diy-smart', title: 'Smart Home Setup Guide',     instructor: 'Priya N.',    date: 'June 13, 2026', duration: '2.5h', price: 15, capacity: 40, description: 'Automate your home with smart lights, locks, cameras, and voice assistants on any budget.' },
      { id: 'diy-deck',  title: 'Deck Building Workshop',    instructor: 'Jake R.',     date: 'June 20, 2026', duration: '3h',   price: 18, capacity: 25, description: 'Design and build a backyard deck from scratch. Material planning, framing, finishing.' },
    ],
  },
];

/* ── Payout logic ─────────────────────────────────────────── */
export function calculatePayout(revenue) {
  if (revenue < 500) {
    return [{ rank: 1, pct: 100, amount: revenue }];
  }
  if (revenue <= 2000) {
    return [
      { rank: 1, pct: 60, amount: revenue * 0.6 },
      { rank: 2, pct: 40, amount: revenue * 0.4 },
    ];
  }
  return [
    { rank: 1, pct: 50, amount: revenue * 0.5 },
    { rank: 2, pct: 30, amount: revenue * 0.3 },
    { rank: 3, pct: 20, amount: revenue * 0.2 },
  ];
}

export function formatCountdown(deadlineISO) {
  const diff = new Date(deadlineISO) - Date.now();
  if (diff <= 0) return 'Month Closed';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left this month`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
