import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import {
  getAllPlans,
  getPlanById,
  getActiveSubscription,
  createSubscription,
  cancelSubscription,
  renewSubscription,
  recordPayment,
  getPaymentHistory
} from '../services/subscriptionService.js';
import { pool } from '../db.js';

const router = express.Router();

// Todos los endpoints requieren autenticación
router.use(authMiddleware);

/**
 * GET /api/subscriptions/planes
 * Obtiene listado de planes disponibles (público)
 */
router.get('/planes', async (req, res) => {
  try {
    const planes = await getAllPlans();
    res.json(planes);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

/**
 * GET /api/subscriptions/mi-suscripcion
 * Obtiene la suscripción activa del usuario actual
 */
router.get('/mi-suscripcion', async (req, res) => {
  try {
    const suscripcion = await getActiveSubscription(req.user.id, req.user.tenantId);
    
    if (!suscripcion) {
      return res.status(404).json({ error: 'No tienes suscripción activa' });
    }

    res.json({
      ...suscripcion,
      dias_restantes: Math.ceil((new Date(suscripcion.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24))
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al obtener suscripción' });
  }
});

/**
 * GET /api/subscriptions/pagos
 * Obtiene historial de pagos del usuario
 */
router.get('/pagos', async (req, res) => {
  try {
    const pagos = await getPaymentHistory(req.user.id, req.user.tenantId);
    res.json(pagos);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINTS ADMIN (solo para administradores)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/admin/crear
 * Crea una nueva suscripción para un usuario (admin only)
 * 
 * Body:
 * {
 *   "usuario_id": 2,
 *   "tenant_id": 1,
 *   "plan_id": 1,
 *   "ciclo_facturacion": "mensual"
 * }
 */
router.post('/admin/crear', adminMiddleware, async (req, res) => {
  try {
    const { usuario_id, tenant_id, plan_id, ciclo_facturacion } = req.body;

    // Validar que el plan exista
    const plan = await getPlanById(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // Crear suscripción
    const result = await createSubscription(usuario_id, tenant_id, plan_id, ciclo_facturacion);

    res.status(201).json({
      mensaje: 'Suscripción creada',
      suscripcion: result
    });
  } catch (err) {
    console.error('Error:', err);
    if (err.message.includes('ya existe')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al crear suscripción' });
  }
});

/**
 * PUT /api/subscriptions/admin/:id/cambiar-plan
 * Cambia el plan de una suscripción (admin only)
 * 
 * Body:
 * {
 *   "plan_id": 2
 * }
 */
router.put('/admin/:id/cambiar-plan', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id } = req.body;

    // Validar que el plan exista
    const plan = await getPlanById(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // Obtener la suscripción
    const [suscripciones] = await pool.query(
      'SELECT * FROM suscripciones WHERE id = ?',
      [id]
    );

    if (!suscripciones.length) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    // Cambiar el plan
    const success = await renewSubscription(id, plan_id);

    if (success) {
      const updated = await getActiveSubscription(suscripciones[0].usuario_id, suscripciones[0].tenant_id);
      res.json({
        mensaje: 'Plan actualizado',
        suscripcion: updated
      });
    } else {
      res.status(500).json({ error: 'No se pudo actualizar el plan' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al cambiar plan' });
  }
});

/**
 * POST /api/subscriptions/admin/:id/renovar
 * Renueva una suscripción (extiende fecha_fin)
 */
router.post('/admin/:id/renovar', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la suscripción
    const [suscripciones] = await pool.query(
      'SELECT * FROM suscripciones WHERE id = ?',
      [id]
    );

    if (!suscripciones.length) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    const success = await renewSubscription(id);

    if (success) {
      const updated = await getActiveSubscription(suscripciones[0].usuario_id, suscripciones[0].tenant_id);
      res.json({
        mensaje: 'Suscripción renovada',
        suscripcion: updated
      });
    } else {
      res.status(500).json({ error: 'No se pudo renovar la suscripción' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al renovar suscripción' });
  }
});

/**
 * POST /api/subscriptions/admin/:id/cancelar
 * Cancela una suscripción (admin only)
 */
router.post('/admin/:id/cancelar', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const success = await cancelSubscription(id);

    if (success) {
      res.json({ mensaje: 'Suscripción cancelada' });
    } else {
      res.status(404).json({ error: 'Suscripción no encontrada' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al cancelar suscripción' });
  }
});

/**
 * GET /api/subscriptions/admin/todas
 * Lista todas las suscripciones (admin only)
 */
router.get('/admin/todas', adminMiddleware, async (req, res) => {
  try {
    const [suscripciones] = await pool.query(`
      SELECT s.*, p.nombre as plan_nombre, u.email, t.nombre as tenant_nombre
      FROM suscripciones s
      JOIN planes p ON p.id = s.plan_id
      JOIN usuarios u ON u.id = s.usuario_id
      JOIN tenants t ON t.id = s.tenant_id
      ORDER BY s.fecha_fin DESC
      LIMIT 100
    `);

    res.json(suscripciones);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

/**
 * POST /api/subscriptions/admin/:id/registrar-pago
 * Registra un pago manual (admin only)
 * 
 * Body:
 * {
 *   "monto": 29.99,
 *   "transaccion_id": "TXN-123456"
 * }
 */
router.post('/admin/:id/registrar-pago', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, transaccion_id } = req.body;

    // Obtener la suscripción
    const [suscripciones] = await pool.query(
      'SELECT * FROM suscripciones WHERE id = ?',
      [id]
    );

    if (!suscripciones.length) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    const sub = suscripciones[0];

    // Registrar el pago
    const pagoId = await recordPayment(
      id,
      sub.usuario_id,
      sub.tenant_id,
      monto,
      'completado',
      transaccion_id
    );

    res.status(201).json({
      mensaje: 'Pago registrado',
      pago_id: pagoId
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

export default router;
