import React from 'react';
import styles from './AudioPlayerComparison.module.css';

export default function AudioPlayerComparison({ originalUrl, cleanedUrl, fileName }) {
  const handleDownload = async (url, suffix) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const anchor = document.createElement('a');
      const ext = fileName?.split('.').pop() || 'wav';
      const base = fileName?.replace(/\.[^.]+$/, '') || 'audio';
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${base}_${suffix}.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);
    } catch { window.open(url, '_blank'); }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.playerCard}>
        <div className={styles.cardHeader}>
          <span className={styles.badge}>Original</span>
          <span className={styles.fileName} title={fileName}>{fileName}</span>
        </div>
        <audio controls src={originalUrl} className={styles.audio} preload="metadata" />
        <button className={styles.downloadBtn}
          onClick={() => handleDownload(originalUrl, 'original')}>
          ⬇ Download Original
        </button>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.playerCard}>
        <div className={styles.cardHeader}>
          <span className={`${styles.badge} ${styles.badgeCleaned}`}>Cleaned</span>
          <span className={styles.fileName}>
            {fileName} <span className={styles.tag}>denoised</span>
          </span>
        </div>
        <audio controls src={cleanedUrl} className={styles.audio} preload="metadata" />
        <button className={`${styles.downloadBtn} ${styles.downloadPrimary}`}
          onClick={() => handleDownload(cleanedUrl, 'cleaned')}>
          ⬇ Download Cleaned
        </button>
      </div>
    </div>
  );
}
