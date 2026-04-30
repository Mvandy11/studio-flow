import { useCallback, useRef, useState } from 'react';

export default function BeforeAfterComparison({ before, after }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    updatePosition(e.clientX);
    containerRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove   = (e) => { if (!dragging) return; updatePosition(e.clientX); };
  const onPointerUp     = () => setDragging(false);

  if (!before || !after) return null;

  return (
    <div className="comparison-wrapper">
      <div className="comparison-labels">
        <span className="comparison-label">Original</span>
        <span className="comparison-label">Enhanced</span>
      </div>
      <div
        ref={containerRef} className="comparison"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        <img src={after} alt="Enhanced" className="comparison__img" draggable={false} />
        <div className="comparison__before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img src={before} alt="Original" className="comparison__img" draggable={false} />
        </div>
        <div className="comparison__slider" style={{ left: `${position}%` }}>
          <div className="comparison__line" />
          <div className="comparison__handle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
