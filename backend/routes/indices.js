import { Router } from "express";
import { pool } from "../db.js";
import https from "https";

const router = Router();

// ─── Config SSL (BCRA tiene cert con problemas frecuentes) ────
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Formatea un Date como "YYYY-MM-DD"
function fmtFecha(date) {
  return date.toISOString().split("T")[0];
}

// ─── Fuente 1: argly.com.ar (sin auth, datos oficiales diarios) ──
// Endpoints: https://api.argly.com.ar/api/icl  |  /api/ipc
// Respuesta: { fecha: "YYYY-MM-DD", valor: number } o array del mismo
async function fetchArgly(tipo) {
  const endpoint = tipo === "ICL" ? "icl" : "ipc";
  const res = await fetch(`https://api.argly.com.ar/api/${endpoint}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Argly HTTP ${res.status}`);
  const json = await res.json();

  // Puede devolver un objeto único (último valor) o un array histórico
  const items = Array.isArray(json) ? json : [json];
  return items
    .filter(r => r.fecha && r.valor != null)
    .map(r => ({ fecha: r.fecha.slice(0, 10), valor: parseFloat(r.valor) }));
}

// ─── Fuente 2: BCRA v3.0 (fallback) ─────────────────────────
// Variables: ICL = 40, IPC = 27
const BCRA_VAR_IDS = { ICL: 40, IPC: 27 };

async function fetchBCRA(tipo) {
  const varId = BCRA_VAR_IDS[tipo];
  const hasta = new Date();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 14);

  const url =
    `https://api.bcra.gob.ar/estadisticas/v3.0/datosvariable/` +
    `${varId}/${fmtFecha(desde)}/${fmtFecha(hasta)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    agent: httpsAgent,
  });
  if (!res.ok) throw new Error(`BCRA HTTP ${res.status}`);
  const json = await res.json();

  return (json.results ?? [])
    .filter(r => r.fecha && r.valor != null)
    .map(r => ({ fecha: r.fecha.slice(0, 10), valor: parseFloat(r.valor) }));
}

// ─── Fetch con fallback ───────────────────────────────────────
async function fetchIndice(tipo) {
  try {
    const rows = await fetchArgly(tipo);
    if (rows.length > 0) return rows;
    throw new Error("Argly devolvió datos vacíos");
  } catch (e1) {
    console.warn(`[indices] Argly falló para ${tipo}: ${e1.message}. Intentando BCRA…`);
    try {
      return await fetchBCRA(tipo);
    } catch (e2) {
      throw new Error(`Ambas fuentes fallaron. Argly: ${e1.message} | BCRA: ${e2.message}`);
    }
  }
}

// ─── POST /api/indices/sync ───────────────────────────────────
router.post("/sync", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultados = { ICL: 0, IPC: 0, errores: [] };

    for (const tipo of ["ICL", "IPC"]) {
      let rows;
      try {
        rows = await fetchIndice(tipo);
      } catch (e) {
        resultados.errores.push(`${tipo}: ${e.message}`);
        continue;
      }

      for (const row of rows) {
        // Normalizar al primer día del mes
        const periodo = row.fecha.slice(0, 7) + "-01";
        const valor   = row.valor;
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
    res.json(rows.map((r) => ({
      periodo: String(r.periodo).slice(0, 10),
      valor:   parseFloat(r.valor),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;