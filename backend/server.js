// backend/server.js
import express   from "express";
import cors      from "cors";
import dotenv    from "dotenv";

import propertiesRouter from "./routes/properties.js";
import ownersRouter     from "./routes/owners.js";
import tenantsRouter    from "./routes/tenants.js";
import leasesRouter     from "./routes/leases.js";
import documentsRouter  from "./routes/documents.js";
import indicesRouter    from "./routes/indices.js";   // ← ERA EL BUG PRINCIPAL

import "./db.js";
import "./cron.js";

dotenv.config();

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
app.use("/api/indices",    indicesRouter);            // ← ERA EL BUG PRINCIPAL

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

app.listen(PORT, () => {
  console.log(`🚀  PropManager API corriendo en http://localhost:${PORT}`);
});