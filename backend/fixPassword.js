import bcrypt from 'bcrypt';
import { pool } from './db.js';

const hash = await bcrypt.hash('admin123', 10);
console.log('Hash generado:', hash);
console.log('Largo:', hash.length);

const [result] = await pool.query(
  'UPDATE usuarios SET password_hash = ? WHERE tenant_id = 1',
  [hash]
);

console.log('Usuarios actualizados:', result.affectedRows);

const [rows] = await pool.query(
  'SELECT id, email, LENGTH(password_hash) as largo FROM usuarios WHERE tenant_id = 1'
);
console.table(rows);

process.exit(0);