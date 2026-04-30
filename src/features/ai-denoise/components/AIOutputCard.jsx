import React from 'react';
import styles from './AIOutputCard.module.css';

export default function AIOutputCard({ name, toolName, createdAt, size, publicUrl, onPlay, onDelete }) {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const formattedSize = size > 1048576 ? `${(size / 1048576).toFixed(1)} MB`
    : size > 1024 ? `${(size / 1024).toFixed(1)} KB` : '—';

  return (
    <div className={styles.card} onClick={() => onPlay?.(publicUrl)} role="button" tabIndex={0}>
      <div className={styles.iconWrapper} aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <div className={styles.meta}>
        <span className={styles.fileName} title={name}>{name}</span>
        <div className={styles.details}>
          <span className={styles.toolBadge}>{toolName}</span>
          <span>·</span><span>{formattedDate}</span><span>·</span><span>{formattedSize}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <a href={publicUrl} download={name} className={styles.actionBtn}
          onClick={(e) => e.stopPropagation()} title="Download">⬇</a>
        {onDelete && (
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">🗑</button>
        )}
      </div>
    </div>
  );
}
