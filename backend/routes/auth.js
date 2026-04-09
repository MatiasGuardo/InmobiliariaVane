import express from 'express';
import {
  authenticateUser, createUser, createTenant,
  findTenantByName, verifyEmailToken, sendVerificationEmail
} from '../services/authService.js';
import { assignFreePlan } from '../services/subscriptionService.js';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Se requieren email y contraseña' });

    const [usuarios] = await pool.query(
      'SELECT id, tenant_id, activo, email_verificado FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    if (!usuarios.length) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const u = usuarios[0];
    if (!u.activo) return res.status(403).json({ error: 'Usuario inactivo' });
    if (!u.email_verificado) return res.status(403).json({ error: 'Debés verificar tu email antes de ingresar', code: 'EMAIL_NOT_VERIFIED' });

    const result = await authenticateUser(email, password, u.tenant_id);

    const [tenants] = await pool.query('SELECT id, nombre FROM tenants WHERE id = ? LIMIT 1', [u.tenant_id]);
    const tenant = tenants[0] || { id: u.tenant_id, nombre: 'Inmobiliaria' };

    res.json({ token: result.token, usuario: result.usuario, tenant });
  } catch (err) {
    if (err.message.includes('Email o contraseña') || err.message.includes('verificar')) {
      return res.status(401).json({ error: err.message, code: err.message.includes('verificar') ? 'EMAIL_NOT_VERIFIED' : undefined });
    }
    res.status(500).json({ error: 'Error al autenticar' });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Crea un tenant propio + usuario admin + asigna plan Starter + manda mail
router.post('/register', async (req, res) => {
  try {
    const { tenantNombre, nombre, apellido, dni, email, password } = req.body;

    if (!tenantNombre || !nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (!email.includes('@')) return res.status(400).json({ error: 'Email inválido' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    // Verificar que no exista ya ese tenant o email global
    const existingTenant = await findTenantByName(tenantNombre);
    if (existingTenant) return res.status(409).json({ error: 'Ya existe una inmobiliaria con ese nombre' });

    const [emailCheck] = await pool.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    if (emailCheck.length) return res.status(409).json({ error: 'Ese email ya está registrado' });

    // Crear tenant
    const tenant = await createTenant(tenantNombre.trim(), email, 'starter');

    // Crear usuario admin del tenant
    const usuario = await createUser(tenant.id, email, password, nombre.trim(), apellido?.trim(), dni?.trim(), 'admin');

    // Asignar plan Starter
    await assignFreePlan(usuario.id, tenant.id);

    // Enviar mail de verificación
    try {
      await sendVerificationEmail(email, nombre, usuario.verificationToken);
    } catch (mailErr) {
      console.error('[register] Error enviando mail:', mailErr.message);
      // No falla el registro si el mail falla — el usuario puede pedir reenvío
    }

    res.status(201).json({
      mensaje: `¡Listo! Revisá tu correo ${email} para verificar tu cuenta.`,
      tenantNombre: tenant.nombre,
    });
  } catch (err) {
    console.error('[register]', err.message);
    if (err.message.includes('ya existe') || err.message.includes('registrado')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

// ── GET /api/auth/verificar-email?token=xxx ───────────────────────────────────
router.get('/verificar-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    await verifyEmailToken(token);
    // Redirigir al login con mensaje
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=1`);
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=error&msg=${encodeURIComponent(err.message)}`);
  }
});

// ── GET /api/auth/verify ──────────────────────────────────────────────────────
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ valido: true, usuario: req.user });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ usuario: req.user });
});

export default router;