import { useState, useCallback, useRef } from 'react';
import { uploadForUpscale } from '../api/upscaleApi';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function validate(file) {
  if (!file) return 'No file selected.';
  if (!ALLOWED_TYPES.has(file.type))
    return `Unsupported type "${file.type}". Use PNG, JPEG, or WebP.`;
  if (file.size > MAX_SIZE)
    return `File exceeds 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  return null;
}

/**
 * State machine: idle → preview → uploading → done | error
 */
export function useUpscale() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);      // data-URL for the source image
  const [scaleFactor, setScaleFactor] = useState(4);
  const [phase, setPhase] = useState('idle');          // idle | preview | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const abortRef = useRef(null);

  const selectFile = useCallback((f) => {
    const err = validate(f);
    if (err) { setError(err); return; }

    setFile(f);
    setError(null);
    setResult(null);
    setProgress(0);

    // Generate preview data-URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setPhase('preview');
    };
    reader.readAsDataURL(f);
  }, []);

  const submit = useCallback(async () => {
    if (!file) return;
    const err = validate(file);
    if (err) { setError(err); return; }

    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('uploading');
    setError(null);
    setProgress(0);

    try {
      const data = await uploadForUpscale(file, scaleFactor, controller.signal, setProgress);
      setResult(data);
      setPhase('done');
    } catch (e) {
      if (e.message === 'Upload cancelled.') {
        setPhase('preview');
      } else {
        setError(e.message || 'An unexpected error occurred.');
        setPhase('error');
      }
    } finally {
      abortRef.current = null;
    }
  }, [file, scaleFactor]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setPreview(null);
    setScaleFactor(4);
    setPhase('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
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
  };
}
