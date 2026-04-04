// backend/middleware/subscription.js
import { isSubscriptionActive, getActiveSubscription } from '../services/subscriptionService.js';

/**
 * Verifica que el usuario tenga suscripción activa.
 * - Admin → siempre pasa
 * - Otros → necesitan suscripción vigente
 */
export async function subscriptionMiddleware(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    // Admins siempre pasan
    if (req.user.rol === 'admin') return next();

    const activa = await isSubscriptionActive(req.user.id, req.user.tenantId);
    if (!activa) {
      return res.status(403).json({
        error: 'Suscripción expirada o inactiva',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    const suscripcion = await getActiveSubscription(req.user.id, req.user.tenantId);
    req.subscription = suscripcion;
    next();
  } catch (err) {
    console.error('[subscriptionMiddleware]', err.message);
    res.status(500).json({ error: 'Error al verificar suscripción' });
  }
}

/**
 * Verifica que el usuario no haya superado el límite del plan.
 * Se aplica solo en requests POST (creación de recursos).
 *
 * Uso en rutas:
 *   router.post('/', authMiddleware, checkLimits('propiedades'), handler)
 *
 * Recursos soportados: 'propiedades' | 'contratos' | 'contactos' | 'usuarios'
 * 
 * NOTA: Por ahora, esta función pasa sin verificar límites.
 * Se implementará cuando la tabla `planes` tenga los campos de límites.
 */
export function checkLimits(recurso) {
  return async (req, res, next) => {
    try {
      // TODO: Implementar verificación de límites cuando los campos existan
      // Por ahora, solo pasar
      next();
    } catch (err) {
      console.error('[checkLimits]', err.message);
      res.status(500).json({ error: 'Error al verificar límites del plan' });
    }
  };
}