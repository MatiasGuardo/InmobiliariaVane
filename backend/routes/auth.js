import express from 'express';
import {
  authenticateUser,
  createUser,
  findTenantByName,
  verifyToken
} from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Autentica un usuario con email + contraseña
 * 
 * Body:
 * {
 *   "tenant": "nombre-de-la-inmobiliaria",
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
 *     "rol": "admin"
 *   }
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { tenant, email, password } = req.body;

    // Validar que todos los campos estén presentes
    if (!tenant || !email || !password) {
      return res.status(400).json({ 
        error: 'Se requieren: tenant, email, password' 
      });
    }

    // Buscar el tenant por nombre
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

    // Autenticar al usuario
    const result = await authenticateUser(email, password, tenantData.id);

    res.status(200).json({
      token: result.token,
      usuario: result.usuario,
      tenantId: tenantData.id,
      tenantNombre: tenantData.nombre
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
