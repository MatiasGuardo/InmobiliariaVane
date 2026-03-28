import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "inmobiliaria",
  waitForConnections: true,
  connectionLimit:    10,
  timezone: "Z",
});

// Verifica la conexión al importar
pool.getConnection()
  .then(conn => { console.log("✅  Conectado a MySQL"); conn.release(); })
  .catch(err  => { console.error("❌  Error de conexión MySQL:", err.message); process.exit(1); });