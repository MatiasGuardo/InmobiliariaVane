import { useState, useEffect } from "react";
import { API } from "../utils/helpers";

/**
 * Hook genérico para consumir endpoints de la API.
 * Retorna { data, setData, loading, error, reload }
 */
export function useApi(endpoint) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);

  return { data, setData, loading, error, reload: load };
}