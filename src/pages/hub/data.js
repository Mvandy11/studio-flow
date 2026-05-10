/* ── Studio Flow — Static platform data ──────────────────── */

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
