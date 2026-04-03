import { isSubscriptionActive, getActiveSubscription } from '../services/subscriptionService.js';

/**
 * Middleware de Suscripción
 * 
 * Verifica que el usuario tenga una suscripción activa y válida.
 * - Si es admin → permite siempre
 * - Si es usuario → verifica que tenga suscripción activa (fecha_fin >= hoy)
 * 
 * Debe usarse DESPUÉS de authMiddleware
 */
export async function subscriptionMiddleware(req, res, next) {
  try {
    // El usuario debe estar autenticado (verificado por authMiddleware)
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Admins tienen acceso ilimitado
    if (req.user.rol === 'admin') {
      console.log(`[SUBSCRIPTION] ✅ Admin ${req.user.email} - Acceso permitido`);
      return next();
    }

    // Usuarios normales: verificar suscripción activa
    const tieneActiva = await isSubscriptionActive(req.user.id, req.user.tenantId);

    if (!tieneActiva) {
      console.warn(`[SUBSCRIPTION] ❌ Usuario ${req.user.email} - Suscripción expirada o inactiva`);
      return res.status(403).json({ 
        error: 'Suscripción expirada o no activa',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // Obtener detalles de la suscripción y adjuntarlos al request
    const suscripcion = await getActiveSubscription(req.user.id, req.user.tenantId);
    req.subscription = suscripcion;

    console.log(`[SUBSCRIPTION] ✅ Usuario ${req.user.email} - Plan: ${suscripcion.plan_nombre}, Vence: ${suscripcion.fecha_fin}`);

    next();
  } catch (err) {
    console.error(`[SUBSCRIPTION] ❌ Error:`, err.message);
    res.status(500).json({ error: 'Error al verificar suscripción' });
  }
}

/**
 * Middleware para verificar límites de features
 * 
 * Verifica que el usuario no haya excedido los límites de su plan
 * Ejemplo: limite_propiedades = 10
 */
export async function checkLimits(recurso) {
  return async (req, res, next) => {
    try {
      if (!req.subscription) {
        return res.status(500).json({ error: 'Suscripción no disponible en request' });
      }

      const limiteField = `limite_${recurso}`;
      if (!req.subscription[limiteField]) {
        // No hay límite definido para este recurso
        return next();
      }

      // Obtener cantidad actual del recurso
      let countQuery = '';
      let params = [req.user.tenantId];

      switch (recurso) {
        case 'propiedades':
          countQuery = 'SELECT COUNT(*) as count FROM propiedades WHERE tenant_id = ? AND activo = 1';
          break;
        case 'usuarios':
          countQuery = 'SELECT COUNT(*) as count FROM usuarios WHERE tenant_id = ?';
          break;
        default:
          return next();
      }

      const { pool } = await import('../db.js');
      const [result] = await pool.query(countQuery, params);
      const count = result[0].count;

      // Adjuntar info de límites al request
      req.limits = {
        recurso,
        usado: count,
        limite: req.subscription[limiteField],
        disponible: req.subscription[limiteField] - count
      };

      if (count >= req.subscription[limiteField]) {
        console.warn(`[LIMITS] ❌ Usuario ${req.user.email} - Límite de ${recurso} alcanzado`);
        return res.status(403).json({ 
          error: `Límite de ${recurso} alcanzado en tu plan`,
          limits: req.limits,
          code: 'LIMIT_EXCEEDED'
        });
      }

      console.log(`[LIMITS] ✅ ${recurso}: ${count}/${req.subscription[limiteField]}`);
      next();
    } catch (err) {
      console.error(`[LIMITS] ❌ Error:`, err.message);
      res.status(500).json({ error: 'Error al verificar límites' });
    }
  };
}
