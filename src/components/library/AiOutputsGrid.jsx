import React, { useEffect, useState, useCallback } from 'react';
import AiOutputCard from './AiOutputCard';
import { fetchAiOutputs } from '../../api/upscaleApi';
import styles from './AiOutputsGrid.module.css';

const FILTERS = [
  { id: null, label: 'All' },
  { id: 'denoise', label: 'Denoise' },
  { id: 'upscale', label: 'Upscale' },
];

export default function AiOutputsGrid() {
  const [activeFilter, setActiveFilter] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAiOutputs(activeFilter);
      setOutputs(data.outputs ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.container}>
      {/* Filter pills */}
      <div className={styles.filters} role="group" aria-label="Filter by tool">
        {FILTERS.map((f) => (
          <button
            key={String(f.id)}
            className={`${styles.pill} ${activeFilter === f.id ? styles.pillActive : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <button className={styles.refreshBtn} onClick={load} aria-label="Refresh">↻</button>
      </div>

      {/* States */}
      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Failed to load outputs</p>
          <p className={styles.emptyHint}>{error}</p>
          <button className={styles.retryBtn} onClick={load}>Retry</button>
        </div>
      )}

      {!isLoading && !error && outputs.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No AI outputs yet</p>
          <p className={styles.emptyHint}>
            Files processed by AI tools (Denoise, Upscale) will appear here automatically.
          </p>
        </div>
      )}

      {!isLoading && !error && outputs.length > 0 && (
        <>
          <p className={styles.count}>
            {outputs.length} file{outputs.length !== 1 ? 's' : ''}
          </p>
          <div className={styles.grid}>
            {outputs.map((item) => (
              <AiOutputCard key={item.id} {...item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
