import { useState } from 'react';

export default function ThumbnailPicker({ onThumbnailSelected }) {
  const [preview, setPreview] = useState(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    onThumbnailSelected(file);
  }

  function remove() {
    setPreview(null);
    onThumbnailSelected(null);
  }

  return (
    <div className="cinematic-card cinematic-dropzone cinematic-hover" style={{ padding: '1rem' }}>
      {!preview && (
        <label style={{ cursor: 'pointer', display: 'block', textAlign: 'center' }}>
          <div>Drag & Drop Thumbnail</div>
          <div>or click to upload</div>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </label>
      )}

      {preview && (
        <div className="cinematic-thumbnail">
          <img src={preview} alt="thumbnail preview" style={{ width: '100%', borderRadius: '8px' }} />
          <button className="cinematic-button" onClick={remove} style={{ marginTop: '0.5rem' }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
