import { useState } from 'react';
import '../App.css';

// ✅ Recibe `auth` desde App.jsx — no llama useAuth() propio
export default function Login({ auth }) {
  const [form, setForm] = useState({
    tenant: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!form.tenant.trim())         return setError('Ingrese el nombre de la inmobiliaria');
    if (!form.email.trim())          return setError('Ingrese su email');
    if (!form.email.includes('@'))   return setError('Email inválido');
    if (!form.password)              return setError('Ingrese su contraseña');
    if (form.password.length < 6)   return setError('La contraseña debe tener mínimo 6 caracteres');

    setLoading(true);
    try {
      // ✅ Usa el login del auth que viene de App — cuando resuelve,
      // auth.user se actualiza y App re-renderiza automáticamente
      await auth.login(form.tenant, form.email, form.password);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">InmobiliariaVane</h1>
          <p className="text-gray-600">Ingrese a su cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
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

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-medium text-white transition ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? 'Autenticando...' : 'Ingresar'}
          </button>
        </form>

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