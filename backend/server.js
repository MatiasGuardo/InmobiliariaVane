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
import { authMiddleware } from "./middleware/auth.js";

import "./db.js";
import "./cron.js";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// ─── POOL DE CONEXIONES ─────────────────────────────────────

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "inmobiliaria",
  waitForConnections: true,
  connectionLimit:    10,
  timezone: "Z",
});

// Verifica conexión al arrancar
pool.getConnection()
  .then(conn => { console.log("✅  Conectado a MySQL"); conn.release(); })
  .catch(err  => { console.error("❌  Error de conexión MySQL:", err.message); process.exit(1); });

// ─── HELPER ─────────────────────────────────────────────────

// Mapea una fila de `personas` + `propiedades` al shape que espera el frontend
function mapOwner(row) {
  return {
    id:    String(row.id),
    name:  `${row.nombre} ${row.apellido}`,
    email: row.email,
    phone: row.telefono || "",
    // Las propiedades asociadas se calculan aparte (ver GET /api/owners)
    properties: row.properties ? row.properties.split(",").map(String) : [],
  };
}

function mapTenant(row) {
  return {
    id:      String(row.id),
    name:    `${row.nombre} ${row.apellido}`,
    email:   row.email,
    phone:   row.telefono || "",
    leaseId: row.leaseId ? String(row.leaseId) : null,
  };
}

function mapProperty(row) {
  return {
    id:      String(row.id),
    address: `${row.direccion}${row.numero ? ", " + row.numero : ""}`,
    type:    mapTipo(row.tipo),
    price:   Number(row.precio_lista),
    status:  row.estado === "alquilada" ? "ocupado" : "vacante",
    ownerId: String(row.id_propietario),
    leaseId: row.leaseId ? String(row.leaseId) : null,
  };
}

function mapLease(row) {
  return {
    id:         String(row.id),
    propertyId: String(row.propiedad_id),
    tenantId:   String(row.inquilino_id),
    startDate:  row.fecha_inicio instanceof Date
                  ? row.fecha_inicio.toISOString().split("T")[0]
                  : String(row.fecha_inicio),
    endDate:    row.fecha_fin instanceof Date
                  ? row.fecha_fin.toISOString().split("T")[0]
                  : String(row.fecha_fin),
    rent:       Number(row.monto_renta),
    increase:   6,   // el frontend usa un % fijo; en BD se guarda en indice_ajuste
    status:     row.estado_contrato === "activo" ? "activo" : row.estado_contrato,
  };
}

// Traduce el tipo de propiedad del frontend al ENUM de la BD
function mapTipoToDB(tipo) {
  const m = {
    "Departamento":     "departamento",
    "Local Comercial":  "local_comercial",
    "Casa":             "casa",
    "Oficina":          "oficina",
    "Galpón":           "galpon",
    "Terreno":          "terreno",
  };
  return m[tipo] || "otro";
}

function mapTipo(tipo) {
  const m = {
    departamento:    "Departamento",
    local_comercial: "Local Comercial",
    casa:            "Casa",
    oficina:         "Oficina",
    galpon:          "Galpón",
    terreno:         "Terreno",
    otro:            "Otro",
  };
  return m[tipo] || tipo;
}

// ─── PROPIEDADES ─────────────────────────────────────────────

// GET /api/properties
app.get("/api/properties", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.*,
        (
          SELECT c.id
          FROM contratos c
          WHERE c.propiedad_id = p.id
            AND c.estado_contrato = 'activo'
          LIMIT 1
        ) AS leaseId
      FROM propiedades p
      WHERE p.activo = 1
      ORDER BY p.id DESC
    `);
    res.json(rows.map(mapProperty));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener propiedades" });
  }
});

// POST /api/properties
app.post("/api/properties", async (req, res) => {
  const { address, type, price, status, ownerId } = req.body;

  if (!address || !price || !ownerId) {
    return res.status(400).json({ error: "Faltan campos obligatorios: address, price, ownerId" });
  }

  // Separar dirección y número (ej. "Av. Santa Fe 2450, Piso 3B")
  const parts   = address.split(",");
  const dir     = parts[0]?.trim() || address;
  const numero  = parts.slice(1).join(",").trim() || null;
  const estado  = status === "ocupado" ? "alquilada" : "disponible";

  try {
    const [result] = await pool.query(
      `INSERT INTO propiedades
         (id_propietario, direccion, numero, ciudad, codigo_postal, tipo, estado, precio_lista, moneda, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ARS', 1)`,
      [ownerId, dir, numero, "Buenos Aires", "1000", mapTipoToDB(type), estado, price]
    );

    const [[row]] = await pool.query(
      `SELECT p.*, NULL AS leaseId FROM propiedades p WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json(mapProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/properties/:id
app.put("/api/properties/:id", async (req, res) => {
  const { id }                          = req.params;
  const { address, type, price, status, ownerId } = req.body;

  const parts  = (address || "").split(",");
  const dir    = parts[0]?.trim() || address;
  const numero = parts.slice(1).join(",").trim() || null;
  const estado = status === "ocupado" ? "alquilada" : "disponible";

  try {
    await pool.query(
      `UPDATE propiedades
         SET direccion = ?, numero = ?, tipo = ?, estado = ?, precio_lista = ?, id_propietario = ?
       WHERE id = ?`,
      [dir, numero, mapTipoToDB(type), estado, price, ownerId, id]
    );

    const [[row]] = await pool.query(
      `SELECT p.*,
         (SELECT c.id FROM contratos c WHERE c.propiedad_id = p.id AND c.estado_contrato = 'activo' LIMIT 1) AS leaseId
       FROM propiedades p WHERE p.id = ?`,
      [id]
    );

    res.json(mapProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar propiedad" });
  }
});

// DELETE /api/properties/:id  (baja lógica)
app.delete("/api/properties/:id", async (req, res) => {
  try {
    await pool.query("UPDATE propiedades SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));

// ─── START ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀  PropManager API corriendo en http://localhost:${PORT}`);
});