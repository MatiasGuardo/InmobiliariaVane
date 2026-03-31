// frontend/src/components/leases/AjusteSelector.jsx
import { Info, AlertTriangle, RefreshCw, Check, ExternalLink, Calculator, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Field, Input } from "../ui/FormField";
import { useIndice } from "../../hooks/useIndice";
import { AjusteCalculadora } from "./ajusteCalculadora";
import { API } from "../../utils/helpers";

// ─── Helper: format periodo seguro ───────────────────────────
function fmtPeriodo(val) {
  if (!val) return "—";
  if (val instanceof Date) return val.toISOString().slice(0, 7);
  const s = String(val);
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
  return s.slice(0, 7);
}

// ─── Botón de sincronización ──────────────────────────────────
export function SyncIndicesButton({ onSuccess, compact = false }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult]   = useState(null);

  const sync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res  = await fetch(`${API}/api/indices/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const hasData = (data.ICL ?? 0) > 0 || (data.IPC ?? 0) > 0;
      const fuentes = data.fuentes
        ? Object.entries(data.fuentes).map(([k, v]) => `${k}: ${v}`).join(", ")
        : "";

      if (hasData) {
        setResult({ ok: true, msg: `✓ ICL: ${data.ICL ?? 0} reg. · IPC: ${data.IPC ?? 0} reg.${fuentes ? ` (${fuentes})` : ""}` });
        onSuccess?.();
      } else if (data.errores?.length) {
        setResult({ ok: false, msg: `Sin datos: ${data.errores.join(" | ")}` });
      } else {
        setResult({ ok: true, msg: "Ya estaba actualizado." });
        onSuccess?.();
      }
    } catch (e) {
      setResult({ ok: false, msg: `Error de red: ${e.message}` });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <button
        type="button"
        onClick={sync}
        disabled={syncing}
        className={`flex items-center gap-2 font-medium transition-colors rounded-xl disabled:opacity-50 ${
          compact
            ? "text-xs px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60"
            : "text-sm px-4 py-2.5 bg-teal-600 text-white hover:bg-teal-700 w-full justify-center"
        }`}
      >
        <RefreshCw size={compact ? 12 : 15} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Sincronizando…" : "↻ Sincronizar índices desde BCRA"}
      </button>
      {result && (
        <p className={`text-xs ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}

// ─── Fallback sin datos ───────────────────────────────────────
function SinDatosFallback({ tipo, onSuccess }) {
  const [showManual, setShowManual] = useState(false);
  const [mes, setMes]   = useState("");
  const [val, setVal]   = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(null);

  const saveManual = async () => {
    if (!mes || !val) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/indices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, periodo: mes, valor: parseFloat(val) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(`✓ ${tipo} ${mes.slice(0, 7)} = ${val} guardado`);
      setMes(""); setVal("");
      onSuccess?.();
    } catch (e) {
      setSaved(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2.5">
      <div className="flex gap-2.5">
        <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          No hay valores de <strong>{tipo}</strong> en la base de datos.
          Intentá sincronizar; si falla, cargá un valor manual.
        </p>
      </div>

      <SyncIndicesButton onSuccess={onSuccess} compact />

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="text-xs text-amber-700 dark:text-amber-400 underline underline-offset-2"
      >
        {showManual ? "Ocultar carga manual" : "¿No funciona la sync? Cargá un valor manual"}
      </button>

      {showManual && (
        <div className="pt-1 space-y-2 border-t border-amber-200 dark:border-amber-700">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Ingresá el valor de {tipo} (consultalo en{" "}
            <a href="https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp"
              target="_blank" rel="noreferrer" className="underline">
              BCRA <ExternalLink size={10} className="inline" />
            </a>):
          </p>
          <div className="flex gap-2">
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-amber-500" />
            <input type="number" step="0.01" placeholder="Ej: 1234.56" value={val} onChange={(e) => setVal(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-amber-500" />
            <button type="button" onClick={saveManual} disabled={saving || !mes || !val}
              className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors">
              {saving ? "…" : "Guardar"}
            </button>
          </div>
          {saved && <p className={`text-xs ${saved.startsWith("Error") ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{saved}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Selector principal ───────────────────────────────────────
/**
 * Props:
 *   tipoAjuste   string        "FIJO" | "ICL" | "IPC"
 *   onChange     fn(tipo)
 *   period       string        "trimestral" | "cuatrimestral" | "semestral" | "anual"
 *   onPeriod     fn(period)
 *   increase     string|number porcentaje fijo (solo FIJO)
 *   onIncrease   fn(val)
 *   iclVariacion string|number porcentaje ICL manual por período
 *   onIclVariacion fn(val)
 *   rentaBase    string|number renta mensual actual (para la calculadora)
 */
export function AjusteSelector({
  tipoAjuste,
  onChange,
  period,
  onPeriod,
  increase,
  onIncrease,
  iclVariacion = "",
  onIclVariacion,
  rentaBase = "",
}) {
  const { rows: ipcRows, loading, error, reload } = useIndice(
    tipoAjuste === "IPC" ? "IPC" : tipoAjuste === "ICL" ? "ICL" : null
  );

  const [showCalc, setShowCalc] = useState(false);

  const latest  = ipcRows?.[0] ?? null;
  const hasData = (ipcRows?.length ?? 0) > 0;

  const tipos = [
    { id: "FIJO", label: "Fijo",  sub: "% fijo",     icon: "%" },
    { id: "ICL",  label: "ICL",   sub: "Índice ICL",  icon: "↗" },
    { id: "IPC",  label: "IPC",   sub: "Índice IPC",  icon: "↗" },
  ];

  const periodos = [
    { id: "trimestral",    label: "Trimestral" },
    { id: "cuatrimestral", label: "Cuatrimestral" },
    { id: "semestral",     label: "Semestral" },
    { id: "anual",         label: "Anual" },
  ];

  const descriptions = {
    ICL: "El alquiler se actualizará según el Índice para Contratos de Locación (BCRA).",
    IPC: "El alquiler se actualizará según el Índice de Precios al Consumidor (INDEC).",
  };

  // ¿Tiene suficiente info para mostrar la calculadora?
  const canShowCalc = rentaBase && parseFloat(rentaBase) > 0 && (
    (tipoAjuste === "FIJO" && parseFloat(increase) > 0) ||
    (tipoAjuste === "ICL"  && parseFloat(iclVariacion) > 0) ||
    (tipoAjuste === "IPC"  && hasData)
  );

  return (
    <div className="space-y-4">
      {/* ── Tipo de ajuste ── */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cláusula de ajuste</p>
        <div className="grid grid-cols-3 gap-3">
          {tipos.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                tipoAjuste === t.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              {tipoAjuste === t.id && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
              )}
              <span className={`text-lg font-bold ${tipoAjuste === t.id ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                {t.icon}
              </span>
              <p className={`text-sm font-semibold ${tipoAjuste === t.id ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                {t.label}
              </p>
              <p className={`text-xs ${tipoAjuste === t.id ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                {t.sub}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Periodicidad ── */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodicidad de actualización</p>
        <div className="grid grid-cols-4 gap-2">
          {periodos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriod(p.id)}
              className={`py-2 rounded-xl text-xs font-medium transition-all ${
                period === p.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Porcentaje fijo ── */}
      {tipoAjuste === "FIJO" && (
        <Field label="Porcentaje de aumento por período (%)">
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder="Ej: 10"
            value={increase}
            onChange={(e) => onIncrease(e.target.value)}
          />
        </Field>
      )}

      {/* ── Estado ICL / IPC ── */}
      {tipoAjuste !== "FIJO" && (
        <div className="space-y-2">
          {/* Info pill */}
          <div className="flex gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Ajuste por {tipoAjuste}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{descriptions[tipoAjuste]}</p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5 pl-1">
              <RefreshCw size={12} className="animate-spin" /> Verificando valores de {tipoAjuste}…
            </p>
          )}

          {/* ICL: siempre muestra entrada manual + link BCRA */}
          {!loading && tipoAjuste === "ICL" && (
            <div className="space-y-2.5 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              {/* Last value if any */}
              {hasData && latest && (
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200 dark:border-amber-700">
                  <Check size={12} className="text-emerald-500" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Último ICL guardado:{" "}
                    <strong>{latest.valor?.toFixed(2)}%</strong>{" "}
                    ({fmtPeriodo(latest.periodo)})
                  </p>
                </div>
              )}

              <p className="text-xs text-amber-700 dark:text-amber-400">
                Consultá la variación ICL para el período del contrato en:
              </p>
              <a
                href="https://www.bcra.gob.ar/PublicacionesEstadisticas/index_icl.asp"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <ExternalLink size={11} />
                Calculadora ICL · BCRA
              </a>

              <Field label="Variación ICL por período (%)">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 85.32"
                  value={iclVariacion}
                  onChange={(e) => onIclVariacion?.(e.target.value)}
                />
              </Field>

              {!hasData && <SinDatosFallback tipo="ICL" onSuccess={reload} />}
            </div>
          )}

          {/* IPC: valor automático */}
          {!loading && tipoAjuste === "IPC" && !error && (
            <>
              {hasData ? (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <Check size={14} className="text-emerald-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Valor base disponible:{" "}
                      <span className="font-bold">{latest?.valor?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}%</span>
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Período: {fmtPeriodo(latest?.periodo)} · Se usará como referencia al firmar
                    </p>
                  </div>
                  <button type="button" onClick={reload} title="Recargar"
                    className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors">
                    <RefreshCw size={11} />
                  </button>
                </div>
              ) : (
                <SinDatosFallback tipo="IPC" onSuccess={reload} />
              )}
              <SyncIndicesButton onSuccess={reload} compact />
            </>
          )}

          {/* IPC error */}
          {!loading && tipoAjuste === "IPC" && error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-xs text-red-600 dark:text-red-400">Error al verificar índices: {error}</p>
                <SyncIndicesButton onSuccess={reload} compact />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Calculadora de proyección ── */}
      {canShowCalc && (
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCalc((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/40 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Calculator size={13} className="text-gray-400" />
              Proyección de ajustes
            </span>
            <ChevronDown
              size={13}
              className={`text-gray-400 transition-transform duration-200 ${showCalc ? "rotate-180" : ""}`}
            />
          </button>

          {showCalc && (
            <div className="p-4">
              <AjusteCalculadora
                tipoAjuste={tipoAjuste}
                periodicidad={period}
                rentaBase={rentaBase}
                ipcRows={tipoAjuste === "IPC" ? ipcRows : []}
                variacionManual={
                  tipoAjuste === "FIJO" ? increase :
                  tipoAjuste === "ICL"  ? iclVariacion : 0
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Hint cuando falta info para la calculadora */}
      {!canShowCalc && rentaBase && parseFloat(rentaBase) > 0 && tipoAjuste !== "FIJO" && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pl-1">
          <Calculator size={10} />
          {tipoAjuste === "ICL"
            ? "Ingresá la variación ICL para ver la proyección de ajustes."
            : "Sincronizá el IPC para ver la proyección de ajustes."
          }
        </p>
      )}
    </div>
  );
}