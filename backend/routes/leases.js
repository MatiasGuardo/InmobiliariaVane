import { Router } from "express";
import { pool } from "../../db.js";
import { mapLease } from "../mappers.js";

const router = Router();

// GET /api/leases
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM contratos
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
router.post("/", async (req, res) => {
  const { propertyId, tenantId, startDate, endDate, rent, increase } = req.body;
  if (!propertyId || !tenantId || !startDate || !endDate || !rent)
    return res.status(400).json({ error: "Faltan campos obligatorios" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[prop]] = await conn.query(
      "SELECT id_propietario FROM propiedades WHERE id = ?", [propertyId]
    );
    if (!prop) throw new Error("Propiedad no encontrada");

    const [result] = await conn.query(
      `INSERT INTO contratos
         (propiedad_id, inquilino_id, propietario_id, fecha_inicio, fecha_fin,
          monto_renta, moneda, estado_contrato, indice_ajuste)
       VALUES (?, ?, ?, ?, ?, ?, 'ARS', 'activo', ?)`,
      [propertyId, tenantId, prop.id_propietario, startDate, endDate, rent,
       increase ? `${increase}% anual` : null]
    );

    await conn.query("UPDATE propiedades SET estado = 'alquilada' WHERE id = ?", [propertyId]);
    await conn.commit();

    res.status(201).json({
      id: String(result.insertId),
      propertyId: String(propertyId),
      tenantId:   String(tenantId),
      startDate, endDate,
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
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { propertyId, tenantId, startDate, endDate, rent, increase, status } = req.body;
  if (!propertyId || !tenantId || !startDate || !endDate || !rent)
    return res.status(400).json({ error: "Faltan campos obligatorios" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[prop]] = await conn.query(
      "SELECT id_propietario FROM propiedades WHERE id = ?", [propertyId]
    );
    if (!prop) throw new Error("Propiedad no encontrada");

    await conn.query(
      `UPDATE contratos SET
         propiedad_id = ?, inquilino_id = ?, propietario_id = ?,
         fecha_inicio = ?, fecha_fin = ?, monto_renta = ?,
         indice_ajuste = ?, estado_contrato = ?
       WHERE id = ?`,
      [propertyId, tenantId, prop.id_propietario, startDate, endDate, rent,
       increase ? `${increase}% anual` : null, status || "activo", id]
    );

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

// DELETE /api/leases/:id
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

// PATCH /api/leases/:id/status
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const valid = ["activo", "vencido", "rescindido", "renovado"];
  if (!valid.includes(status))
    return res.status(400).json({ error: "Estado inválido" });
  try {
    await pool.query(
      "UPDATE contratos SET estado_contrato = ? WHERE id = ?", [status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar estado del contrato" });
  }
});

export default router;