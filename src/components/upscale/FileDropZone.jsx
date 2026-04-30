import React, { useRef, useState, useCallback } from 'react';
import styles from './FileDropZone.module.css';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_SIZE = 10 * 1024 * 1024;

export default function FileDropZone({ onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleFile = useCallback(
    (f) => {
      if (!f || disabled) return;
      if (!ALLOWED_TYPES.has(f.type)) {
        setValidationError(`Unsupported type "${f.type}". Use PNG, JPEG, or WebP.`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setValidationError(`File exceeds 10 MB (${(f.size / 1024 / 1024).toFixed(1)} MB).`);
        return;
      }
      setValidationError(null);
      onFileSelected(f);
    },
    [onFileSelected, disabled]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer?.files?.[0]);
    },
    [handleFile]
  );

  const zoneClass = [
    styles.zone,
    isDragging ? styles.dragging : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <div
        className={zoneClass}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload an image file"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className={styles.hiddenInput}
          disabled={disabled}
        />
        <div className={styles.icon} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <p className={styles.label}>
          Drag & drop an image here, or <span className={styles.browse}>browse</span>
        </p>
        <p className={styles.hint}>PNG · JPEG · WebP · Max 10 MB</p>
      </div>
      {validationError && (
        <p className={styles.error} role="alert">{validationError}</p>
      )}
    </div>
  );
}
