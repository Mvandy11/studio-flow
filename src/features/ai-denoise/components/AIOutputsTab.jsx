import React, { useEffect, useState, useCallback } from 'react';
import AIOutputCard from './AIOutputCard';
import { fetchDenoiseOutputs, deleteDenoiseOutput } from '../services/aiOutputsService';
import styles from './AIOutputsTab.module.css';

export default function AIOutputsTab({ userId, onPlay }) {
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true); setError(null);
    try { setOutputs(await fetchDenoiseOutputs(userId)); }
    catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (fullPath, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDenoiseOutput(fullPath);
      setOutputs((prev) => prev.filter((o) => o.fullPath !== fullPath));
    } catch (err) { alert(`Failed to delete: ${err.message}`); }
  }, []);

  if (isLoading) return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
    </div>
  );

  if (error) return (
    <div className={styles.emptyState}>
      <p>Failed to load AI outputs.</p><p>{error}</p>
      <button className={styles.retryBtn} onClick={load}>Retry</button>
    </div>
  );

  if (outputs.length === 0) return (
    <div className={styles.emptyState}>
      <p className={styles.emptyText}>No AI outputs yet</p>
      <p className={styles.emptyHint}>Files processed by AI tools will appear here automatically.</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.count}>{outputs.length} file{outputs.length !== 1 ? 's' : ''}</span>
        <button className={styles.refreshBtn} onClick={load} aria-label="Refresh list">↻</button>
      </div>
      <div className={styles.grid}>
        {outputs.map((item) => (
          <AIOutputCard key={item.id} {...item}
            onPlay={onPlay} onDelete={() => handleDelete(item.fullPath, item.name)} />
        ))}
      </div>
    </div>
  );
}
