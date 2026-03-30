// ============================================================
//  backend/server.js  —  VERSIÓN ACTUALIZADA
//  Único cambio respecto al original:
//    • Se importa "./cron.js" para registrar el evaluador diario
//    • Se agrega la ruta GET /api/alertas para consultar alertas desde el frontend
// ============================================================

import express   from "express";
import cors      from "cors";
import dotenv    from "dotenv";

import propertiesRouter from "./routes/properties.js";
import ownersRouter     from "./routes/owners.js";
import tenantsRouter    from "./routes/tenants.js";
import leasesRouter     from "./routes/leases.js";
import documentsRouter  from "./routes/documents.js";

// Inicializa la conexión a la BD
import "./db.js";

// ★ Registra el cron de actualizaciones de alquiler
import "./cron.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARES ──────────────────────────────────────────────
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

// ─── RUTAS ────────────────────────────────────────────────────
app.use("/api/properties", propertiesRouter);
app.use("/api/owners",     ownersRouter);
app.use("/api/tenants",    tenantsRouter);
app.use("/api/leases",     leasesRouter);
app.use("/api/documents",  documentsRouter);

// ─── Alertas ─────────────────────────────────────────────────
// Consulta las últimas N alertas emitidas (útil para el panel admin)
app.get("/api/alertas", async (req, res) => {
  try {
    const { pool } = await import("./db.js");
    const limit = Math.min(parseInt(req.query.limit ?? "50"), 200);
    const [rows] = await pool.query(
      `SELECT
         a.*,
         DATE_FORMAT(a.fecha_alerta, '%Y-%m-%d')  AS fecha_alerta,
         DATE_FORMAT(a.enviada_at,   '%Y-%m-%dT%H:%i:%s') AS enviada_at,
         pi.nombre  AS inq_nombre,  pi.apellido AS inq_apellido,
         pp.nombre  AS prop_nombre, pp.apellido AS prop_apellido,
         pr.direccion AS propiedad_dir
       FROM alertas_actualizacion a
       JOIN contratos c  ON c.id  = a.contrato_id
       JOIN personas  pi ON pi.id = c.inquilino_id
       JOIN personas  pp ON pp.id = c.propietario_id
       JOIN propiedades pr ON pr.id = c.propiedad_id
       ORDER BY a.enviada_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener alertas" });
  }
});

// ─── Admin: disparar cron manualmente ─────────────────────────
// Útil para testing — proteger con auth en producción
app.post("/api/admin/run-cron", async (_req, res) => {
  try {
    const { default: runCron } = await import("./cron.js");
    await runCron();
    res.json({ ok: true, message: "Cron ejecutado manualmente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));

// ─── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  PropManager API corriendo en http://localhost:${PORT}`);
 
});
import indicesRouter from "./routes/indices.js";
// ...
app.use("/api/indices", indicesRouter);