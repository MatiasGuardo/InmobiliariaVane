// frontend/src/pages/Planes.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const FEATURES = {
  Gratis: [
    '✓ Hasta 3 propiedades',
    '✓ Hasta 3 contratos activos',
    '✓ Hasta 3 contactos',
    '✓ 1 usuario',
    '✗ Reportes',
    '✗ Automatizaciones',
  ],
  Pro: [
    '✓ Hasta 50 propiedades',
    '✓ Hasta 50 contratos activos',
    '✓ Hasta 200 contactos',
    '✓ Hasta 5 usuarios',
    '✓ Reportes incluidos',
    '✓ Automatizaciones',
  ],
  Enterprise: [
    '✓ Propiedades ilimitadas',
    '✓ Contratos ilimitados',
    '✓ Contactos ilimitados',
    '✓ Usuarios ilimitados',
    '✓ Reportes incluidos',
    '✓ Automatizaciones',
  ],
};

export default function Planes() {
  const { token, user } = useAuth();
  const [planes, setPlanes]           = useState([]);
  const [planActual, setPlanActual]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [upgrading, setUpgrading]     = useState(null); // ID del plan en proceso
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  // Leer ?status=success del redirect de MercadoPago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      setSuccessMsg('¡Pago recibido! Tu plan se activará en unos minutos.');
      window.history.replaceState({}, '', '/planes');
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [planesRes, miPlanRes] = await Promise.all([
          fetch('/api/subscriptions/planes'),
          fetch('/api/subscriptions/mi-plan', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const planesData = await planesRes.json();
        setPlanes(planesData);

        if (miPlanRes.ok) {
          const miPlan = await miPlanRes.json();
          setPlanActual(miPlan);
        }
      } catch (err) {
        setError('Error al cargar los planes');
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchData();
  }, [token]);

  const handleUpgrade = async (plan) => {
    setError('');
    setUpgrading(plan.id);
    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el pago');

      // Redirigir a MercadoPago
      window.location.href = data.init_point;
    } catch (err) {
      setError(err.message);
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando planes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Planes y Precios</h1>
        <p className="text-gray-500">Elegí el plan que se adapte a tu inmobiliaria</p>
      </div>

      {/* Mensajes */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6 text-center">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 text-center">
          {error}
        </div>
      )}

      {/* Grilla de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planes.map((plan) => {
          const esPlanActual = planActual?.plan_nombre === plan.nombre;
          const esPro        = plan.nombre === 'Pro';
          const features     = FEATURES[plan.nombre] || [];

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-shadow ${
                esPro
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200 shadow-sm'
              }`}
            >
              {/* Badge popular */}
              {esPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Más popular
                  </span>
                </div>
              )}

              {/* Nombre del plan */}
              <h2 className="text-xl font-bold text-gray-800 mb-1">{plan.nombre}</h2>

              {/* Precio */}
              <div className="mb-4">
                {plan.precio_mensual === 0 ? (
                  <span className="text-3xl font-extrabold text-gray-700">Gratis</span>
                ) : plan.precio_mensual ? (
                  <div>
                    <span className="text-3xl font-extrabold text-gray-800">
                      ${(plan.precio_mensual / 100).toLocaleString('es-AR')}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">/mes</span>
                  </div>
                ) : (
                  <span className="text-xl font-semibold text-gray-700">A consultar</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {features.map((f, i) => (
                  <li
                    key={i}
                    className={`text-sm ${f.startsWith('✗') ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {f}
                  </li>
                ))}
              </ul>

              {/* Botón */}
              {esPlanActual ? (
                <div className="w-full py-2 text-center bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                  ✓ Plan actual
                </div>
              ) : plan.precio_mensual === 0 ? (
                <div className="w-full py-2 text-center bg-gray-50 text-gray-400 rounded-lg text-sm border border-gray-200">
                  Plan de inicio
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgrading === plan.id}
                  className={`w-full py-2 rounded-lg text-sm font-semibold text-white transition ${
                    esPro
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {upgrading === plan.id ? 'Redirigiendo...' : `Actualizar a ${plan.nombre}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota al pie */}
      <p className="text-center text-xs text-gray-400 mt-8">
        Los pagos se procesan de forma segura a través de MercadoPago.
        Podés cancelar cuando quieras.
      </p>
    </div>
  );
}