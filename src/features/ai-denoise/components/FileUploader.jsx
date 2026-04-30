import React, { useRef, useState, useCallback } from 'react';
import styles from './FileUploader.module.css';

export default function FileUploader({ onFileSelected, isUploading, progress, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (f) => { if (f && !isUploading && !disabled) onFileSelected(f); },
    [onFileSelected, isUploading, disabled],
  );

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer?.files?.[0]);
  }, [handleFile]);

  const zoneClass = [
    styles.dropzone,
    isDragging ? styles.dragging : '',
    isUploading ? styles.uploading : '',
    disabled ? styles.disabled : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={zoneClass}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !isUploading && !disabled && inputRef.current?.click()}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Upload audio or video file"
    >
      <input ref={inputRef} type="file" accept="audio/*,video/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className={styles.hiddenInput} disabled={isUploading || disabled} />

      {isUploading ? (
        <div className={styles.progressWrapper}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>
            {progress < 100 ? `Uploading… ${progress}%` : 'Processing…'}
          </span>
        </div>
      ) : (
        <>
          <div className={styles.icon} aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className={styles.label}>
            Drag & drop an audio or video file here, or <span className={styles.browseLink}>browse</span>
          </p>
          <p className={styles.hint}>Supported: MP3, WAV, OGG, FLAC, AAC, MP4, WebM, MOV · Max 500 MB</p>
        </>
      )}
    </div>
  );
}
