import React from 'react';
import { useUpscale } from '../hooks/useUpscale';
import { FileDropZone, BeforeAfterSlider } from '../components/upscale';
import styles from './UpscalePage.module.css';

export default function UpscalePage() {
  const {
    file,
    preview,
    scaleFactor,
    setScaleFactor,
    phase,
    progress,
    error,
    result,
    selectFile,
    submit,
    cancel,
    reset,
  } = useUpscale();

  const handleDownload = async (url, suffix) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      const base = file?.name?.replace(/\.[^.]+$/, '') || 'image';
      const ext = file?.name?.split('.').pop() || 'png';
      a.href = URL.createObjectURL(blob);
      a.download = `${base}_${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.toolIcon} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>AI Upscale</h1>
            <p className={styles.subtitle}>
              Enhance image resolution up to 4× using Real-ESRGAN
            </p>
          </div>
        </div>
      </header>

      {/* Phase 1: Upload */}
      {phase === 'idle' && (
        <section className={styles.section}>
          <FileDropZone onFileSelected={selectFile} />
        </section>
      )}

      {/* Phase 2: Preview + controls */}
      {(phase === 'preview' || phase === 'uploading') && (
        <section className={styles.section}>
          <div className={styles.previewCard}>
            <img
              src={preview}
              alt="Selected image preview"
              className={styles.previewImg}
            />
            <div className={styles.controls}>
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{file?.name}</span>
                <span className={styles.fileSize}>
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                </span>
              </div>

              <div className={styles.scaleRow}>
                <span className={styles.scaleLabel}>Scale factor</span>
                <div className={styles.scaleBtns}>
                  {[2, 4].map((n) => (
                    <button
                      key={n}
                      className={`${styles.scaleBtn} ${scaleFactor === n ? styles.scaleBtnActive : ''}`}
                      onClick={() => setScaleFactor(n)}
                      disabled={phase === 'uploading'}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
              </div>

              {phase === 'uploading' ? (
                <div className={styles.uploadingRow}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className={styles.progressLabel}>
                    {progress < 100 ? `Uploading… ${progress}%` : 'Processing with AI…'}
                  </span>
                  <button className={styles.cancelBtn} onClick={cancel}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className={styles.actionRow}>
                  <button className={styles.upscaleBtn} onClick={submit}>
                    ✨ Upscale {scaleFactor}×
                  </button>
                  <button className={styles.changeBtn} onClick={reset}>
                    Change file
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Error */}
      {(error && phase !== 'uploading') && (
        <div className={styles.errorBanner} role="alert">
          <span>⚠</span>
          <span>{error}</span>
          <button className={styles.errorDismiss} onClick={reset}>
            Try Again
          </button>
        </div>
      )}

      {/* Phase 3: Result */}
      {phase === 'done' && result && (
        <section className={styles.section}>
          <div className={styles.resultMeta}>
            <span className={styles.savedBadge}>✓ Saved to AI Outputs</span>
            {result.resolution && (
              <span className={styles.resMeta}>Output: {result.resolution}</span>
            )}
            {result.srcResolution && (
              <span className={styles.resMeta}>Source: {result.srcResolution}</span>
            )}
          </div>

          <BeforeAfterSlider
            beforeSrc={result.originalUrl ?? preview}
            afterSrc={result.upscaledUrl}
            alt={file?.name}
          />

          <div className={styles.resultActions}>
            <button
              className={styles.downloadPrimary}
              onClick={() => handleDownload(result.upscaledUrl, `upscaled_${scaleFactor}x`)}
            >
              ⬇ Download Upscaled
            </button>
            <button className={styles.newFileBtn} onClick={reset}>
              + Upscale Another Image
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
