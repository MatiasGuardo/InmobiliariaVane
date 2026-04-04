// backend/middleware/auth.js
import jwt from 'jsonwebtoken';

// Función helper para obtener JWT_SECRET en runtime
function getJWTSecret() {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no está definido, usando fallback inseguro');
  }
  return secret;
}

/**
 * Middleware de autenticación JWT
 * Verifica que el token sea válido y extrae los datos del usuario
 * Uso: router.use(authMiddleware) o router.get('/path', authMiddleware, handler)
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado: token requerido' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, getJWTSecret());
    
    // Adjuntar datos del usuario al request
    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      email: decoded.email,
      nombre: decoded.nombre,
      rol: decoded.rol,
    };

    next();
  } catch (err) {
    console.error('[authMiddleware]', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(401).json({ error: 'No autorizado' });
  }
}