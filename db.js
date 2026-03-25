
// ===============================
// CONEXIÓN SIMPLE A MYSQL (Railway)
// ===============================
// Este archivo crea una conexión directa a MySQL usando variables de entorno.
// Se usa para pruebas rápidas o scripts simples, no para producción.
// En producción se recomienda usar pool de conexiones (ver backend/server.js)
const mysql = require('mysql2');


// connection: Instancia de conexión directa a MySQL
// Lee los datos de conexión desde variables de entorno (Railway)
const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
});


// ===============================
// TEST DE CONEXIÓN AL INICIAR
// ===============================
// Intenta conectar y muestra mensaje de éxito o error
connection.connect((err) => {
  if (err) {
    console.error('Error al conectar:', err);
    return;
  }
  console.log('Conectado a MySQL de Railway ✅');
});


// Exporta la conexión para ser usada en otros scripts
module.exports = connection;