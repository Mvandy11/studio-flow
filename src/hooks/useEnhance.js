import { useState, useCallback, useRef } from 'react';
import { enhanceImage } from '../services/enhanceApi';

export default function useEnhance() {
  const [file,        setFileState]   = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [metadata,    setMetadata]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const abortRef = useRef(null);

  const setFile = useCallback((f) => {
    if (preview) URL.revokeObjectURL(preview);
    setFileState(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setResultImage(null);
    setMetadata(null);
    setError(null);
  }, [preview]);

  const enhance = useCallback(async (options = {}) => {
    if (!file) { setError('Please select an image first.'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResultImage(null);
    setMetadata(null);

    try {
      const data = await enhanceImage(file, { ...options, signal: controller.signal });
      setResultImage(data.image);
      setMetadata(data.metadata);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Enhancement failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (preview) URL.revokeObjectURL(preview);
    setFileState(null);
    setPreview(null);
    setResultImage(null);
    setMetadata(null);
    setLoading(false);
    setError(null);
  }, [preview]);

  return { file, preview, resultImage, metadata, loading, error, setFile, enhance, reset };
}
