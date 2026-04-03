// backend/server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ⚠️  CRÍTICO: Cargar .env ANTES de cualquier otra cosa
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

const envResult = dotenv.config({ path: envPath });
console.log('✅ Intentando cargar .env desde:', envPath);
if (envResult.error) {
  console.error('⚠️  Error cargando .env:', envResult.error.message);
} else {
  console.log('✅ .env cargado exitosamente');
}

console.log('JWT_SECRET definido:', !!process.env.JWT_SECRET);
if (process.env.JWT_SECRET) {
  console.log('JWT_SECRET (primeros 30 caracteres):', process.env.JWT_SECRET.substring(0, 30) + '...');
} else {
  console.error('❌ JWT_SECRET NO está definido en .env');
}

import express from "express";
import cors    from "cors";

import propertiesRouter from "./routes/properties.js";
import ownersRouter     from "./routes/owners.js";
import tenantsRouter    from "./routes/tenants.js";
import leasesRouter     from "./routes/leases.js";
import documentsRouter  from "./routes/documents.js";
import indicesRouter    from "./routes/indices.js";
import authRouter       from "./routes/auth.js";
import subscriptionsRouter from "./routes/subscriptions.js";

import "./db.js";
import "./cron.js";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json({ limit: "20mb" }));

app.use("/api/properties", propertiesRouter);
app.use("/api/owners",     ownersRouter);
app.use("/api/tenants",    tenantsRouter);
app.use("/api/leases",     leasesRouter);
app.use("/api/documents",  documentsRouter);
app.use("/api/indices",    indicesRouter);
app.use("/api/auth",       authRouter);
app.use("/api/subscriptions", subscriptionsRouter);

app.get("/api/alertas", async (_req, res) => {
  try {
    const { pool } = await import("./db.js");
    const [rows] = await pool.query(
      `SELECT a.*,
         DATE_FORMAT(a.fecha_alerta, '%Y-%m-%d') AS fecha_alerta,
         pi.nombre AS inq_nombre, pi.apellido AS inq_apellido,
         pp.nombre AS prop_nombre, pp.apellido AS prop_apellido,
         pr.direccion AS propiedad_dir
       FROM alertas_actualizacion a
       JOIN contratos c    ON c.id  = a.contrato_id
       JOIN personas  pi   ON pi.id = c.inquilino_id
       JOIN personas  pp   ON pp.id = c.propietario_id
       JOIN propiedades pr  ON pr.id = c.propiedad_id
       ORDER BY a.enviada_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/run-cron", async (_req, res) => {
  try {
    const { default: runCron } = await import("./cron.js");
    await runCron();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));

// DEBUG: Verifica que JWT_SECRET está cargado
app.get("/api/debug/jwt-secret", (_req, res) => {
  const secret = process.env.JWT_SECRET;
  res.json({ 
    hasSecret: !!secret, 
    secretLength: secret ? secret.length : 0,
    secretFirst20: secret ? secret.substring(0, 20) + '...' : 'NO DEFINIDO'
  });
});

app.listen(PORT, () => {
  console.log(`🚀  PropManager API corriendo en http://localhost:${PORT}`);
});