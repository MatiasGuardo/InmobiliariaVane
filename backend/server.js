// ============================================================
//  PropManager — Backend API
//  Node.js + Express + mysql2
// ============================================================

import express   from "express";
import cors      from "cors";
import dotenv    from "dotenv";

// Rutas separadas por recurso
import propertiesRouter from "./routes/properties.js";
import ownersRouter     from "./routes/owners.js";
import tenantsRouter    from "./routes/tenants.js";
import leasesRouter     from "./routes/leases.js";

// Inicializa la conexión a la BD (el pool se conecta al importar)
import "./db.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARES ─────────────────────────────────────────────

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

app.use(express.json());

// ─── RUTAS ───────────────────────────────────────────────────

app.use("/api/properties", propertiesRouter);
app.use("/api/owners",     ownersRouter);
app.use("/api/tenants",    tenantsRouter);
app.use("/api/leases",     leasesRouter);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));

// ─── START ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀  PropManager API corriendo en http://localhost:${PORT}`);
});