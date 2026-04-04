/**
 * createTestSubscriptions.js
 * 
 * Ejecutar con: node createTestSubscriptions.js
 * 
 * Crea suscripciones para los test users
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function create() {
  const conn = await createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'inmobiliariavane',
  });

  try {
    // Obtener los planes y usuarios
    const [planes] = await conn.execute('SELECT id, nombre FROM planes');
    const [usuarios] = await conn.execute('SELECT u.id, u.email, t.id AS tenant_id FROM usuarios u LEFT JOIN tenants t ON u.tenant_id = t.id');

    console.log('📋 Planes encontrados:', planes.map((p) => `${p.nombre} (${p.id})`).join(', '));
    console.log('👥 Usuarios encontrados:', usuarios.map((u) => `${u.email}`).join(', '));

    // Mapeo: email -> plan_nombre
    const mapping = {
      'admin@localhost': 'Premium', // Admin en Premium (sin límites)
      'starter@localhost': 'Starter',
      'pro@localhost': 'Pro',
      'viewer@localhost': 'Starter', // Viewer en plan Starter como demo
    };

    // Insertar suscripciones
    for (const usuario of usuarios) {
      const planName = mapping[usuario.email];
      if (!planName) {
        console.log(`⏭️  Saltando ${usuario.email} (no está en mapping)`);
        continue;
      }

      const plan = planes.find((p) => p.nombre === planName);
      if (!plan) {
        console.log(`⚠️  Plan ${planName} no encontrado para ${usuario.email}`);
        continue;
      }

      // Verificar si ya tiene suscripción activa
      const [existing] = await conn.execute(
        'SELECT id FROM suscripciones WHERE usuario_id = ? AND estado = "activo"',
        [usuario.id]
      );

      if (existing.length > 0) {
        console.log(`⏭️  ${usuario.email} ya tiene suscripción activa`);
        continue;
      }

      // Insertar nueva suscripción (100 años de duración)
      await conn.execute(
        `INSERT INTO suscripciones (usuario_id, tenant_id, plan_id, estado, fecha_inicio, fecha_fin, ciclo_facturacion)
         VALUES (?, ?, ?, 'activo', NOW(), DATE_ADD(NOW(), INTERVAL 36500 DAY), 'mensual')`,
        [usuario.id, usuario.tenant_id, plan.id]
      );

      console.log(`✅ ${usuario.email} → Plan ${planName}`);
    }

    // Verificar insertadas
    const [suscripciones] = await conn.execute(
      `SELECT s.id, u.email, p.nombre, s.estado, s.fecha_inicio, s.fecha_fin
       FROM suscripciones s
       JOIN usuarios u ON s.usuario_id = u.id
       JOIN planes p ON s.plan_id = p.id
       ORDER BY u.email`
    );

    console.log('\n📊 Suscripciones registradas:');
    for (const s of suscripciones) {
      console.log(`  • ${s.email} → ${s.nombre} (${s.estado}) hasta ${s.fecha_fin.toISOString().split('T')[0]}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

create();
