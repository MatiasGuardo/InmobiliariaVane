import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado o formato inválido' });
    }

    const token = authHeader.substring(7); // Quita "Bearer "
    const decoded = jwt.verify(token, JWT_SECRET);

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

export { JWT_SECRET };
