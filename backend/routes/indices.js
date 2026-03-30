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

// ─── Fuente 1: BCRA API v3.0 ─────────────────────────────────
// Variables correctas según documentación oficial BCRA:
//   ICL (Índice para Contratos de Locación) = variable 40
//   IPC (Índice de Precios al Consumidor)   = variable 29 (nivel general)
//   Nota: el 27 es IPC núcleo, el 29 es el general
const BCRA_VAR_IDS = { ICL: 40, IPC: 29 };

async function fetchBCRA(tipo) {
  const varId = BCRA_VAR_IDS[tipo];
  const hasta = new Date();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 18); // últimos 18 meses

  const url =
    `https://api.bcra.gob.ar/estadisticas/v3.0/datosvariable/` +
    `${varId}/${fmtFecha(desde)}/${fmtFecha(hasta)}`;

  // Usamos un AbortController para timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PropManager/1.0",
      },
      signal: controller.signal,
      // Node 18+ fetch no soporta agent directo, usamos dispatcher vía undici si disponible
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`BCRA HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const results = json.results ?? json.data ?? [];

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error(`BCRA devolvió respuesta vacía para variable ${varId}`);
    }

    return results
      .filter((r) => r.fecha && r.valor != null)
      .map((r) => ({
        fecha: String(r.fecha).slice(0, 10),
        valor: parseFloat(r.valor),
      }))
      .filter((r) => !isNaN(r.valor));
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Fuente 2: BCRA con undici (bypass SSL) ──────────────────
async function fetchBCRAUndici(tipo) {
  // Intentamos con undici que sí soporta agent/dispatcher personalizado
  try {
    const { Agent, fetch: undiciFetch } = await import("undici");
    const agent = new Agent({ connect: { rejectUnauthorized: false } });

    const varId = BCRA_VAR_IDS[tipo];
    const hasta = new Date();
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 18);

    const url =
      `https://api.bcra.gob.ar/estadisticas/v3.0/datosvariable/` +
      `${varId}/${fmtFecha(desde)}/${fmtFecha(hasta)}`;

    const res = await undiciFetch(url, {
      headers: { Accept: "application/json", "User-Agent": "PropManager/1.0" },
      dispatcher: agent,
    });

    if (!res.ok) throw new Error(`BCRA/undici HTTP ${res.status}`);
    const json = await res.json();
    const results = json.results ?? json.data ?? [];

    return results
      .filter((r) => r.fecha && r.valor != null)
      .map((r) => ({ fecha: String(r.fecha).slice(0, 10), valor: parseFloat(r.valor) }))
      .filter((r) => !isNaN(r.valor));
  } catch (e) {
    throw new Error(`BCRA/undici falló: ${e.message}`);
  }
}

// ─── Fuente 3: ArgentinaDatos.com (alternativa pública) ──────
// Endpoint público sin auth para índices argentinos
async function fetchArgentinaDatos(tipo) {
  // API alternativa: datos.gob.ar o inflacionverdadera
  const endpoints = {
    ICL: [
      "https://api.argentinadatos.com/v1/finanzas/indices/icl",
    ],
    IPC: [
      "https://api.argentinadatos.com/v1/finanzas/indices/inflacion",
    ],
  };

  const urls = endpoints[tipo] ?? [];
  let lastErr = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "PropManager/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // argentinadatos devuelve array de { fecha, valor }
      const items = Array.isArray(json) ? json : json.results ?? json.data ?? [];
      const rows = items
        .filter((r) => r.fecha && r.valor != null)
        .map((r) => ({ fecha: String(r.fecha).slice(0, 10), valor: parseFloat(r.valor) }))
        .filter((r) => !isNaN(r.valor));

      if (rows.length > 0) return rows;
      throw new Error("Respuesta vacía");
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(`ArgentinaDatos falló: ${lastErr?.message}`);
}

// ─── Fuente 4: datos.gob.ar (INDEC oficial) ──────────────────
async function fetchDatosGobAr(tipo) {
  // INDEC publica IPC en datos.gob.ar; ICL no está disponible aquí
  if (tipo !== "IPC") throw new Error("datos.gob.ar solo tiene IPC");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Dataset oficial INDEC IPC nivel general
    const url = "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&limit=24&format=json";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const data = json.data ?? [];
    return data
      .filter((r) => r[0] && r[1] != null)
      .map((r) => ({ fecha: String(r[0]).slice(0, 10), valor: parseFloat(r[1]) }))
      .filter((r) => !isNaN(r.valor));
  } catch (e) {
    throw new Error(`datos.gob.ar falló: ${e.message}`);
  }
}

// ─── Fetch con fallback en cascada ────────────────────────────
async function fetchIndice(tipo) {
  const errores = [];

  // Intento 1: BCRA nativo
  try {
    const rows = await fetchBCRA(tipo);
    if (rows.length > 0) {
      console.log(`[indices] BCRA OK para ${tipo}: ${rows.length} registros`);
      return { rows, fuente: "BCRA" };
    }
    errores.push("BCRA: respuesta vacía");
  } catch (e1) {
    errores.push(`BCRA: ${e1.message}`);
    console.warn(`[indices] BCRA falló para ${tipo}: ${e1.message}`);
  }

  // Intento 2: BCRA via undici (bypass SSL)
  try {
    const rows = await fetchBCRAUndici(tipo);
    if (rows.length > 0) {
      console.log(`[indices] BCRA/undici OK para ${tipo}: ${rows.length} registros`);
      return { rows, fuente: "BCRA/undici" };
    }
    errores.push("BCRA/undici: respuesta vacía");
  } catch (e2) {
    errores.push(`BCRA/undici: ${e2.message}`);
    console.warn(`[indices] BCRA/undici falló para ${tipo}: ${e2.message}`);
  }

  // Intento 3: ArgentinaDatos
  try {
    const rows = await fetchArgentinaDatos(tipo);
    if (rows.length > 0) {
      console.log(`[indices] ArgentinaDatos OK para ${tipo}: ${rows.length} registros`);
      return { rows, fuente: "ArgentinaDatos" };
    }
    errores.push("ArgentinaDatos: respuesta vacía");
  } catch (e3) {
    errores.push(`ArgentinaDatos: ${e3.message}`);
    console.warn(`[indices] ArgentinaDatos falló para ${tipo}: ${e3.message}`);
  }

  // Intento 4: datos.gob.ar (solo IPC)
  if (tipo === "IPC") {
    try {
      const rows = await fetchDatosGobAr(tipo);
      if (rows.length > 0) {
        console.log(`[indices] datos.gob.ar OK para ${tipo}: ${rows.length} registros`);
        return { rows, fuente: "datos.gob.ar" };
      }
      errores.push("datos.gob.ar: respuesta vacía");
    } catch (e4) {
      errores.push(`datos.gob.ar: ${e4.message}`);
      console.warn(`[indices] datos.gob.ar falló para ${tipo}: ${e4.message}`);
    }
  }

  throw new Error(`Todas las fuentes fallaron para ${tipo}:\n${errores.join("\n")}`);
}

// ─── POST /api/indices/sync ───────────────────────────────────
router.post("/sync", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultados = { ICL: 0, IPC: 0, errores: [], fuentes: {} };

    for (const tipo of ["ICL", "IPC"]) {
      let fetchResult;
      try {
        fetchResult = await fetchIndice(tipo);
      } catch (e) {
        resultados.errores.push(`${tipo}: ${e.message}`);
        console.error(`[indices/sync] Error para ${tipo}:`, e.message);
        continue;
      }

      const { rows, fuente } = fetchResult;
      resultados.fuentes[tipo] = fuente;

      for (const row of rows) {
        // Normalizar al primer día del mes
        const periodo = row.fecha.slice(0, 7) + "-01";
        const valor = row.valor;
        if (isNaN(valor) || valor <= 0) continue;

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

    // Verificar cuántos registros hay en total
    const [[countRow]] = await conn.query(
      "SELECT COUNT(*) as total FROM indices_historicos"
    );

    res.json({
      ok: true,
      ...resultados,
      totalEnBD: countRow.total,
    });
  } catch (err) {
    await conn.rollback();
    console.error("[indices/sync] Error general:", err);
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
    res.json(
      rows.map((r) => ({
        periodo: String(r.periodo).slice(0, 10),
        valor: parseFloat(r.valor),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/indices/status ─────────────────────────────────
// Devuelve cuántos registros hay por tipo (útil para debug)
router.get("/debug/status", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT tipo, COUNT(*) as total, MAX(periodo) as ultimo, MIN(periodo) as primero
       FROM indices_historicos GROUP BY tipo`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;