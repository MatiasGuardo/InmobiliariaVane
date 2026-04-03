import { pool } from '../db.js';

/**
 * Obtiene la suscripción activa de un usuario/tenant
 */
export async function getActiveSubscription(usuarioId, tenantId) {
  const [suscripciones] = await pool.query(
    `SELECT s.*, p.nombre as plan_nombre, p.limite_propiedades, p.limite_usuarios, 
            p.include_reportes, p.include_automatizacion
     FROM suscripciones s
     JOIN planes p ON p.id = s.plan_id
     WHERE s.usuario_id = ? AND s.tenant_id = ? AND s.estado = 'activo'
     LIMIT 1`,
    [usuarioId, tenantId]
  );
  
  return suscripciones.length > 0 ? suscripciones[0] : null;
}

/**
 * Verifica si una suscripción está activa (no expirada y no cancelada)
 */
export async function isSubscriptionActive(usuarioId, tenantId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count FROM suscripciones 
     WHERE usuario_id = ? AND tenant_id = ? 
     AND estado = 'activo' AND fecha_fin >= CURDATE()`,
    [usuarioId, tenantId]
  );
  
  return result[0].count > 0;
}

/**
 * Crea una nueva suscripción
 */
export async function createSubscription(usuarioId, tenantId, planId, ciclo = 'mensual') {
  try {
    const dias = ciclo === 'anual' ? 365 : 30;
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + dias);

    const [result] = await pool.query(
      `INSERT INTO suscripciones (usuario_id, tenant_id, plan_id, fecha_inicio, fecha_fin, 
                                 fecha_renovacion_proximo, ciclo_facturacion, estado, renovacion_automatica)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, 'activo', TRUE)`,
      [usuarioId, tenantId, planId, fechaFin.toISOString().split('T')[0], 
       fechaFin.toISOString().split('T')[0], ciclo]
    );

    return { id: result.insertId, usuarioId, tenantId, planId, ciclo };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Este usuario ya tiene una suscripción activa');
    }
    throw error;
  }
}

/**
 * Cancela una suscripción
 */
export async function cancelSubscription(suscripcionId) {
  const [result] = await pool.query(
    `UPDATE suscripciones SET estado = 'cancelado', updated_at = NOW() WHERE id = ?`,
    [suscripcionId]
  );

  return result.affectedRows > 0;
}

/**
 * Extiende una suscripción (para renovaciones)
 */
export async function renewSubscription(suscripcionId, planId = null) {
  // Obtener la suscripción actual
  const [suscripciones] = await pool.query(
    'SELECT * FROM suscripciones WHERE id = ?',
    [suscripcionId]
  );

  if (!suscripciones.length) {
    throw new Error('Suscripción no encontrada');
  }

  const sub = suscripciones[0];
  const dias = sub.ciclo_facturacion === 'anual' ? 365 : 30;
  
  // Nueva fecha de fin
  const nuevaFechaFin = new Date(sub.fecha_fin);
  nuevaFechaFin.setDate(nuevaFechaFin.getDate() + dias);

  const [result] = await pool.query(
    `UPDATE suscripciones 
     SET fecha_fin = ?, fecha_renovacion_proximo = ?, estado = 'activo', updated_at = NOW()
     ${planId ? ', plan_id = ?' : ''}
     WHERE id = ?`,
    planId ? [nuevaFechaFin.toISOString().split('T')[0], nuevaFechaFin.toISOString().split('T')[0], planId, suscripcionId]
           : [nuevaFechaFin.toISOString().split('T')[0], nuevaFechaFin.toISOString().split('T')[0], suscripcionId]
  );

  return result.affectedRows > 0;
}

/**
 * Obtiene todos los planes disponibles
 */
export async function getAllPlans() {
  const [planes] = await pool.query(
    'SELECT * FROM planes WHERE activo = TRUE ORDER BY precio_mensual ASC'
  );
  return planes;
}

/**
 * Obtiene un plan por ID
 */
export async function getPlanById(planId) {
  const [planes] = await pool.query(
    'SELECT * FROM planes WHERE id = ? AND activo = TRUE',
    [planId]
  );
  return planes.length > 0 ? planes[0] : null;
}

/**
 * Registra un pago
 */
export async function recordPayment(suscripcionId, usuarioId, tenantId, monto, estado = 'completado', transaccionId = null) {
  const [result] = await pool.query(
    `INSERT INTO pagos (suscripcion_id, usuario_id, tenant_id, monto, estado, transaccion_id, fecha_pago)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [suscripcionId, usuarioId, tenantId, monto, estado, transaccionId]
  );

  return result.insertId;
}

/**
 * Obtiene el historial de pagos de un usuario
 */
export async function getPaymentHistory(usuarioId, tenantId = null) {
  let query = 'SELECT * FROM pagos WHERE usuario_id = ?';
  let params = [usuarioId];

  if (tenantId) {
    query += ' AND tenant_id = ?';
    params.push(tenantId);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  const [pagos] = await pool.query(query, params);
  return pagos;
}
