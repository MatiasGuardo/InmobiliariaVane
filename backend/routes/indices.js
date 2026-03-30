import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

const BCRA_BASE = "https://api.bcra.gob.ar/estadisticas/v3.0/monetarias";

// Variable 7 = ICL, Variable 28 = IPC (inflación mensual)
const BCRA_VARS = { ICL: 7, IPC: 28 };

async function fetchBCRA(varId) {
  const res = await fetch(`${BCRA_BASE}/${varId}?limit=12`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`BCRA HTTP ${res.status}`);
  const json = await res.json();
  // Devuelve array de { fecha: "YYYY-MM-DD", valor: number }
  return json.results ?? [];
}

// ─── POST /api/indices/sync ───────────────────────────────────
// Sincroniza ICL e IPC desde el BCRA y guarda en indices_historicos
router.post("/sync", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultados = { ICL: 0, IPC: 0, errores: [] };

    for (const [tipo, varId] of Object.entries(BCRA_VARS)) {
      let rows;
      try {
        rows = await fetchBCRA(varId);
      } catch (e) {
        resultados.errores.push(`${tipo}: ${e.message}`);
        continue;
      }

      for (const row of rows) {
        // La API del BCRA da datos diarios para ICL y mensuales para IPC
        // Normalizamos al primer día del mes para consistencia
        const periodo = row.fecha.slice(0, 7) + "-01";
        const valor   = parseFloat(row.valor);
        if (isNaN(valor)) continue;

        await conn.query(
          `INSERT INTO indices_historicos (tipo, periodo, valor)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
          [tipo, periodo, valor]
        );
        resultados[tipo]++;
      }
    }

    await conn.commit();
    res.json({ ok: true, ...resultados });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─── POST /api/indices ────────────────────────────────────────
// Carga manual de un valor de índice
router.post("/", async (req, res) => {
  const { tipo, periodo, valor } = req.body;
  if (!tipo || !periodo || valor == null)
    return res.status(400).json({ error: "Faltan campos: tipo, periodo, valor" });
  if (!["ICL", "IPC"].includes(tipo))
    return res.status(400).json({ error: "Tipo inválido: ICL o IPC" });

  const periodoNorm = periodo.slice(0, 7) + "-01";

  try {
    await pool.query(
      `INSERT INTO indices_historicos (tipo, periodo, valor)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [tipo, periodoNorm, parseFloat(valor)]
    );
    res.status(201).json({ ok: true, tipo, periodo: periodoNorm, valor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/indices/:tipo ───────────────────────────────────
// Lista últimos 24 registros (ya existía en leases.js, migramos aquí)
router.get("/:tipo", async (req, res) => {
  const tipo = req.params.tipo.toUpperCase();
  if (!["ICL", "IPC"].includes(tipo))
    return res.status(400).json({ error: "Tipo inválido" });
  try {
    const [rows] = await pool.query(
      `SELECT periodo, valor FROM indices_historicos
       WHERE tipo = ? ORDER BY periodo DESC LIMIT 24`,
      [tipo]
    );
    res.json(rows.map(r => ({
      periodo: String(r.periodo).slice(0, 10),
      valor:   parseFloat(r.valor),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;