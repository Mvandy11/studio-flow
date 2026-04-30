import React from 'react';
import styles from './AiOutputCard.module.css';

const TOOL_COLORS = {
  denoise: { bg: 'rgba(124,58,237,0.15)', color: '#c4b5fd', label: 'Denoise' },
  upscale: { bg: 'rgba(34,197,94,0.15)', color: '#86efac', label: 'Upscale' },
};

export default function AiOutputCard({ filename, tool, createdAt, resolution, size, url }) {
  const badge = TOOL_COLORS[tool] ?? { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: tool };
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : '—';
  const formattedSize =
    size > 1_048_576
      ? `${(size / 1_048_576).toFixed(1)} MB`
      : size > 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : '—';

  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper} aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <div className={styles.meta}>
        <span className={styles.filename} title={filename}>{filename}</span>
        <div className={styles.details}>
          <span
            className={styles.badge}
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
          <span>·</span>
          <span>{formattedDate}</span>
          {resolution && <><span>·</span><span>{resolution}</span></>}
          {size > 0 && <><span>·</span><span>{formattedSize}</span></>}
        </div>
      </div>
      <a
        href={url}
        download={filename}
        className={styles.downloadBtn}
        onClick={(e) => e.stopPropagation()}
        title="Download"
        aria-label={`Download ${filename}`}
      >
        ⬇
      </a>
    </div>
  );
}
