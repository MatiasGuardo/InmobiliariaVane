import jwt from 'jsonwebtoken';

// Leer JWT_SECRET en runtime en lugar de en import time
function getJWTSecret() {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no está definido, usando fallback inseguro');
  }
  return secret;
}

/**
 * Middleware de autenticación JWT
 * 
 * Verifica que el token sea válido y extrae:
 * - usuario ID
 * - tenant ID
 * - rol
 * 
 * Usa: Authorization: Bearer <token>
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    console.log(`[AUTH] Petición a: ${req.method} ${req.path}`);
    console.log(`[AUTH] Headers recibidos:`, {
      authorization: authHeader ? authHeader.substring(0, 50) + '...' : 'NO DEFINIDO',
      host: req.headers.host,
      'content-type': req.headers['content-type'],
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[AUTH] ❌ Token no proporcionado o formato inválido`);
      return res.status(401).json({ error: 'Token no proporcionado o formato inválido' });
    }

    const token = authHeader.substring(7); // Quita "Bearer "
    
    // DEBUG: Log para ver si JWT_SECRET está disponible
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET no está definido en .env, usando fallback');
    }
    
    const decoded = jwt.verify(token, getJWTSecret());
    
    console.log(`[AUTH] ✅ Token válido para usuario: ${decoded.email} (ID: ${decoded.id})`);

    // Adjunta info del usuario al request
    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      email: decoded.email,
      rol: decoded.rol,
      nombre: decoded.nombre
    };

    next();
  } catch (err) {
    console.error(`[AUTH] ❌ Error:`, err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    return res.status(500).json({ error: 'Error al verificar token' });
  }
}

/**
 * Middleware opcional: verifica que el usuario sea admin
 */
export function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol admin' });
  }

  next();
}
