import React from 'react';
import FileUploader from './FileUploader';
import AudioPlayerComparison from './AudioPlayerComparison';
import { useDenoiseUpload } from '../hooks/useDenoiseUpload';
import styles from './DenoiseToolPage.module.css';
import { useAuth } from '../../../hooks/useAuth';

export default function DenoiseToolPage() {
  const { user } = useAuth();
  const { file, isUploading, progress, error, result, upload, reset } = useDenoiseUpload();

  if (!user) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <p className="text-gray-400">Log in to access this feature.</p>
      <a href="/login" className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold">Log In</a>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.toolIcon} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h2l3-9 4 18 4-18 3 9h2" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>AI Denoise</h1>
            <p className={styles.subtitle}>Remove background noise from audio and video files using AI</p>
          </div>
        </div>
      </header>

      {!result && (
        <section className={styles.uploadSection}>
          <FileUploader onFileSelected={upload} isUploading={isUploading} progress={progress} />
          {file && !isUploading && !error && (
            <p className={styles.selectedFile}>
              Selected: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </section>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>⚠</span> <span>{error}</span>
          <button className={styles.errorDismiss} onClick={reset}>Try Again</button>
        </div>
      )}

      {result && (
        <section className={styles.resultSection}>
          <div className={styles.savedIndicator}>✓ Saved to AI Outputs</div>
          <AudioPlayerComparison
            originalUrl={result.originalFileUrl}
            cleanedUrl={result.cleanedFileUrl}
            fileName={file?.name}
          />
          <button className={styles.newFileBtn} onClick={reset}>+ Denoise Another File</button>
        </section>
      )}
    </div>
  );
}
