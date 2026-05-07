import React, { useState } from 'react';
import './Tools.css';

/* ─── Tool definitions ─── */
const tools = [
  {
    id: 'ai-denoise',
    category: 'Audio',
    label: 'AI Denoise',
    tagline: 'Remove background hiss, hum, and noise in seconds.',
    description:
      'Upload any audio or video file and our AI model strips unwanted background noise while preserving the clarity of your voice or instrument.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tool-icon">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    ),
    color: '#f59e0b',
    badge: 'Coming Soon',
    accepts: 'MP3, WAV, MP4, MOV',
  },
  {
    id: 'ai-upscale',
    category: 'Video',
    label: 'AI Upscale',
    tagline: 'Enhance video resolution up to 4K with AI super-resolution.',
    description:
      'Breathe new life into older footage. Our upscaler reconstructs fine detail, sharpens edges, and outputs broadcast-ready video at higher resolutions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tool-icon">
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>
      </svg>
    ),
    color: '#6366f1',
    badge: 'Coming Soon',
    accepts: 'MP4, MOV, MKV',
  },
  {
    id: 'ai-enhance',
    category: 'Video',
    label: 'AI Enhance',
    tagline: 'Auto color grade and stabilize your footage.',
    description:
      'One click to fix exposure, apply cinematic color grading, and reduce camera shake — all powered by a model trained on professional filmmaking data.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tool-icon">
        <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
        <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
        <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
        <circle cx="6.5" cy="12" r="0.5" fill="currentColor"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
    ),
    color: '#ec4899',
    badge: 'Coming Soon',
    accepts: 'MP4, MOV',
  },
  {
    id: 'audio-cleanup',
    category: 'Audio',
    label: 'Audio Cleanup',
    tagline: 'EQ, compress, and normalize for broadcast-ready sound.',
    description:
      'Automatically balance levels, apply a gentle high-pass filter, compress dynamics, and loudness-normalize to -14 LUFS for streaming platforms.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tool-icon">
        <line x1="12" y1="20" x2="12" y2="10"/>
        <line x1="18" y1="20" x2="18" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="16"/>
      </svg>
    ),
    color: '#10b981',
    badge: 'Coming Soon',
    accepts: 'MP3, WAV, FLAC, AAC',
  },
  {
    id: 'video-tools',
    category: 'Video',
    label: 'Video Tools',
    tagline: 'Trim, convert, compress, and caption your videos.',
    description:
      'A full suite of essential video utilities — trim clips, convert between formats, compress for web delivery, and auto-generate captions with timestamps.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tool-icon">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
        <line x1="7" y1="2" x2="7" y2="22"/>
        <line x1="17" y1="2" x2="17" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="2" y1="7" x2="7" y2="7"/>
        <line x1="2" y1="17" x2="7" y2="17"/>
        <line x1="17" y1="17" x2="22" y2="17"/>
        <line x1="17" y1="7" x2="22" y2="7"/>
      </svg>
    ),
    color: '#0ea5e9',
    badge: 'Coming Soon',
    accepts: 'MP4, MOV, MKV, AVI, WebM',
  },
];

const categories = ['All', 'Audio', 'Video'];

/* ─── ToolCard ─── */
function ToolCard({ tool }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`tool-card${hovered ? ' tool-card--hovered' : ''}`}
      style={{ '--tool-color': tool.color }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="tool-card__header">
        <div className="tool-card__icon-wrap" style={{ background: `${tool.color}14`, color: tool.color }}>
          {tool.icon}
        </div>
        <div>
          <span className="tool-card__category">{tool.category}</span>
          <span className="tool-card__badge">{tool.badge}</span>
        </div>
      </div>

      <h3 className="tool-card__title" style={{ color: tool.color }}>{tool.label}</h3>
      <p className="tool-card__tagline">{tool.tagline}</p>
      <p className="tool-card__desc">{tool.description}</p>

      <div className="tool-card__footer">
        <span className="tool-card__accepts">
          <strong>Accepts:</strong> {tool.accepts}
        </span>
        <button className="tool-card__cta" style={{ borderColor: tool.color, color: tool.color }} disabled>
          Coming Soon
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Tools() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? tools
    : tools.filter((t) => t.category === activeCategory);

  return (
    <div className="tools-page">
      {/* ── Hero ── */}
      <header className="tools-hero">
        <div className="tools-hero__bg" aria-hidden="true">
          <div className="tools-hero__orb tools-hero__orb--1" />
          <div className="tools-hero__orb tools-hero__orb--2" />
        </div>
        <div className="tools-hero__content">
          <span className="tools-hero__eyebrow">Studio Flow</span>
          <h1 className="tools-hero__title">Creator Tools</h1>
          <p className="tools-hero__subtitle">
            Powerful AI-assisted tools for audio cleanup, video enhancement, and more —
            built directly into your Studio Flow workspace.
          </p>
          <div className="tools-hero__status">
            <span className="tools-status-dot" />
            AI engine in development — tools unlock with your subscription
          </div>
        </div>
      </header>

      {/* ── Category filter ── */}
      <div className="tools-filter">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`tools-filter__btn${activeCategory === cat ? ' tools-filter__btn--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Tool grid ── */}
      <main className="tools-grid">
        {filtered.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </main>

      {/* ── Bottom CTA ── */}
      <section className="tools-cta">
        <h2 className="tools-cta__title">More tools coming soon</h2>
        <p className="tools-cta__text">
          Join Studio Flow to be the first to unlock new AI tools as they launch.
        </p>
      </section>
    </div>
  );
}
