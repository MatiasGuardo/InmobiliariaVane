import { Router } from "express";
import { pool } from "../db.js";
import { mapOwner, splitName } from "../mappers.js";

const router = Router();

// GET /api/owners
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pe.*, GROUP_CONCAT(pr.id ORDER BY pr.id) AS properties
      FROM personas pe
      LEFT JOIN propiedades pr ON pr.id_propietario = pe.id AND pr.activo = 1
      WHERE pe.activo = 1 AND pe.tipo_persona IN ('propietario', 'ambos')
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
router.post("/", async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan campos: name, email" });
  const { nombre, apellido } = splitName(name);
  try {
    const [result] = await pool.query(
      `INSERT INTO personas (tipo_persona, nombre, apellido, documento_tipo, documento_nro, telefono, email, activo)
       VALUES ('propietario', ?, ?, 'DNI', ?, ?, ?, 1)`,
      [nombre, apellido, `TMP-${Date.now()}`, phone || null, email]
    );
    const [[row]] = await pool.query("SELECT *, NULL AS properties FROM personas WHERE id = ?", [result.insertId]);
    res.status(201).json(mapOwner({ ...row, properties: null }));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ya existe una persona con ese email o documento" });
    console.error(err);
    res.status(500).json({ error: "Error al crear propietario" });
  }
});

// PUT /api/owners/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan campos: name, email" });
  const { nombre, apellido } = splitName(name);
  try {
    await pool.query(
      `UPDATE personas SET nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id = ? AND tipo_persona IN ('propietario', 'ambos')`,
      [nombre, apellido, email, phone || null, id]
    );
    const [[row]] = await pool.query(
      `SELECT pe.*, GROUP_CONCAT(pr.id ORDER BY pr.id) AS properties
       FROM personas pe LEFT JOIN propiedades pr ON pr.id_propietario = pe.id AND pr.activo = 1
       WHERE pe.id = ? GROUP BY pe.id`,
      [id]
    );
    res.json(mapOwner(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar propietario" });
  }
});

// DELETE /api/owners/:id (baja lógica)
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("UPDATE personas SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar propietario" });
  }
});

export default router;