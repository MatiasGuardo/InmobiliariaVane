import express from 'express';
import {
  authenticateUser,
  createUser,
  findTenantByName,
  verifyToken
} from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Autentica un usuario con email + contraseña
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "token": "JWT_TOKEN...",
 *   "usuario": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "nombre": "Juan Pérez",
 *     "rol": "admin",
 *     "tenantId": 1
 *   }
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que email y password estén presentes
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Se requieren: email, password' 
      });
    }

    // Buscar usuario por email en CUALQUIER tenant
    const [usuarios] = await pool.query(
      'SELECT id, tenant_id, email, password_hash, nombre, rol, activo FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ 
        error: 'Email o contraseña incorrectos' 
      });
    }

    const usuario = usuarios[0];

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      return res.status(403).json({ 
        error: 'Usuario inactivo' 
      });
    }

    // Autenticar al usuario
    const result = await authenticateUser(email, password, usuario.tenant_id);

    // Obtener información del tenant
    const [tenants] = await pool.query(
      'SELECT id, nombre FROM tenants WHERE id = ? LIMIT 1',
      [usuario.tenant_id]
    );
    const tenantData = tenants.length > 0 ? tenants[0] : { id: usuario.tenant_id, nombre: 'Tenant' };

    res.status(200).json({
      token: result.token,
      usuario: result.usuario,
      tenant: {
        id: tenantData.id,
        nombre: tenantData.nombre
      }
    });

  } catch (error) {
    console.error('Error en /auth/login:', error.message);
    
    if (error.message.includes('Email o contraseña incorrectos')) {
      return res.status(401).json({ error: error.message });
    }
    if (error.message.includes('Usuario inactivo')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error al autenticar' });
  }
});

/**
 * POST /api/auth/register
 * Registra un nuevo usuario en un tenant existente
 * 
 * Body:
 * {
 *   "tenant": "nombre-de-la-inmobiliaria",
 *   "email": "newuser@example.com",
 *   "password": "password123",
 *   "nombre": "Juan Pérez"
 * }
 * 
 * Response:
 * {
 *   "usuario": {
 *     "id": 2,
 *     "email": "newuser@example.com",
 *     "nombre": "Juan Pérez",
 *     "rol": "user"
 *   },
 *   "mensaje": "Usuario creado exitosamente"
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const { tenant, email, password, nombre } = req.body;

    // Validar campos
    if (!tenant || !email || !password || !nombre) {
      return res.status(400).json({ 
        error: 'Se requieren: tenant, email, password, nombre' 
      });
    }

    // Validar email básico (debe contener @)
    if (!email.includes('@')) {
      return res.status(400).json({ 
        error: 'Email inválido' 
      });
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener mínimo 6 caracteres' 
      });
    }

    // Buscar el tenant
    const tenantData = await findTenantByName(tenant);
    if (!tenantData) {
      return res.status(404).json({ 
        error: 'Tenant no encontrado' 
      });
    }

    if (!tenantData.activo) {
      return res.status(403).json({ 
        error: 'Tenant inactivo' 
      });
    }

    // Crear el usuario
    const usuario = await createUser(
      tenantData.id,
      email,
      password,
      nombre,
      'user' // Rol por defecto es 'user'
    );

    res.status(201).json({
      usuario,
      mensaje: 'Usuario creado exitosamente'
    });

  } catch (error) {
    console.error('Error en /auth/register:', error.message);
    
    if (error.message.includes('ya está registrado')) {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

/**
 * GET /api/auth/verify
 * Verifica que el token JWT sea válido
 * Requiere: Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "valido": true,
 *   "usuario": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "nombre": "Juan Pérez",
 *     "rol": "admin",
 *     "tenantId": 1
 *   }
 * }
 */
router.get('/verify', authMiddleware, (req, res) => {
  res.status(200).json({
    valido: true,
    usuario: req.user
  });
});

/**
 * GET /api/auth/me
 * Obtiene la información del usuario actual autenticado
 * Requiere: Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({
    usuario: req.user
  });
});

export default router;
