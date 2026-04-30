import { useCallback, useRef, useState } from 'react';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE  = 20 * 1024 * 1024;

export default function ImageDropzone({ onFileSelect, disabled = false }) {
  const inputRef   = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const validate = (file) => {
    if (!ACCEPTED.includes(file.type)) return 'Only PNG, JPEG, and WebP files are supported.';
    if (file.size > MAX_SIZE)           return 'File must be under 20 MB.';
    return null;
  };

  const handleFile = useCallback((file) => {
    const err = validate(file);
    if (err) { alert(err); return; }
    onFileSelect(file);
  }, [onFileSelect]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragActive(true); };
  const onDragLeave = ()  => setDragActive(false);
  const onClick     = ()  => { if (!disabled) inputRef.current?.click(); };
  const onChange    = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      className={['dropzone', dragActive ? 'dropzone--active' : '', disabled ? 'dropzone--disabled' : ''].join(' ')}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} onChange={onChange} hidden />
      <div className="dropzone__icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="dropzone__label">
        {disabled ? 'Processing…' : 'Drag & drop an image here, or click to browse'}
      </p>
      <p className="dropzone__hint">PNG, JPEG, WebP — max 20 MB</p>
    </div>
  );
}
