import { useState, useEffect, useContext } from "react";
import { API } from "../utils/helpers";

// AuthContext será creado en App.jsx
export const AuthContext = import.meta.env.DEV ? null : null;

export function useApi(endpoint) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener token del localStorage si existe
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API}${endpoint}`, {
        headers,
      });
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