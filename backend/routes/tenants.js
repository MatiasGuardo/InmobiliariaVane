import { Router } from "express";
import { pool } from "../db.js";
import { mapTenant, splitName } from "../mappers.js";

const router = Router();

// GET /api/tenants
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pe.*,
        (SELECT c.id FROM contratos c WHERE c.inquilino_id = pe.id AND c.estado_contrato = 'activo' LIMIT 1) AS leaseId
      FROM personas pe
      WHERE pe.activo = 1 AND pe.tipo_persona IN ('inquilino', 'ambos')
      ORDER BY pe.apellido, pe.nombre
    `);
    res.json(rows.map(mapTenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener inquilinos" });
  }
});

// POST /api/tenants
router.post("/", async (req, res) => {
  const { name, email, phone, document } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan campos: name, email" });
  if (!email.includes("@")) return res.status(400).json({ error: "Ingrese un mail válido" });
  const { nombre, apellido } = splitName(name);
  try {
    const [result] = await pool.query(
      `INSERT INTO personas (tipo_persona, nombre, apellido, documento_tipo, documento_nro, telefono, email, activo)
       VALUES ('inquilino', ?, ?, 'DNI', ?, ?, ?, 1)`,
      [nombre, apellido, document || null, phone || null, email]
    );
    const [[row]] = await pool.query(
      `SELECT pe.*,
         (SELECT c.id FROM contratos c WHERE c.inquilino_id = pe.id AND c.estado_contrato = 'activo' LIMIT 1) AS leaseId
       FROM personas pe WHERE pe.id = ?`,
      [result.insertId]
    );
    res.status(201).json(mapTenant(row));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ya existe una persona con ese email o documento" });
    console.error(err);
    res.status(500).json({ error: "Error al crear inquilino" });
  }
});

// PUT /api/tenants/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, document } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan campos: name, email" });
  if (!email.includes("@")) return res.status(400).json({ error: "Ingrese un mail válido" });
  const { nombre, apellido } = splitName(name);
  try {
    await pool.query(
      `UPDATE personas SET nombre = ?, apellido = ?, email = ?, telefono = ?, documento_nro = ?
       WHERE id = ? AND tipo_persona IN ('inquilino', 'ambos')`,
      [nombre, apellido, email, phone || null, document || null, id]
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

// DELETE /api/tenants/:id
// Cascada: contrato activo → documentos del contrato → propiedad queda disponible → inquilino baja lógica
router.delete("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obtener contrato activo del inquilino
    const [contratos] = await conn.query(
      "SELECT id, propiedad_id FROM contratos WHERE inquilino_id = ? AND estado_contrato = 'activo'",
      [req.params.id]
    );

    for (const contrato of contratos) {
      // 2. Eliminar documentos del contrato
      await conn.query(
        "DELETE FROM documentos WHERE entity_type = 'lease' AND entity_id = ?",
        [contrato.id]
      );

      // 3. Eliminar el contrato
      await conn.query("DELETE FROM contratos WHERE id = ?", [contrato.id]);

      // 4. Poner la propiedad como disponible
      await conn.query(
        "UPDATE propiedades SET estado = 'disponible' WHERE id = ?",
        [contrato.propiedad_id]
      );
    }

    // 5. Dar de baja al inquilino
    await conn.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al eliminar inquilino" });
  } finally {
    conn.release();
  }
});

export default router;