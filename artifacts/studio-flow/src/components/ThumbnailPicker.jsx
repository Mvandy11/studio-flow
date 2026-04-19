import { useState, useRef } from 'react';

export default function ThumbnailPicker({ onThumbnailSelected }) {
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onThumbnailSelected(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleChange(e) {
    handleFile(e.target.files[0]);
  }

  function handleReset() {
    setPreview(null);
    onThumbnailSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className={`cinematic-card cinematic-fade${dragging ? ' cinematic-hover' : ''}`}
      style={{
        border: dragging
          ? '2px dashed var(--accent-blue)'
          : '2px dashed rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '1.5rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !preview && inputRef.current?.click()}
    >
      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <img
            src={preview}
            alt="Thumbnail preview"
            style={{
              width: '100%',
              maxHeight: '180px',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
          <button
            className="cinematic-button"
            style={{ marginTop: '0.8rem' }}
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div style={{ opacity: 0.6 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
          <p style={{ margin: 0 }}>Drag & drop or click to upload a thumbnail</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
