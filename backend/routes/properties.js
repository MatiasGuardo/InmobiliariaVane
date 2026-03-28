import { Router } from "express";
import { pool } from "../db.js";
import { mapProperty, mapTipoDB } from "../mappers.js";

const router = Router();

// GET /api/properties
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*,
        (SELECT c.id FROM contratos c WHERE c.propiedad_id = p.id AND c.estado_contrato = 'activo' LIMIT 1) AS leaseId
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
router.post("/", async (req, res) => {
  const { address, type, price, status, ownerId } = req.body;
  if (!address || !price || !ownerId)
    return res.status(400).json({ error: "Faltan campos: address, price, ownerId" });

  const parts  = address.split(",");
  const dir    = parts[0]?.trim() || address;
  const numero = parts.slice(1).join(",").trim() || null;
  const estado = status === "ocupado" ? "alquilada" : "disponible";

  try {
    const [result] = await pool.query(
      `INSERT INTO propiedades (id_propietario, direccion, numero, ciudad, codigo_postal, tipo, estado, precio_lista, moneda, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ARS', 1)`,
      [ownerId, dir, numero, "Buenos Aires", "1000", mapTipoDB(type), estado, price]
    );
    const [[row]] = await pool.query("SELECT p.*, NULL AS leaseId FROM propiedades p WHERE p.id = ?", [result.insertId]);
    res.status(201).json(mapProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear propiedad" });
  }
});

// PUT /api/properties/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { address, type, price, status, ownerId } = req.body;
  const parts  = (address || "").split(",");
  const dir    = parts[0]?.trim() || address;
  const numero = parts.slice(1).join(",").trim() || null;
  const estado = status === "ocupado" ? "alquilada" : "disponible";

  try {
    await pool.query(
      `UPDATE propiedades SET direccion = ?, numero = ?, tipo = ?, estado = ?, precio_lista = ?, id_propietario = ? WHERE id = ?`,
      [dir, numero, mapTipoDB(type), estado, price, ownerId, id]
    );
    const [[row]] = await pool.query(
      `SELECT p.*, (SELECT c.id FROM contratos c WHERE c.propiedad_id = p.id AND c.estado_contrato = 'activo' LIMIT 1) AS leaseId FROM propiedades p WHERE p.id = ?`,
      [id]
    );
    res.json(mapProperty(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar propiedad" });
  }
});

// DELETE /api/properties/:id (baja lógica)
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("UPDATE propiedades SET activo = 0 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar propiedad" });
  }
});

export default router;