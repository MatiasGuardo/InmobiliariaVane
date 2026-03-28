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
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan campos: name, email" });
  const { nombre, apellido } = splitName(name);
  try {
    const [result] = await pool.query(
      `INSERT INTO personas (tipo_persona, nombre, apellido, documento_tipo, documento_nro, telefono, email, activo)
       VALUES ('inquilino', ?, ?, 'DNI', ?, ?, ?, 1)`,
      [nombre, apellido, `TMP-${Date.now()}`, phone || null, email]
    );
    res.status(201).json({ id: String(result.insertId), name, email, phone: phone || "", leaseId: null });
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
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan campos: name, email" });
  const { nombre, apellido } = splitName(name);
  try {
    await pool.query(
      `UPDATE personas SET nombre = ?, apellido = ?, email = ?, telefono = ?
       WHERE id = ? AND tipo_persona IN ('inquilino', 'ambos')`,
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
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar inquilino" });
  }
});

export default router;