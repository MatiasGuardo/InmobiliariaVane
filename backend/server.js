// ============================================================
//  PropManager — Backend API
//  Node.js + Express + mysql2
// ============================================================


// ===============================
// IMPORTS PRINCIPALES
// ===============================
// express: Framework para servidor HTTP y rutas REST
// mysql2/promise: Cliente MySQL con soporte promesas
// cors: Middleware para habilitar CORS
// dotenv: Carga variables de entorno desde .env
import express        from "express";
import mysql          from "mysql2/promise";
import cors           from "cors";
import dotenv         from "dotenv";

dotenv.config();


// ===============================
// INICIALIZACIÓN DE LA APP
// ===============================
// app: Instancia principal de Express
// PORT: Puerto de escucha del backend
const app  = express();
const PORT = process.env.PORT || 3001;


// ===============================
// MIDDLEWARES GLOBALES
// ===============================
// Habilita CORS solo para el frontend configurado
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
// Permite recibir y parsear JSON en los requests
app.use(express.json());

// ─── POOL DE CONEXIONES ─────────────────────────────────────


// ===============================
// POOL DE CONEXIONES MYSQL
// ===============================
// pool: Pool de conexiones reutilizables para eficiencia y concurrencia
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "inmobiliaria",
  waitForConnections: true,
  connectionLimit:    10, // Máximo de conexiones simultáneas
  timezone: "Z",
});

// Verifica conexión al arrancar

// ===============================
// TEST DE CONEXIÓN AL INICIAR
// ===============================
// Verifica que la base de datos esté accesible al arrancar el servidor
pool.getConnection()
  .then(conn => { console.log("✅  Conectado a MySQL"); conn.release(); })
  .catch(err  => { console.error("❌  Error de conexión MySQL:", err.message); process.exit(1); });

// ─── HELPER ─────────────────────────────────────────────────


// ===============================
// HELPERS DE TRANSFORMACIÓN DE DATOS
// ===============================

/**
 * mapOwner(row): Mapea una fila de la tabla personas (y propiedades asociadas) al formato esperado por el frontend para propietarios.
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto propietario para frontend
 */
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

/**
 * mapTenant(row): Mapea una fila de la tabla personas al formato de inquilino para el frontend.
 */
function mapTenant(row) {
  return {
    id:      String(row.id),
    name:    `${row.nombre} ${row.apellido}`,
    email:   row.email,
    phone:   row.telefono || "",
    leaseId: row.leaseId ? String(row.leaseId) : null,
  };
}

/**
 * mapProperty(row): Mapea una fila de la tabla propiedades al formato esperado por el frontend.
 */
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

/**
 * mapLease(row): Mapea una fila de la tabla contratos al formato esperado por el frontend.
 */
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

/**
 * mapTipoToDB(tipo): Traduce el tipo de propiedad del frontend al ENUM de la base de datos.
 */
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

/**
 * mapTipo(tipo): Traduce el tipo de la base de datos al formato amigable para el frontend.
 */
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
    res.status(500).json({ error: "Error al crear propiedad" });
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
    console.error(err);
    res.status(500).json({ error: "Error al eliminar propiedad" });
  }
});

// ─── PROPIETARIOS ────────────────────────────────────────────

// GET /api/owners
app.get("/api/owners", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        pe.*,
        GROUP_CONCAT(pr.id ORDER BY pr.id) AS properties
      FROM personas pe
      LEFT JOIN propiedades pr
        ON pr.id_propietario = pe.id AND pr.activo = 1
      WHERE pe.activo = 1
        AND pe.tipo_persona IN ('propietario', 'ambos')
      GROUP BY pe.id
      ORDER BY pe.apellido, pe.nombre
    `);
    res.json(rows.map(mapOwner));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener propietarios" });
  }
});

// POST /api/owners
app.post("/api/owners", async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Faltan campos obligatorios: name, email" });
  }
  const parts = name.trim().split(" ");
  const apellido = parts.length > 1 ? parts.at(-1) : "";
  const nombre   = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  try {
    const [result] = await pool.query(
      `INSERT INTO personas
         (tipo_persona, nombre, apellido, documento_tipo, documento_nro, telefono, email, activo)
       VALUES ('propietario', ?, ?, 'DNI', ?, ?, ?, 1)`,
      [nombre, apellido, `TMP-${Date.now()}`, phone || null, email]
    );
    const [[row]] = await pool.query(
      "SELECT *, NULL AS properties FROM personas WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(mapOwner({ ...row, properties: null }));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe una persona con ese email o documento" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear propietario" });
  }
});

// PUT /api/owners/:id
app.put("/api/owners/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Faltan campos obligatorios: name, email" });
  }
  const parts = name.trim().split(" ");
  const apellido = parts.length > 1 ? parts.at(-1) : "";
  const nombre   = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  try {
    await pool.query(
      `UPDATE personas SET nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id = ? AND (tipo_persona = 'propietario' OR tipo_persona = 'ambos')`,
      [nombre, apellido, email, phone || null, id]
    );
    const [[row]] = await pool.query(
      `SELECT pe.*, GROUP_CONCAT(pr.id ORDER BY pr.id) AS properties
       FROM personas pe
       LEFT JOIN propiedades pr ON pr.id_propietario = pe.id AND pr.activo = 1
       WHERE pe.id = ?
       GROUP BY pe.id`,
      [id]
    );
    res.json(mapOwner(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar propietario" });
  }
});

// DELETE /api/owners/:id (baja lógica)
app.delete("/api/owners/:id", async (req, res) => {
  try {
    await pool.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar propietario" });
  }
});

// ─── INQUILINOS ──────────────────────────────────────────────

// GET /api/tenants
app.get("/api/tenants", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        pe.*,
        (
          SELECT c.id
          FROM contratos c
          WHERE c.inquilino_id = pe.id
            AND c.estado_contrato = 'activo'
          LIMIT 1
        ) AS leaseId
      FROM personas pe
      WHERE pe.activo = 1
        AND pe.tipo_persona IN ('inquilino', 'ambos')
      ORDER BY pe.apellido, pe.nombre
    `);
    res.json(rows.map(mapTenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener inquilinos" });
  }
});

// POST /api/tenants
app.post("/api/tenants", async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Faltan campos obligatorios: name, email" });
  }
  const parts = name.trim().split(" ");
  const apellido = parts.length > 1 ? parts.at(-1) : "";
  const nombre   = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  try {
    const [result] = await pool.query(
      `INSERT INTO personas
         (tipo_persona, nombre, apellido, documento_tipo, documento_nro, telefono, email, activo)
       VALUES ('inquilino', ?, ?, 'DNI', ?, ?, ?, 1)`,
      [nombre, apellido, `TMP-${Date.now()}`, phone || null, email]
    );
    res.status(201).json({
      id:      String(result.insertId),
      name,
      email,
      phone:   phone || "",
      leaseId: null,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe una persona con ese email o documento" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear inquilino" });
  }
});

// PUT /api/tenants/:id
app.put("/api/tenants/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Faltan campos obligatorios: name, email" });
  }
  const parts = name.trim().split(" ");
  const apellido = parts.length > 1 ? parts.at(-1) : "";
  const nombre   = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  try {
    await pool.query(
      `UPDATE personas SET nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id = ? AND (tipo_persona = 'inquilino' OR tipo_persona = 'ambos')`,
      [nombre, apellido, email, phone || null, id]
    );
    const [[row]] = await pool.query(
      `SELECT pe.*,
        (SELECT c.id FROM contratos c WHERE c.inquilino_id = pe.id AND c.estado_contrato = 'activo' LIMIT 1) AS leaseId
       FROM personas pe WHERE pe.id = ?`,
      [id]
    );
    res.json(mapTenant(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar inquilino" });
  }
});
// DELETE /api/tenants/:id (baja lógica)
app.delete("/api/tenants/:id", async (req, res) => {
  try {
    await pool.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar inquilino" });
  }
});
// ─── CONTRATOS ───────────────────────────────────────────────

// GET /api/leases
app.get("/api/leases", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM contratos
      WHERE estado_contrato NOT IN ('borrador')
      ORDER BY fecha_fin ASC
    `);
    res.json(rows.map(mapLease));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener contratos" });
  }
});

// POST /api/leases
app.post("/api/leases", async (req, res) => {
  const { propertyId, tenantId, startDate, endDate, rent, increase } = req.body;
  if (!propertyId || !tenantId || !startDate || !endDate || !rent) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Buscar el propietario de la propiedad
    const [[prop]] = await conn.query(
      "SELECT id_propietario FROM propiedades WHERE id = ?",
      [propertyId]
    );
    if (!prop) throw new Error("Propiedad no encontrada");
    const [result] = await conn.query(
      `INSERT INTO contratos
         (propiedad_id, inquilino_id, propietario_id, fecha_inicio, fecha_fin,
          monto_renta, moneda, estado_contrato, indice_ajuste)
       VALUES (?, ?, ?, ?, ?, ?, 'ARS', 'activo', ?)`,
      [
        propertyId,
        tenantId,
        prop.id_propietario,
        startDate,
        endDate,
        rent,
        increase ? `${increase}% anual` : null,
      ]
    );
    // Marcar la propiedad como alquilada
    await conn.query(
      "UPDATE propiedades SET estado = 'alquilada' WHERE id = ?",
      [propertyId]
    );
    await conn.commit();
    res.status(201).json({
      id:         String(result.insertId),
      propertyId: String(propertyId),
      tenantId:   String(tenantId),
      startDate,
      endDate,
      rent:     Number(rent),
      increase: Number(increase) || 6,
      status:   "activo",
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || "Error al crear contrato" });
  } finally {
    conn.release();
  }
});

// PUT /api/leases/:id
app.put("/api/leases/:id", async (req, res) => {
  const { id } = req.params;
  const { propertyId, tenantId, startDate, endDate, rent, increase, status } = req.body;
  if (!propertyId || !tenantId || !startDate || !endDate || !rent) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Buscar el propietario de la propiedad
    const [[prop]] = await conn.query(
      "SELECT id_propietario FROM propiedades WHERE id = ?",
      [propertyId]
    );
    if (!prop) throw new Error("Propiedad no encontrada");
    await conn.query(
      `UPDATE contratos SET propiedad_id = ?, inquilino_id = ?, propietario_id = ?, fecha_inicio = ?, fecha_fin = ?, monto_renta = ?, indice_ajuste = ?, estado_contrato = ? WHERE id = ?`,
      [
        propertyId,
        tenantId,
        prop.id_propietario,
        startDate,
        endDate,
        rent,
        increase ? `${increase}% anual` : null,
        status || "activo",
        id
      ]
    );
    await conn.commit();
    // Devolver el contrato actualizado
    const [[row]] = await conn.query(
      `SELECT * FROM contratos WHERE id = ?`,
      [id]
    );
    res.json(mapLease(row));
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || "Error al actualizar contrato" });
  } finally {
    conn.release();
  }
});

// DELETE /api/leases/:id
app.delete("/api/leases/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Obtener el contrato para saber qué propiedad liberar
    const [[lease]] = await conn.query(
      "SELECT propiedad_id FROM contratos WHERE id = ?",
      [req.params.id]
    );
    if (!lease) { await conn.rollback(); return res.status(404).json({ error: "Contrato no encontrado" }); }
    // Eliminar el contrato
    await conn.query("DELETE FROM contratos WHERE id = ?", [req.params.id]);
    // Liberar la propiedad si no tiene otro contrato activo
    const [[otro]] = await conn.query(
      "SELECT id FROM contratos WHERE propiedad_id = ? AND estado_contrato = 'activo' LIMIT 1",
      [lease.propiedad_id]
    );
    if (!otro) {
      await conn.query(
        "UPDATE propiedades SET estado = 'disponible' WHERE id = ?",
        [lease.propiedad_id]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al eliminar contrato" });
  } finally {
    conn.release();
  }
});

// DELETE /api/owners/:id  (baja lógica)
app.delete("/api/owners/:id", async (req, res) => {
  try {
    await pool.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar propietario" });
  }
});

// DELETE /api/tenants/:id  (baja lógica)
app.delete("/api/tenants/:id", async (req, res) => {
  try {
    await pool.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar inquilino" });
  }
});

// PATCH /api/leases/:id/status  — rescisión, renovación, etc.
app.patch("/api/leases/:id/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["activo", "vencido", "rescindido", "renovado"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }
  try {
    await pool.query(
      "UPDATE contratos SET estado_contrato = ? WHERE id = ?",
      [status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar estado del contrato" });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));

// ─── START ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀  PropManager API corriendo en http://localhost:${PORT}`);
});
