import { useState } from 'react';

const QUALITY_OPTIONS = [
  { value: 'auto',   label: 'Auto' },
  { value: 'low',    label: 'Low (fastest)' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High (best)' },
];

const SIZE_OPTIONS = [
  { value: 'auto',      label: 'Auto' },
  { value: '1024x1024', label: '1024 × 1024' },
  { value: '1536x1024', label: '1536 × 1024' },
  { value: '1024x1536', label: '1024 × 1536' },
];

export default function EnhanceToolbar({ onEnhance, onReset, hasFile, hasResult, loading }) {
  const [quality, setQuality] = useState('high');
  const [size,    setSize]    = useState('auto');

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <label className="toolbar__label" htmlFor="enhance-quality">Quality</label>
        <select id="enhance-quality" className="toolbar__select" value={quality}
          onChange={(e) => setQuality(e.target.value)} disabled={loading}>
          {QUALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="toolbar__group">
        <label className="toolbar__label" htmlFor="enhance-size">Output Size</label>
        <select id="enhance-size" className="toolbar__select" value={size}
          onChange={(e) => setSize(e.target.value)} disabled={loading}>
          {SIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="toolbar__actions">
        <button className="btn btn--primary"
          onClick={() => onEnhance({ quality, size })}
          disabled={!hasFile || loading}>
          {loading
            ? <><span className="spinner" aria-hidden="true" />Enhancing…</>
            : 'Enhance'}
        </button>
        {hasResult && (
          <button className="btn btn--secondary" onClick={onReset} disabled={loading}>
            New Image
          </button>
        )}
      </div>
    </div>
  );
}
