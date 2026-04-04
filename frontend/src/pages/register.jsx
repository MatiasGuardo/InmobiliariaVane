// frontend/src/pages/Register.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Register({ onRegisterSuccess, onGoToLogin }) {
  const [form, setForm] = useState({
    tenantNombre: '',
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones
    if (!form.tenantNombre.trim()) return setError('Ingresá el nombre de tu inmobiliaria');
    if (!form.nombre.trim())       return setError('Ingresá tu nombre completo');
    if (!form.email.trim() || !form.email.includes('@')) return setError('Email inválido');
    if (form.password.length < 6)  return setError('La contraseña debe tener mínimo 6 caracteres');
    if (form.password !== form.confirmPassword) return setError('Las contraseñas no coinciden');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantNombre: form.tenantNombre.trim(),
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');

      setSuccess(`¡Listo! Tu inmobiliaria "${data.tenantNombre}" fue creada con plan Gratis. Ya podés ingresar.`);
      setTimeout(() => onRegisterSuccess?.(), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Crear cuenta</h1>
          <p className="text-gray-500 text-sm">Comenzá gratis, sin tarjeta de crédito</p>
        </div>

        {/* Éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre de la inmobiliaria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de tu Inmobiliaria
            </label>
            <input
              type="text"
              name="tenantNombre"
              value={form.tenantNombre}
              onChange={handleChange}
              placeholder="ej: Inmobiliaria García"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tu Nombre Completo
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="ej: Juan García"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="vos@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repetí la contraseña"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg font-medium text-white transition ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
          </button>
        </form>

        {/* Plan badge */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-700 font-medium">
            ✓ Plan Gratis incluye: hasta 3 propiedades, 3 contratos y 3 contactos
          </p>
        </div>

        {/* Link a login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tenés cuenta?{' '}
            <button
              onClick={onGoToLogin}
              className="text-blue-600 font-medium hover:underline"
            >
              Iniciá sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}