import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from './BeforeAfterSlider.module.css';

/**
 * Draggable before/after comparison slider.
 * "Before" image is clipped to the left of the divider; "after" is full width behind it.
 */
export default function BeforeAfterSlider({ beforeSrc, afterSrc, alt = 'Image comparison' }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50); // percent from left
  const isDragging = useRef(false);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    setPosition(pct);
  }, []);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') setPosition((p) => clamp(p - 2, 0, 100));
    if (e.key === 'ArrowRight') setPosition((p) => clamp(p + 2, 0, 100));
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* After (full width, sits behind) */}
      <img src={afterSrc} alt={`${alt} — after`} className={styles.img} draggable={false} />

      {/* Before (clipped to left of slider) */}
      <div className={styles.beforeWrapper} style={{ width: `${position}%` }}>
        <img src={beforeSrc} alt={`${alt} — before`} className={styles.img} draggable={false} />
      </div>

      {/* Divider handle */}
      <div
        className={styles.divider}
        style={{ left: `${position}%` }}
        role="slider"
        aria-label="Comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className={styles.handle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className={`${styles.label} ${styles.labelBefore}`}>Before</span>
      <span className={`${styles.label} ${styles.labelAfter}`}>After</span>
    </div>
  );
}
