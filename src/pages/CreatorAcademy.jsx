import React, { useState } from 'react';
import './CreatorAcademy.css';
import DonationButton from '../components/DonationButton';
import { useAuth } from '../hooks/useAuth';

/* ─── Icon Components (inline SVG for zero-dependency usage) ─── */
const icons = {
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
      <circle cx="6.5" cy="12" r="0.5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  trendingUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  dollarSign: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  barChart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  ),
  award: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ca-icon">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ca-icon ca-icon--sm">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ca-icon ca-icon--xs">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
};

/* ─── Data ─── */
const sections = [
  {
    id: 'getting-started',
    icon: icons.rocket,
    color: '#6366f1',
    title: 'Getting Started',
    tagline: 'Set up your creative workspace in minutes',
    description:
      'Learn how to configure your Studio Flow dashboard, connect your accounts, and personalise your workspace so everything is ready before you create your first piece of content.',
    steps: [
      'Create your Studio Flow account and complete your profile',
      'Connect your social accounts and content platforms',
      'Customise your dashboard layout and notification preferences',
      'Explore the asset library and template gallery',
      'Browse active contests and announcements to find your first opportunity',
    ],
    tips: [
      'Complete your profile bio and avatar — creators with full profiles get more engagement.',
      'Pin your most-used tools to the sidebar for one-click access.',
      'Enable dark mode in Settings → Appearance for late-night sessions.',
    ],
  },
  {
    id: 'content-creation',
    icon: icons.palette,
    color: '#ec4899',
    title: 'Content Creation Basics',
    tagline: 'Master the fundamentals of compelling content',
    description:
      'From scripting to shooting to editing, this section walks you through the core creative pipeline. Learn composition, lighting, color grading, and pacing to elevate every piece you publish.',
    steps: [
      'Outline your content idea with the Story Canvas tool',
      'Record or capture raw footage and audio',
      'Import media into the Studio Flow editor',
      'Apply templates, transitions, and color presets',
      'Export in the optimal format for each platform',
    ],
    tips: [
      'Batch-create content in themed sessions to stay ahead of your calendar.',
      'Use the built-in AI caption generator to save hours of subtitling.',
      'Keep an "ideas vault" inside Studio Flow Notes for future inspiration.',
    ],
  },
  {
    id: 'audio-production',
    icon: icons.mic,
    color: '#f59e0b',
    title: 'Audio & Podcast Production',
    tagline: 'Crystal-clear sound for every format',
    description:
      'Great audio separates amateurs from professionals. Learn microphone technique, noise reduction, mixing, and mastering — whether you are producing podcasts, voiceovers, or music beds.',
    steps: [
      'Choose the right microphone and recording environment',
      "Record with Studio Flow's multi-track audio engine",
      'Clean up background noise with the AI Denoise filter',
      'Mix levels, EQ, and compression for a polished sound',
      'Export podcast-ready MP3 or lossless WAV files',
    ],
    tips: [
      'Record a 10-second "room tone" clip to help the noise-reduction algorithm.',
      'Keep vocal peaks between -6 dB and -3 dB for headroom.',
      'Add chapter markers so listeners can skip to key moments.',
    ],
  },
  {
    id: 'brand-building',
    icon: icons.award,
    color: '#10b981',
    title: 'Building Your Brand',
    tagline: 'Define a look and voice people remember',
    description:
      "A strong brand is more than a logo. This module covers visual identity, tone of voice, content pillars, and the psychology behind brand loyalty — plus how Studio Flow's Brand Kit keeps everything consistent.",
    steps: [
      'Define your mission statement and content pillars',
      'Design a cohesive color palette, typography, and logo suite',
      'Create a Brand Kit inside Studio Flow for one-click consistency',
      'Write brand voice guidelines and example captions',
      'Audit existing content for alignment with your new brand',
    ],
    tips: [
      'Limit your palette to 3–5 colors so assets feel cohesive at a glance.',
      'Save branded intro/outro templates to maintain recognition across videos.',
      'Revisit your brand guidelines every quarter as your style evolves.',
    ],
  },
  {
    id: 'audience-growth',
    icon: icons.users,
    color: '#3b82f6',
    title: 'Audience Growth',
    tagline: 'Turn viewers into a loyal community',
    description:
      'Numbers matter, but engagement matters more. Discover proven strategies for organic reach, collaboration, SEO-driven discoverability, and community management — all tracked inside Studio Flow.',
    steps: [
      'Identify your ideal audience persona',
      'Optimise titles, thumbnails, and descriptions for search',
      'Develop a consistent posting schedule with the Content Calendar',
      'Engage with comments and messages through the Inbox Hub',
      'Collaborate with creators using the Collab Board',
    ],
    tips: [
      'Reply to every comment in the first 60 minutes after publishing.',
      "Use Studio Flow's A/B thumbnail tester before committing to a design.",
      'Cross-promote on at least two platforms to diversify your reach.',
    ],
  },
  {
    id: 'monetization',
    icon: icons.dollarSign,
    color: '#8b5cf6',
    title: 'Monetization on Studio Flow',
    tagline: 'Multiple earning paths built for creators',
    description:
      'Studio Flow offers multiple ways for creators to earn: Monthly Reward Pool funded by member subscriptions and donations, Custom Events supported by viewer donations, and Contest Performance where likes help determine winners and influence payouts. This section explains how each earning path works and how to maximize your opportunities.',
    steps: [
      'Complete your profile so Studio Flow can verify your creator identity',
      'Submit your payout method to Studio Flow administration',
      'Enter active contests and collect likes on your submissions',
      'Request a custom event slot for performances, classes, or workshops',
      'Promote your event or contest entry to grow engagement',
      'Receive your payout after each contest or event cycle',
    ],
    tips: [
      'Diversify your earning streams — likes, events, and donations compound over time.',
      'The more consistently you post, the more likely you are to be featured.',
      'Submit your payout details early so there are no delays when rewards are issued.',
    ],
  },
  {
    id: 'analytics',
    icon: icons.barChart,
    color: '#0ea5e9',
    title: 'Analytics & Insights',
    tagline: 'Let data guide your next creative decision',
    description:
      'Studio Flow aggregates performance data across every platform so you can spot trends, double down on what works, and iterate faster. Learn how to read dashboards, set KPIs, and run content experiments.',
    steps: [
      'Connect all platforms to the Analytics Hub',
      'Set key performance indicators (KPIs) for each content pillar',
      'Review the weekly Performance Snapshot report',
      'Run A/B experiments on formats, lengths, and posting times',
      'Adjust your strategy based on data-driven insights',
    ],
    tips: [
      'Focus on watch-time and saves over raw view counts.',
      'Export monthly reports as PDFs for sponsors and stakeholders.',
      'Use the "Compare Periods" view to spot growth trends at a glance.',
    ],
  },
  {
    id: 'custom-event-guide',
    icon: icons.calendar,
    color: '#f97316',
    title: 'Posting Events',
    tagline: 'Publish your own event and earn — no approval needed',
    description:
      'Creator members ($40/mo) can post events directly to Studio Flow with no admin review. Your event goes live instantly in your chosen category, discoverable by all members. Upload a video, go live via RTMP/OBS, and receive donations from your audience.',
    steps: [
      'Upgrade to Creator membership ($40/mo)',
      'Go to Creator Dashboard → Post New Event',
      'Add a title, description, and category',
      'Upload a thumbnail and video (or toggle Go Live for RTMP streaming)',
      'Hit Publish — your event is live immediately',
      'Share your event link and promote across your channels',
      'Collect donations from supporters on your event page',
    ],
    tips: [
      'Open events with a donation option often attract larger audiences.',
      'Write a compelling description — it is your main sales tool.',
      'Promote your event link on your social channels well before the date.',
    ],
  },
  {
    id: 'reward-pool',
    icon: icons.gift,
    color: '#22c55e',
    title: 'Reward Pool Explained',
    tagline: 'How Studio Flow funds and distributes creator rewards',
    description:
      'The Studio Flow Reward Pool is funded by $10 from every member subscription and 100% of all donations received on the platform. The pool is distributed across active contests each month. Winners are selected manually based on like counts, engagement, creativity, and impact. Payout amounts vary depending on the size of the pool each month.',
    steps: [
      'Enter an active contest by submitting your content',
      'Share your entry and encourage your audience to like it',
      'Collect likes throughout the contest period',
      'Studio Flow reviews top entries at the end of the period',
      'Winners are selected based on likes, engagement, and creativity',
      'Payouts are issued via your submitted payout method',
    ],
    tips: [
      'Quality matters as much as quantity — a smaller but highly creative entry can win.',
      'Engage genuinely with other entries; community spirit is noticed.',
      'Check the Announcements page for reward pool updates each month.',
    ],
  },
  {
    id: 'how-likes-work',
    icon: icons.heart,
    color: '#f43f5e',
    title: 'How Likes Work',
    tagline: 'Simple, fair, and open to everyone',
    description:
      'Likes are the new voting system on Studio Flow. Every video has a Like button, users can like any video they enjoy, and each user can like a video once. Videos with the most likes rise to the top and help determine contest winners. Likes replace the old ticket-based voting system and make participation simple and fair.',
    steps: [
      'Browse contest entries or videos on the platform',
      'Click the ❤ Like button on any video you enjoy',
      'Your like is recorded — one like per video per account',
      'Like counts update in real time on each entry',
      'At the end of a contest, like counts factor into winner selection',
    ],
    tips: [
      'You can like as many different videos as you want — just one like per video.',
      'Likes are public — creators can see their total like count.',
      'Encourage your audience to like your entries to boost your standing.',
    ],
  },
  {
    id: 'posting-event-slot',
    icon: icons.upload,
    color: '#a78bfa',
    title: 'Posting to Your Event Slot',
    tagline: 'Secure, creator-controlled content uploads',
    description:
      'When your custom event request is approved, Studio Flow creates a private posting slot for you. You will receive a unique upload password, a direct link to your event slot, and instructions for uploading your video. Only you can upload content to your event slot — ensuring your event remains secure and creator-controlled.',
    steps: [
      'Receive your approval email from Studio Flow',
      'Note your unique upload password and event slot link',
      'Prepare your video in the recommended format',
      'Navigate to your event slot and enter your upload password',
      'Upload your video and add your title and description',
      'Confirm the upload and share your event link with your audience',
    ],
    tips: [
      'Upload at least 24 hours before your event goes live to allow processing time.',
      'Keep your upload password private — it is specific to your slot.',
      'Contact Studio Flow support immediately if you have any upload issues.',
    ],
  },
  {
    id: 'payout-method',
    icon: icons.send,
    color: '#fbbf24',
    title: 'Submitting Your Payout Method',
    tagline: 'How to receive your earnings from Studio Flow',
    description:
      'To receive payouts from Studio Flow — including contest rewards, custom event earnings, and donations — creators must submit their payout method information directly to Studio Flow administration. This manual verification process ensures secure payouts and accurate creator identity.',
    steps: [
      'Prepare your full name, Studio Flow username, and preferred payout method',
      'Choose your payout account: PayPal, Cash App, Venmo, Wise, or bank transfer',
      'Gather your payout account details and any required tax information',
      'Send all information to: obviouslyinspiredstudio@outlook.com',
      'Wait for confirmation from Studio Flow administration',
      'Your payout method will be on file for all future earnings',
    ],
    tips: [
      'Submit your payout details before your first contest ends to avoid delays.',
      'Double-check your account details — incorrect information can delay payouts.',
      'If your payout method changes, email Studio Flow right away to update your file.',
    ],
  },
];

const faqs = [
  {
    q: 'Is Creator Academy free to access?',
    a: 'Yes — every learning module is available to all Studio Flow users at no cost. Simply sign in and start learning.',
  },
  {
    q: 'How are contest winners chosen?',
    a: 'Winners are hand-selected by our admin team based on creativity and quality. Likes from the community are considered as a signal of engagement, but the final decision rests with the Studio Flow team.',
  },
  {
    q: 'How do I receive my contest or event earnings?',
    a: 'Submit your preferred payout method (PayPal, Cash App, Venmo, Wise, or bank transfer) to obviouslyinspiredstudio@outlook.com. Studio Flow manually verifies and issues all payouts.',
  },
  {
    q: 'How do creators earn from custom events?',
    a: 'Creators earn through viewer donations collected during their custom event. Studio Flow does not charge a platform fee on donations.',
  },
  {
    q: 'How is the monthly Reward Pool funded?',
    a: '$10 from every member subscription and 100% of all donations go directly into the Reward Pool, which is distributed to contest winners each month.',
  },
  {
    q: 'Will new modules be added to the Academy?',
    a: 'Yes — new modules are released as Studio Flow grows. Check the Announcements page for the latest Academy updates.',
  },
];

/* ─── Sub-components ─── */

function StepList({ steps, color }) {
  return (
    <ol className="ca-steps">
      {steps.map((step, i) => (
        <li key={i} className="ca-steps__item">
          <span className="ca-steps__number" style={{ background: color }}>
            {i + 1}
          </span>
          <span className="ca-steps__text">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function TipCard({ tips }) {
  return (
    <div className="ca-tips">
      <h4 className="ca-tips__heading">{icons.book} Pro Tips</h4>
      <ul className="ca-tips__list">
        {tips.map((tip, i) => (
          <li key={i} className="ca-tips__item">
            <span className="ca-tips__check">{icons.check}</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionCard({ section, index }) {
  const isEven = index % 2 === 0;

  return (
    <section className="ca-section" id={section.id}>
      <div className={`ca-section__inner ${isEven ? '' : 'ca-section__inner--reverse'}`}>
        {/* Left / main column */}
        <div className="ca-section__content">
          <div className="ca-section__badge" style={{ color: section.color, background: `${section.color}14` }}>
            {section.icon}
            <span className="ca-section__badge-label">Module {index + 1}</span>
          </div>
          <h2 className="ca-section__title">{section.title}</h2>
          <p className="ca-section__tagline" style={{ color: section.color }}>
            {section.tagline}
          </p>
          <p className="ca-section__desc">{section.description}</p>
        </div>

        {/* Right / step-by-step column */}
        <div className="ca-section__sidebar">
          <div className="ca-card">
            <h3 className="ca-card__heading">{icons.play} Step-by-Step Guide</h3>
            <StepList steps={section.steps} color={section.color} />
          </div>
          <TipCard tips={section.tips} />
        </div>
      </div>
    </section>
  );
}

function FAQItem({ faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`ca-faq__item ${open ? 'ca-faq__item--open' : ''}`}>
      <button className="ca-faq__question" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{faq.q}</span>
        <span className={`ca-faq__chevron ${open ? 'ca-faq__chevron--open' : ''}`}>{icons.chevronDown}</span>
      </button>
      {open && <p className="ca-faq__answer">{faq.a}</p>}
    </div>
  );
}

function ProgressBar({ total }) {
  return (
    <div className="ca-progress">
      <div className="ca-progress__track">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="ca-progress__dot" title={sections[i]?.title} />
        ))}
      </div>
      <p className="ca-progress__label">{total} modules to explore</p>
    </div>
  );
}

/* ─── Main Page ─── */

export default function CreatorAcademy() {
  const { user } = useAuth();

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', textAlign: 'center' }}>
      <p style={{ color: '#9CA3AF', fontSize: 18, fontWeight: 600 }}>Log in to access Creator Academy.</p>
      <a href="/login" style={{ background: 'linear-gradient(135deg, #F5C842, #D4A830)', color: '#0A0A0F', fontWeight: 700, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' }}>Log In</a>
    </div>
  );

  return (
    <div className="ca-page">
      {/* ── Hero Banner ── */}
      <header className="ca-hero">
        <div className="ca-hero__bg" aria-hidden="true">
          <div className="ca-hero__circle ca-hero__circle--1" />
          <div className="ca-hero__circle ca-hero__circle--2" />
          <div className="ca-hero__circle ca-hero__circle--3" />
        </div>

        <div className="ca-hero__content">
          <span className="ca-hero__eyebrow">Studio Flow Presents</span>
          <h1 className="ca-hero__title">Creator Academy</h1>
          <p className="ca-hero__subtitle">
            Welcome to the Creator Academy — your guide to building, growing, and thriving on Studio Flow.
            This space teaches you how to create powerful content, build your brand, understand the new
            Studio Flow creator economy, and participate in contests where winners are hand-selected by our admin team based on creativity and quality.
          </p>
          <div className="ca-hero__actions">
            <a href="#getting-started" className="ca-btn ca-btn--primary">
              Start Learning
            </a>
            <a href="#faq" className="ca-btn ca-btn--ghost">
              View FAQ
            </a>
          </div>
          <ProgressBar total={sections.length} />
        </div>
      </header>

      {/* ── Section nav pills ── */}
      <nav className="ca-nav" aria-label="Academy sections">
        <div className="ca-nav__inner">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="ca-nav__pill" style={{ '--pill-color': s.color }}>
              {s.icon}
              <span className="ca-nav__pill-label">{s.title}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ── Learning Sections ── */}
      <main className="ca-main">
        {sections.map((section, index) => (
          <SectionCard key={section.id} section={section} index={index} />
        ))}
      </main>

      {/* ── Donation callout (tied to Monetization module) ── */}
      <section style={{ maxWidth: '720px', margin: '0 auto 4rem', padding: '0 1.5rem' }}>
        <div style={{
          background: 'rgba(245,166,35,0.06)',
          border: '1px solid rgba(245,166,35,0.18)',
          borderRadius: '20px',
          padding: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontWeight: 800, fontSize: '1.1rem' }}>
              💝 Support the Reward Pool
            </h3>
            <p style={{ margin: 0, color: 'rgba(200,200,215,0.6)', fontSize: '0.9rem', maxWidth: '400px' }}>
              100% of donations go directly to the monthly creator Reward Pool — helping fund contest winners and growing the Studio Flow community.
            </p>
          </div>
          <DonationButton />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="ca-faq" id="faq">
        <h2 className="ca-faq__title">Frequently Asked Questions</h2>
        <div className="ca-faq__list">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} />
          ))}
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <footer className="ca-footer">
        <h2 className="ca-footer__title">Ready to level up?</h2>
        <p className="ca-footer__text">
          Jump into Module 1 and start building the creative career you have been dreaming about.
        </p>
        <a href="#getting-started" className="ca-btn ca-btn--primary ca-btn--lg">
          Begin Your Journey
        </a>
      </footer>
    </div>
  );
}
