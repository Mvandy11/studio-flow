import React, { useState } from 'react';
import './CreatorAcademy.css';

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
      'Create your Studio Flow account & choose a plan',
      'Connect social accounts and content platforms',
      'Customise your dashboard layout & notification preferences',
      'Explore the asset library and template gallery',
    ],
    tips: [
      'Start with the free tier to explore features before upgrading.',
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
      "Choose the right microphone and recording environment",
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
      'Limit your palette to 3-5 colors so assets feel cohesive at a glance.',
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
      'Engage with comments and DMs through the Inbox Hub',
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
    title: 'Monetization Strategies',
    tagline: 'Earn sustainably from your creative work',
    description:
      "Explore ad revenue, sponsorships, memberships, digital products, and affiliate marketing. Learn how to price your work, pitch to brands, and track income streams inside Studio Flow's Revenue Dashboard.",
    steps: [
      'Enable platform monetization (ads, tips, subscriptions)',
      "Build a media kit with Studio Flow's Sponsor Toolkit",
      'Launch a membership tier or paid community',
      'Create and sell digital products (presets, templates, courses)',
      'Track all revenue streams in the unified Revenue Dashboard',
    ],
    tips: [
      'Diversify income — never rely on a single revenue source.',
      'Disclose sponsorships clearly; transparency builds trust and loyalty.',
      'Set quarterly revenue goals and review them in Analytics.',
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
];

const faqs = [
  {
    q: 'Is Creator Academy included with my Studio Flow plan?',
    a: 'Yes — every learning module is available on all plans, including the free tier. Premium plans unlock bonus masterclass videos and downloadable workbooks.',
  },
  {
    q: 'How long does it take to complete all seven sections?',
    a: 'Each section takes roughly 30-45 minutes to read through. You can complete the full academy in about 4-5 hours, though we recommend spacing it over a week so you can apply each lesson.',
  },
  {
    q: 'Can I earn a certificate?',
    a: 'Absolutely. Complete all seven sections and pass the short quiz at the end of each to earn a verified Creator Academy Certificate you can share on your profile and social media.',
  },
  {
    q: 'Will new sections be added?',
    a: 'We release new modules and update existing ones every quarter based on platform changes and community feedback. Star the sections you would like to see next!',
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
            Everything you need to plan, create, grow, and monetize — in one guided learning path.
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
