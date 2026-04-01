import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../App.css';

export default function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({
    tenant: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar campos
      if (!form.tenant.trim()) {
        setError('Ingrese el nombre de la inmobiliaria');
        setLoading(false);
        return;
      }
      if (!form.email.trim()) {
        setError('Ingrese su email');
        setLoading(false);
        return;
      }
      if (!form.email.includes('@')) {
        setError('Email inválido');
        setLoading(false);
        return;
      }
      if (!form.password) {
        setError('Ingrese su contraseña');
        setLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setError('La contraseña debe tener mínimo 6 caracteres');
        setLoading(false);
        return;
      }

      // Intentar login
      await login(form.tenant, form.email, form.password);
      
      // Si fue exitoso, notificar al padre (App.jsx)
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">InmobiliariaVane</h1>
          <p className="text-gray-600">Ingrese a su cuenta</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Campo Tenant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Inmobiliaria
            </label>
            <input
              type="text"
              name="tenant"
              value={form.tenant}
              onChange={handleChange}
              placeholder="ej: Default Tenant"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="usuario@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Botón Login */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-medium text-white transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? 'Autenticando...' : 'Ingresar'}
          </button>
        </form>

        {/* Pie */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Para testing:</p>
          <p className="font-mono text-xs mt-2 bg-gray-50 p-2 rounded">
            Tenant: Default Tenant<br/>
            Email: admin@localhost<br/>
            Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}
