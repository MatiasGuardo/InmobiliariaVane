#!/usr/bin/env node
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedTestingUsers() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inmobiliariavane',
  });

  try {
    console.log('📋 Preparando cuentas de testing...');

    // Primero, asegurar que existe el tenant
    console.log('✅ Verificando tenant por defecto...');
    const [existingTenant] = await conn.execute(
      'SELECT id FROM tenants WHERE id = 1 LIMIT 1'
    );

    if (existingTenant.length === 0) {
      console.log('  → Tenant no existe, creando...');
      await conn.execute(
        `INSERT INTO tenants (id, nombre, email, plan, activo) 
         VALUES (1, 'OnKey', 'default@localhost', 'basic', TRUE)`
      );
      console.log('  ✅ Tenant creado');
    } else {
      console.log('  ✅ Tenant ya existe');
    }

    // Verificar que existan los planes
    console.log('\n✅ Verificando planes...');
    const [planes] = await conn.execute('SELECT id, nombre FROM planes');
    if (planes.length === 0) {
      console.log('  ⚠️  No se encontraron planes, puede que la BD no esté completamente inicializada');
    } else {
      console.log(`  ✅ Encontrados ${planes.length} planes:`);
      planes.forEach(p => console.log(`    • ${p.nombre} (ID: ${p.id})`));
    }
    const sqlPath = path.join(__dirname, 'migrations', 'testing-users.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Quitar comentarios y dividir sentencias
    const lines = sqlContent
      .split('\n')
      .map(line => line.replace(/--.*$/, '').trim())
      .filter(line => line);
    
    const fullContent = lines.join('\n');
    const statements = fullContent
      .split(/;+/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt);

    console.log(`🔧 Ejecutando ${statements.length} sentencias SQL...`);

    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
        console.log(`✅ ${preview}...`);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error('❌ Error:', err.message);
        } else {
          console.log('⏭️  Ya existe este registro');
        }
      }
    }

    // Verificar que los usuarios fueron creados
    console.log('\n✨ Verificando usuarios creados...');
    const [usuarios] = await conn.execute(
      `SELECT id, email, nombre, rol FROM usuarios 
       WHERE email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost')
       ORDER BY id`
    );

    console.log('\n👥 Usuarios de testing:');
    usuarios.forEach(u => {
      console.log(`  • ${u.email} (${u.nombre}) - Rol: ${u.rol}`);
    });

    // Verificar suscripciones
    console.log('\n📅 Suscripciones:');
    const [suscripciones] = await conn.execute(`
      SELECT u.email, p.nombre as plan, s.fecha_fin, s.estado
      FROM suscripciones s
      JOIN usuarios u ON u.id = s.usuario_id
      JOIN planes p ON p.id = s.plan_id
      WHERE u.email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost')
      ORDER BY u.email
    `);

    suscripciones.forEach(s => {
      console.log(`  • ${s.email} → Plan: ${s.plan}, Estado: ${s.estado}, Vencimiento: ${s.fecha_fin}`);
    });

    console.log('\n✅ ¡Usuarios de testing creados exitosamente!');
    console.log('\n🔑 Credenciales de prueba:');
    console.log('  • admin@localhost / admin123 (Admin)');
    console.log('  • starter@localhost / admin123 (Starter Plan)');
    console.log('  • pro@localhost / admin123 (Pro Plan)');
    console.log('  • viewer@localhost / admin123 (Viewer / Lectura)');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seedTestingUsers();
