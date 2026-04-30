import { useState } from 'react';
import useAiOutputs from '../../hooks/useAiOutputs';
import AiOutputCard from './AiOutputCard';

const TOOL_FILTERS = [
  { value: null,      label: 'All' },
  { value: 'enhance', label: 'Enhance' },
  { value: 'denoise', label: 'Denoise' },
  { value: 'upscale', label: 'Upscale' },
];

export default function AiOutputsGrid() {
  const [activeTool, setActiveTool] = useState(null);
  const { items, loading, error, page, totalPages, nextPage, prevPage, remove } =
    useAiOutputs({ tool: activeTool });

  return (
    <div className="ai-grid-container">
      <div className="ai-grid__filters">
        {TOOL_FILTERS.map((f) => (
          <button
            key={f.value ?? 'all'}
            className={`ai-grid__filter ${activeTool === f.value ? 'ai-grid__filter--active' : ''}`}
            onClick={() => setActiveTool(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="ai-grid__error">Failed to load outputs: {error}</p>}

      {loading && (
        <div className="ai-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ai-card ai-card--skeleton" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="ai-grid__empty">
          <p>No AI outputs yet.</p>
          <p className="ai-grid__empty-hint">
            Enhanced images will appear here automatically after processing.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="ai-grid">
            {items.map((item) => (
              <AiOutputCard key={item.id} item={item} onDelete={remove} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="ai-grid__pagination">
              <button className="btn btn--secondary btn--sm"
                disabled={page <= 1} onClick={prevPage}>← Previous</button>
              <span className="ai-grid__page">Page {page} of {totalPages}</span>
              <button className="btn btn--secondary btn--sm"
                disabled={page >= totalPages} onClick={nextPage}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
