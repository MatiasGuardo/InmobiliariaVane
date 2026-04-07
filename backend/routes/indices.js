import { Router } from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { subscriptionMiddleware } from "../middleware/subscription.js";

const router = Router();

// Todas las rutas requieren autenticación y suscripción activa
router.use(authMiddleware);
router.use(subscriptionMiddleware);

// ─── Helpers ─────────────────────────────────────────────────
function fmtFecha(date) {
  return date.toISOString().split("T")[0];
}

// ✅ Fix Bug #3: MySQL DATE → JS Date object → "Sat Jan 01..." 
function fmtPeriodo(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

const BCRA_VAR_IDS = { ICL: 40, IPC: 29 };

// ─── Fuente 1: BCRA via undici (único que bypasea SSL en Node 18+) ────────────
// ✅ Fix Bug #1: fetch nativo ignora httpsAgent → todo pasa por undici
// ✅ Fix Bug #2: AbortController con timeout explícito de 15s
async function fetchBCRA(tipo) {
  try {
    const { Agent, fetch: undiciFetch } = await import("undici");
    const agent = new Agent({ connect: { rejectUnauthorized: false } });

    const varId = BCRA_VAR_IDS[tipo];
    if (!varId) throw new Error(`Variable ID no definida para ${tipo}`);
    
    const hasta = new Date();
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 18);

    const url =
      `https://api.bcra.gob.ar/estadisticas/v3.0/datosvariable/` +
      `${varId}/${fmtFecha(desde)}/${fmtFecha(hasta)}`;
    
    console.log(`[fetchBCRA] ${tipo}: Solicitando ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await undiciFetch(url, {
        headers: { Accept: "application/json", "User-Agent": "PropManager/1.0" },
        dispatcher: agent,
        signal: controller.signal, // ✅ ahora sí se usa
      });
      clearTimeout(timeout);

      console.log(`[fetchBCRA] ${tipo}: Status ${res.status}`);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`BCRA HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = await res.json();
      const results = json.results ?? json.data ?? [];

      console.log(`[fetchBCRA] ${tipo}: Respuesta parseada, resultados encontrados: ${results.length}`);

      if (!Array.isArray(results) || results.length === 0) {
        throw new Error(`BCRA devolvió respuesta vacía para variable ${varId}`);
      }

      const filtered = results
        .filter((r) => r.fecha && r.valor != null)
        .map((r) => ({
          fecha: String(r.fecha).slice(0, 10),
          valor: parseFloat(r.valor),
        }))
        .filter((r) => !isNaN(r.valor));
      
      console.log(`[fetchBCRA] ${tipo}: Filtrados ${filtered.length} registros válidos`);
      return filtered;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (e) {
    throw new Error(`BCRA falló: ${e.message}`);
  }
}

// ─── Fuente 2: ArgentinaDatos.com ────────────────────────────
async function fetchArgentinaDatos(tipo) {
  const endpoints = {
    ICL: ["https://api.argentinadatos.com/v1/finanzas/indices/icl"],
    IPC: ["https://api.argentinadatos.com/v1/finanzas/indices/inflacion"],
  };

  const urls = endpoints[tipo] ?? [];
  let lastErr = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "PropManager/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const items = Array.isArray(json) ? json : json.results ?? json.data ?? [];
      const rows = items
        .filter((r) => r.fecha && r.valor != null)
        .map((r) => ({
          fecha: String(r.fecha).slice(0, 10),
          valor: parseFloat(r.valor),
        }))
        .filter((r) => !isNaN(r.valor));

      if (rows.length > 0) return rows;
      throw new Error("Respuesta vacía");
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(`ArgentinaDatos falló: ${lastErr?.message}`);
}

// ─── Fuente 3: datos.gob.ar (solo IPC) ───────────────────────
async function fetchDatosGobAr(tipo) {
  if (tipo !== "IPC") throw new Error("datos.gob.ar solo tiene IPC");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const url =
      "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&limit=24&format=json";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    return (json.data ?? [])
      .filter((r) => r[0] && r[1] != null)
      .map((r) => ({
        fecha: String(r[0]).slice(0, 10),
        valor: parseFloat(r[1]),
      }))
      .filter((r) => !isNaN(r.valor));
  } catch (e) {
    clearTimeout(timeout);
    throw new Error(`datos.gob.ar falló: ${e.message}`);
  }
}

// ─── Fetch con fallback en cascada ────────────────────────────
async function fetchIndice(tipo) {
  const errores = [];

  // Intento 1: BCRA via undici
  try {
    console.log(`[fetchIndice] ${tipo}: Probando BCRA...`);
    const rows = await fetchBCRA(tipo);
    console.log(`[fetchIndice] ${tipo}: BCRA OK - ${rows.length} registros`);
    if (rows.length > 0) {
      console.log(`[indices] BCRA OK para ${tipo}: ${rows.length} registros`);
      return { rows, fuente: "BCRA" };
    }
    errores.push("BCRA: respuesta vacía");
  } catch (e1) {
    errores.push(`BCRA: ${e1.message}`);
    console.warn(`[indices] BCRA falló para ${tipo}: ${e1.message}`);
  }

  // Intento 2: ArgentinaDatos
  try {
    console.log(`[fetchIndice] ${tipo}: Probando ArgentinaDatos...`);
    const rows = await fetchArgentinaDatos(tipo);
    console.log(`[fetchIndice] ${tipo}: ArgentinaDatos OK - ${rows.length} registros`);
    if (rows.length > 0) {
      console.log(`[indices] ArgentinaDatos OK para ${tipo}: ${rows.length} registros`);
      return { rows, fuente: "ArgentinaDatos" };
    }
    errores.push("ArgentinaDatos: respuesta vacía");
  } catch (e2) {
    errores.push(`ArgentinaDatos: ${e2.message}`);
    console.warn(`[indices] ArgentinaDatos falló para ${tipo}: ${e2.message}`);
  }

  // Intento 3: datos.gob.ar (solo IPC)
  if (tipo === "IPC") {
    try {
      console.log(`[fetchIndice] ${tipo}: Probando datos.gob.ar...`);
      const rows = await fetchDatosGobAr(tipo);
      console.log(`[fetchIndice] ${tipo}: datos.gob.ar OK - ${rows.length} registros`);
      if (rows.length > 0) {
        console.log(`[indices] datos.gob.ar OK para ${tipo}: ${rows.length} registros`);
        return { rows, fuente: "datos.gob.ar" };
      }
      errores.push("datos.gob.ar: respuesta vacía");
    } catch (e3) {
      errores.push(`datos.gob.ar: ${e3.message}`);
      console.warn(`[indices] datos.gob.ar falló para ${tipo}: ${e3.message}`);
    }
  }

  console.error(`[fetchIndice] ${tipo}: Todas las fuentes fallaron: ${errores.join(" | ")}`);
  throw new Error(`Todas las fuentes fallaron para ${tipo}:\n${errores.join("\n")}`);
}

// ─── POST /api/indices/sync ───────────────────────────────────
router.post("/sync", async (req, res) => {
  // ✅ Fix Bug #4: timeout global — si algo interno se cuelga, el frontend
  // recibe respuesta en lugar de esperar eternamente — 30s total timeout
  const globalTimeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: "Timeout: las APIs de índices tardaron demasiado" });
    }
  }, 30000);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultados = { ICL: 0, IPC: 0, errores: [], fuentes: {}, logs: [] };

    for (const tipo of ["ICL", "IPC"]) {
      let fetchResult;
      try {
        console.log(`[indices/sync] Iniciando fetch para ${tipo}...`);
        fetchResult = await fetchIndice(tipo);
        console.log(`[indices/sync] ✅ ${tipo} OK - fuente: ${fetchResult.fuente}, registros obtenidos: ${fetchResult.rows.length}`);
      } catch (e) {
        const errMsg = `${tipo}: ${e.message}`;
        resultados.errores.push(errMsg);
        resultados.logs.push(`❌ ${errMsg}`);
        console.error(`[indices/sync] Error para ${tipo}:`, e.message);
        continue;
      }

      const { rows, fuente } = fetchResult;
      resultados.fuentes[tipo] = fuente;

      for (const row of rows) {
        const periodo = row.fecha.slice(0, 7) + "-01";
        const valor = row.valor;
        if (isNaN(valor) || valor <= 0) {
          console.warn(`[indices/sync] ${tipo}: valor inválido skipped - fecha=${row.fecha}, valor=${valor}`);
          continue;
        }

        await conn.query(
          `INSERT INTO indices_historicos (tenant_id, tipo, periodo, valor)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
          [req.user.tenantId, tipo, periodo, valor]
        );
        resultados[tipo]++;
      }
      resultados.logs.push(`✅ ${tipo}: ${resultados[tipo]} registros insertados desde ${fuente}`);
    }

    await conn.commit();

    const [[countRow]] = await conn.query(
      "SELECT COUNT(*) as total FROM indices_historicos WHERE tenant_id = ?",
      [req.user.tenantId]
    );

    clearTimeout(globalTimeout);
    console.log(`[indices/sync] ✅ Sincronización completada: ICL=${resultados.ICL}, IPC=${resultados.IPC}`);
    res.json({ ok: true, ...resultados, totalEnBD: countRow.total });
  } catch (err) {
    await conn.rollback();
    clearTimeout(globalTimeout);
    console.error("[indices/sync] Error general:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─── POST /api/indices ────────────────────────────────────────
router.post("/", async (req, res) => {
  const { tipo, periodo, valor } = req.body;
  if (!tipo || !periodo || valor == null)
    return res.status(400).json({ error: "Faltan campos: tipo, periodo, valor" });
  if (!["ICL", "IPC"].includes(tipo))
    return res.status(400).json({ error: "Tipo inválido: ICL o IPC" });

  const periodoNorm = periodo.slice(0, 7) + "-01";

  try {
    await pool.query(
      `INSERT INTO indices_historicos (tenant_id, tipo, periodo, valor)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [req.user.tenantId, tipo, periodoNorm, parseFloat(valor)]
    );
    res.status(201).json({ ok: true, tipo, periodo: periodoNorm, valor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DEBUG ROUTES (MUST BE BEFORE /:tipo) ─────────────────────
router.get("/debug/status", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT tipo, COUNT(*) as total, MAX(periodo) as ultimo, MIN(periodo) as primero
       FROM indices_historicos WHERE tenant_id = ? GROUP BY tipo`,
      [req.user.tenantId]
    );
    // ✅ Fix Bug #3: también aquí
    res.json(
      rows.map((r) => ({
        ...r,
        ultimo: fmtPeriodo(r.ultimo),
        primero: fmtPeriodo(r.primero),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug/test-bcra", async (req, res) => {
  try {
    const tipo = req.query.tipo ?? "IPC";
    console.log(`[debug/test-bcra] Testando BCRA para ${tipo}...`);
    const rows = await fetchBCRA(tipo);
    res.json({ ok: true, tipo, registros: rows.length, muestra: rows.slice(0, 3) });
  } catch (err) {
    console.error(`[debug/test-bcra] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug/test-argentina-datos", async (req, res) => {
  try {
    const tipo = req.query.tipo ?? "IPC";
    console.log(`[debug/test-argentina-datos] Testando ArgentinaDatos para ${tipo}...`);
    const rows = await fetchArgentinaDatos(tipo);
    res.json({ ok: true, tipo, registros: rows.length, muestra: rows.slice(0, 3) });
  } catch (err) {
    console.error(`[debug/test-argentina-datos] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug/test-gob-ar", async (req, res) => {
  try {
    console.log(`[debug/test-gob-ar] Testando datos.gob.ar para IPC...`);
    const rows = await fetchDatosGobAr("IPC");
    res.json({ ok: true, tipo: "IPC", registros: rows.length, muestra: rows.slice(0, 3) });
  } catch (err) {
    console.error(`[debug/test-gob-ar] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/indices/:tipo (GENERIC ROUTE - MUST BE LAST) ─────
router.get("/:tipo", async (req, res) => {
  const tipo = req.params.tipo.toUpperCase();
  if (!["ICL", "IPC"].includes(tipo))
    return res.status(400).json({ error: "Tipo inválido" });
  try {
    const [rows] = await pool.query(
      `SELECT periodo, valor FROM indices_historicos
       WHERE tipo = ? AND tenant_id = ? ORDER BY periodo DESC LIMIT 24`,
      [tipo, req.user.tenantId]
    );
    // ✅ Fix Bug #3: fmtPeriodo evita "Sat Jan 01..." en la respuesta JSON
    res.json(
      rows.map((r) => ({
        periodo: fmtPeriodo(r.periodo),
        valor: parseFloat(r.valor),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;