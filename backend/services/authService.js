import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h'; // Token válido por 24 horas

/**
 * Hashea una contraseña con bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compara una contraseña en texto plano con un hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Genera un JWT token
 */
export function generateToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      tenantId: usuario.tenant_id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Busca un usuario por email en un tenant específico
 */
export async function findUserByEmail(email, tenantId) {
  const [usuarios] = await pool.query(
    'SELECT id, tenant_id, email, password_hash, nombre, rol, activo, last_login FROM usuarios WHERE email = ? AND tenant_id = ? LIMIT 1',
    [email, tenantId]
  );
  
  return usuarios.length > 0 ? usuarios[0] : null;
}

/**
 * Busca un usuario por ID
 */
export async function findUserById(id) {
  const [usuarios] = await pool.query(
    'SELECT id, tenant_id, email, password_hash, nombre, rol, activo, last_login FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  
  return usuarios.length > 0 ? usuarios[0] : null;
}

/**
 * Busca un tenant por nombre
 */
export async function findTenantByName(nombre) {
  const [tenants] = await pool.query(
    'SELECT id, nombre, email, plan, activo FROM tenants WHERE nombre = ? LIMIT 1',
    [nombre]
  );
  
  return tenants.length > 0 ? tenants[0] : null;
}

/**
 * Crea un nuevo tenant (inmobiliaria)
 * Nota: Solo para admins o setup inicial
 */
export async function createTenant(nombre, email, plan = 'basic') {
  try {
    const [result] = await pool.query(
      'INSERT INTO tenants (nombre, email, plan, activo) VALUES (?, ?, ?, TRUE)',
      [nombre, email, plan]
    );
    return { id: result.insertId, nombre, email, plan, activo: true };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('El tenant con este nombre o email ya existe');
    }
    throw error;
  }
}

/**
 * Crea un nuevo usuario en un tenant
 */
export async function createUser(tenantId, email, passwordPlain, nombre, rol = 'user') {
  try {
    const existingUser = await findUserByEmail(email, tenantId);
    if (existingUser) {
      throw new Error('El email ya está registrado en este tenant');
    }

    const passwordHash = await hashPassword(passwordPlain);
    
    const [result] = await pool.query(
      'INSERT INTO usuarios (tenant_id, email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, TRUE)',
      [tenantId, email, passwordHash, nombre, rol]
    );

    return {
      id: result.insertId,
      tenantId,
      email,
      nombre,
      rol,
      activo: true
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('El email ya está registrado en este tenant');
    }
    throw error;
  }
}

/**
 * Autentica un usuario: verifica email + contraseña
 * Retorna usuario + token JWT si es válido
 */
export async function authenticateUser(email, passwordPlain, tenantId) {
  const usuario = await findUserByEmail(email, tenantId);
  
  if (!usuario) {
    throw new Error('Email o contraseña incorrectos');
  }

  if (!usuario.activo) {
    throw new Error('Usuario inactivo');
  }

  const passwordMatch = await verifyPassword(passwordPlain, usuario.password_hash);
  if (!passwordMatch) {
    throw new Error('Email o contraseña incorrectos');
  }

  // Actualizar last_login
  await pool.query(
    'UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
    [usuario.id]
  );

  // Generar token
  const token = generateToken(usuario);

  return {
    token,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    }
  };
}

/**
 * Decodifica y verifica un token JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}
