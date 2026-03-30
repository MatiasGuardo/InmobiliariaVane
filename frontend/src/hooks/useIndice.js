// frontend/src/hooks/useIndice.js
import { useState, useEffect, useCallback } from "react";
import { API } from "../utils/helpers";

export function useIndice(tipo) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!tipo || tipo === "FIJO") { setRows([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/indices/${tipo}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, reload: load };
}