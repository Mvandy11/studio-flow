import { useState, useEffect, useCallback } from 'react';
import { fetchAiOutputs, deleteAiOutput } from '../services/libraryApi';

export default function useAiOutputs({ tool = null, limit = 50 } = {}) {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [offset,  setOffset]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await fetchAiOutputs({ tool, limit, offset });
      setItems(data);
      setTotal(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tool, limit, offset]);

  useEffect(() => { load(); }, [load]);

  const nextPage = () => { if (offset + limit < total) setOffset((o) => o + limit); };
  const prevPage = () => { setOffset((o) => Math.max(0, o - limit)); };

  const remove = useCallback(async (id, storagePath) => {
    await deleteAiOutput(id, storagePath);
    load();
  }, [load]);

  return {
    items,
    total,
    loading,
    error,
    page:       Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    nextPage,
    prevPage,
    refresh: load,
    remove,
  };
}
