import { Router } from "express";
import { pool, columnExists }    from "../db.js";
import { mapLease } from "../mappers.js";
import { authMiddleware } from "../middleware/auth.js";
import { subscriptionMiddleware } from "../middleware/subscription.js";

const router = Router();

// Todas las rutas requieren autenticación y suscripción activa
router.use(authMiddleware);
router.use(subscriptionMiddleware);

// ─── Helpers ─────────────────────────────────────────────────

// Construye el string legado para compatibilidad con registros FIJO viejos
function buildIndiceAjuste(increase, period) {
  if (!increase) return null;
  const p = ["trimestral", "cuatrimestral", "semestral", "anual"].includes(period) ? period : "anual";
  return `${increase}% ${p}`;
}

// Obtiene el valor más reciente del índice <= fecha dada
async function getIndiceBase(conn, tipo, fecha) {
  const primerDia = fecha.slice(0, 7) + "-01";
  const [rows] = await conn.query(
    `SELECT valor FROM indices_historicos
     WHERE tipo = ? AND periodo <= ?
     ORDER BY periodo DESC LIMIT 1`,
    [tipo, primerDia]
  );
  return rows.length ? parseFloat(rows[0].valor) : null;
}

// Calcula la próxima fecha de actualización a partir de una fecha base
function calcProximaActualizacion(fechaInicio, periodo) {
  const months = { trimestral: 3, cuatrimestral: 4, semestral: 6, anual: 12 }[periodo] ?? 12;
  const d = new Date(fechaInicio);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// ─── GET /api/leases ──────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM contratos
      WHERE estado_contrato NOT IN ('borrador') AND tenant_id = ?
      ORDER BY fecha_fin ASC
    `, [req.user.tenantId]);
    res.json(rows.map(mapLease));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener contratos" });
  }
});

// ─── POST /api/leases ─────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    propertyId, tenantId, startDate, endDate, rent,
    // Ajuste
    tipoAjuste = "FIJO",   // "FIJO" | "ICL" | "IPC"
    increase,              // solo para FIJO
    iclVariacion,          // % por período para ICL (ingresado manualmente)
    period = "anual",      // trimestral | cuatrimestral | semestral | anual
  } = req.body;

  if (!propertyId || !tenantId || !startDate || !endDate || !rent)
    return res.status(400).json({ error: "Faltan campos obligatorios" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[prop]] = await conn.query(
      "SELECT id_propietario FROM propiedades WHERE id = ? AND tenant_id = ?", [propertyId, req.user.tenantId]
    );
    if (!prop) throw new Error("Propiedad no encontrada");

    // Validar que el inquilino tenga email válido
    const [[tenant]] = await conn.query(
      "SELECT email FROM personas WHERE id = ? AND activo = 1 AND tenant_id = ?", [tenantId, req.user.tenantId]
    );
    if (!tenant) throw new Error("Inquilino no encontrado");
    if (!tenant.email || !tenant.email.includes("@"))
      throw new Error("El inquilino debe tener un email válido para crear un contrato");

    // ── Índice base ──
    // ICL: el usuario ingresa la variación manualmente → se guarda directamente como porcentaje
    // IPC: necesita el valor histórico base para comparar al momento del ajuste
    let indiceBaseValor = null;
    let indiceBaseFecha = null;
    if (tipoAjuste === "ICL") {
      if (!iclVariacion || isNaN(parseFloat(iclVariacion)))
        throw new Error("Ingresá la variación ICL por período para continuar.");
      indiceBaseValor = parseFloat(iclVariacion);
      indiceBaseFecha = startDate.slice(0, 7) + "-01";
    } else if (tipoAjuste === "IPC") {
      indiceBaseValor = await getIndiceBase(conn, "IPC", startDate);
      if (!indiceBaseValor) throw new Error(
        `No se encontró valor de IPC para la fecha ${startDate}. ` +
        `Sincronizá los índices desde el panel de índices.`
      );
      indiceBaseFecha = startDate.slice(0, 7) + "-01";
    }

    // ── Próxima actualización ──
    const proximaActualizacion = calcProximaActualizacion(startDate, period);

    // ── String legado (compatibilidad) ──
    const indiceAjuste = tipoAjuste === "FIJO"
      ? buildIndiceAjuste(increase, period)
      : null;

    // ── Columnas nuevas (si existen en la BD) ──
    // Intentamos escribir en tipo_ajuste / periodo_ajuste / porcentaje_ajuste
    // Si las columnas no existen, caemos al modo legado graciosamente
    let insertQuery;
    let insertParams;

    // Verificar si existen las columnas nuevas (cacheado en db.js)
    const hasNewCols = await columnExists("contratos", "tipo_ajuste");

    if (hasNewCols) {
      insertQuery = `
        INSERT INTO contratos
          (tenant_id, propiedad_id, inquilino_id, propietario_id, fecha_inicio, fecha_fin,
           monto_renta, moneda, estado_contrato,
           indice_ajuste,
           tipo_ajuste, periodo_ajuste, porcentaje_ajuste,
           indice_base_fecha, indice_base_valor, proxima_actualizacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ARS', 'activo', ?, ?, ?, ?, ?, ?, ?)`;
      insertParams = [
        req.user.tenantId,
        propertyId, tenantId, prop.id_propietario,
        startDate, endDate, rent,
        indiceAjuste,
        tipoAjuste, period,
        tipoAjuste === "FIJO" ? (Number(increase) || 0) : null,
        indiceBaseFecha, indiceBaseValor, proximaActualizacion,
      ];
    } else {
      // Fallback: solo columnas legacy
      insertQuery = `
        INSERT INTO contratos
          (tenant_id, propiedad_id, inquilino_id, propietario_id, fecha_inicio, fecha_fin,
           monto_renta, moneda, estado_contrato, indice_ajuste)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ARS', 'activo', ?)`;
      insertParams = [
        req.user.tenantId,
        propertyId, tenantId, prop.id_propietario,
        startDate, endDate, rent, indiceAjuste,
      ];
    }

    const [result] = await conn.query(insertQuery, insertParams);

    await conn.query(
      "UPDATE propiedades SET estado = 'alquilada' WHERE id = ? AND tenant_id = ?", [propertyId, req.user.tenantId]
    );

    await conn.commit();

    const resolvedPeriod = ["trimestral", "cuatrimestral", "semestral", "anual"].includes(period) ? period : "anual";

    res.status(201).json({
      id:         String(result.insertId),
      propertyId: String(propertyId),
      tenantId:   String(tenantId),
      startDate, endDate,
      rent:     Number(rent),
      tipoAjuste,
      increase: tipoAjuste === "FIJO" ? (Number(increase) || 6) : 0,
      period:   resolvedPeriod,
      indiceBaseValor,
      indiceBaseFecha,
      proximaActualizacion,
      status: "activo",
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || "Error al crear contrato" });
  } finally {
    conn.release();
  }
});

// ─── PUT /api/leases/:id ──────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    propertyId, tenantId, startDate, endDate, rent,
    tipoAjuste = "FIJO",
    increase,
    iclVariacion,
    period = "anual",
    status,
  } = req.body;

  if (!propertyId || !tenantId || !startDate || !endDate || !rent)
    return res.status(400).json({ error: "Faltan campos obligatorios" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[prop]] = await conn.query(
      "SELECT id_propietario FROM propiedades WHERE id = ? AND tenant_id = ?", [propertyId, req.user.tenantId]
    );
    if (!prop) throw new Error("Propiedad no encontrada");

    // Validar que el inquilino tenga email válido
    const [[tenant]] = await conn.query(
      "SELECT email FROM personas WHERE id = ? AND activo = 1 AND tenant_id = ?", [tenantId, req.user.tenantId]
    );
    if (!tenant) throw new Error("Inquilino no encontrado");
    if (!tenant.email || !tenant.email.includes("@"))
      throw new Error("El inquilino debe tener un email válido para crear un contrato");

    let indiceBaseValor = null;
    let indiceBaseFecha = null;
    if (tipoAjuste === "ICL") {
      if (!iclVariacion || isNaN(parseFloat(iclVariacion)))
        throw new Error("Ingresá la variación ICL por período para continuar.");
      indiceBaseValor = parseFloat(iclVariacion);
      indiceBaseFecha = startDate.slice(0, 7) + "-01";
    } else if (tipoAjuste === "IPC") {
      indiceBaseValor = await getIndiceBase(conn, "IPC", startDate);
      if (!indiceBaseValor) throw new Error(
        `No se encontró valor de IPC para la fecha ${startDate}. Sincronizá los índices.`
      );
      indiceBaseFecha = startDate.slice(0, 7) + "-01";
    }

    const proximaActualizacion = calcProximaActualizacion(startDate, period);
    const indiceAjuste = tipoAjuste === "FIJO" ? buildIndiceAjuste(increase, period) : null;

    // Verificar si existen las columnas nuevas (cacheado en db.js)
    const hasNewCols = await columnExists("contratos", "tipo_ajuste");

    if (hasNewCols) {
      await conn.query(
        `UPDATE contratos SET
           propiedad_id = ?, inquilino_id = ?, propietario_id = ?,
           fecha_inicio = ?, fecha_fin = ?, monto_renta = ?,
           indice_ajuste = ?,
           tipo_ajuste = ?, periodo_ajuste = ?, porcentaje_ajuste = ?,
           indice_base_fecha = ?, indice_base_valor = ?,
           proxima_actualizacion = ?,
           estado_contrato = ?
         WHERE id = ?`,
        [
          propertyId, tenantId, prop.id_propietario,
          startDate, endDate, rent,
          indiceAjuste,
          tipoAjuste, period,
          tipoAjuste === "FIJO" ? (Number(increase) || 0) : null,
          indiceBaseFecha, indiceBaseValor,
          proximaActualizacion,
          status || "activo",
          id,
        ]
      );
    } else {
      await conn.query(
        `UPDATE contratos SET
           propiedad_id = ?, inquilino_id = ?, propietario_id = ?,
           fecha_inicio = ?, fecha_fin = ?, monto_renta = ?,
           indice_ajuste = ?, estado_contrato = ?
         WHERE id = ?`,
        [propertyId, tenantId, prop.id_propietario, startDate, endDate, rent,
         indiceAjuste, status || "activo", id]
      );
    }

    await conn.commit();
    const [[row]] = await pool.query("SELECT * FROM contratos WHERE id = ?", [id]);
    res.json(mapLease(row));
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || "Error al actualizar contrato" });
  } finally {
    conn.release();
  }
});

// ─── DELETE /api/leases/:id ───────────────────────────────────
router.delete("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[lease]] = await conn.query(
      "SELECT propiedad_id FROM contratos WHERE id = ?", [req.params.id]
    );
    if (!lease) {
      await conn.rollback();
      return res.status(404).json({ error: "Contrato no encontrado" });
    }

    await conn.query("DELETE FROM contratos WHERE id = ?", [req.params.id]);

    const [[otro]] = await conn.query(
      "SELECT id FROM contratos WHERE propiedad_id = ? AND estado_contrato = 'activo' LIMIT 1",
      [lease.propiedad_id]
    );
    if (!otro) {
      await conn.query(
        "UPDATE propiedades SET estado = 'disponible' WHERE id = ?", [lease.propiedad_id]
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

// ─── PATCH /api/leases/:id/status ────────────────────────────
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const valid = ["activo", "vencido", "rescindido", "renovado"];
  if (!valid.includes(status))
    return res.status(400).json({ error: "Estado inválido" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE contratos SET estado_contrato = ? WHERE id = ?", [status, req.params.id]
    );
    if (status !== "activo") {
      const [[lease]] = await conn.query(
        "SELECT propiedad_id FROM contratos WHERE id = ?", [req.params.id]
      );
      if (lease) {
        const [[otro]] = await conn.query(
          "SELECT id FROM contratos WHERE propiedad_id = ? AND estado_contrato = 'activo' LIMIT 1",
          [lease.propiedad_id]
        );
        if (!otro) {
          await conn.query(
            "UPDATE propiedades SET estado = 'disponible' WHERE id = ?", [lease.propiedad_id]
          );
        }
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al actualizar estado del contrato" });
  } finally {
    conn.release();
  }
});

// ─── GET /api/leases/indices/:tipo ───────────────────────────
// Devuelve los últimos 12 registros del índice para mostrar en el frontend
router.get("/indices/:tipo", async (req, res) => {
  const tipo = req.params.tipo.toUpperCase();
  if (!["ICL", "IPC"].includes(tipo))
    return res.status(400).json({ error: "Tipo inválido. Usar ICL o IPC." });
  try {
    const [rows] = await pool.query(
      `SELECT periodo, valor FROM indices_historicos
       WHERE tipo = ?
       ORDER BY periodo DESC LIMIT 12`,
      [tipo]
    );
    res.json(rows.map(r => ({
      periodo: r.periodo instanceof Date
        ? r.periodo.toISOString().split("T")[0]
        : String(r.periodo).slice(0, 10),
      valor: parseFloat(r.valor),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener índices" });
  }
});

export default router;