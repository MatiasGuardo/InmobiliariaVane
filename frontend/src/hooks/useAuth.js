import { useState, useCallback, useEffect } from 'react';

/**
 * Hook de Autenticación para InmobiliariaVane
 * 
 * Maneja:
 * - Login con tenant, email, password
 * - Logout
 * - Persistencia de token en localStorage
 * - Validación de token
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicializar desde localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    const storedTenant = localStorage.getItem('authTenant');

    if (storedToken && storedUser && storedTenant) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setTenant(JSON.parse(storedTenant));
      } catch (err) {
        console.error('Error al restaurar auth:', err);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('authTenant');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Login: email + password + tenant
   * Retorna: { token, usuario, tenantId, tenantNombre }
   */
  const login = useCallback(async (tenantName, email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenantName,
          email,
          password,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('Error parsing response:', parseErr);
        console.error('Response status:', response.status);
        throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al autenticar');
      }

      const { token: newToken, usuario, tenantId, tenantNombre } = data;

      // Guardar en estado
      setToken(newToken);
      setUser(usuario);
      setTenant({ id: tenantId, nombre: tenantNombre });

      // Guardar en localStorage
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(usuario));
      localStorage.setItem('authTenant', JSON.stringify({ id: tenantId, nombre: tenantNombre }));

      return { token: newToken, usuario, tenantId, tenantNombre };
    } catch (err) {
      const errorMsg = err.message || 'Error al autenticar';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout: limpia token y usuario
   */
  const logout = useCallback(() => {
    setUser(null);
    setTenant(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authTenant');
  }, []);

  /**
   * Register: crea nuevo usuario en un tenant
   * Body: { tenant, email, password, nombre }
   */
  const register = useCallback(async (tenantName, email, password, nombre) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenantName,
          email,
          password,
          nombre,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al registrar');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err.message || 'Error al registrar';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene el token JWT actual
   */
  const getToken = useCallback(() => {
    return token;
  }, [token]);

  /**
   * Verifica si el usuario está autenticado
   */
  const isAuthenticated = useCallback(() => {
    return !!token && !!user;
  }, [token, user]);

  /**
   * Retorna headers con Authorization si hay token
   */
  const getAuthHeaders = useCallback(() => {
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [token]);

  return {
    user,
    tenant,
    token,
    loading,
    error,
    login,
    logout,
    register,
    getToken,
    isAuthenticated,
    getAuthHeaders,
  };
}

export default useAuth;
