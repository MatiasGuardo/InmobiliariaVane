// frontend/src/components/leases/AjusteSelector.jsx
import { Info, AlertTriangle, RefreshCw, Check } from "lucide-react";
import { useState } from "react";
import { Field, Input } from "../ui/FormField";
import { useIndice } from "../../hooks/useIndice";
import { API } from "../../utils/helpers";

// ─── Botón de sincronización con el BCRA ─────────────────────
export function SyncIndicesButton({ onSuccess, compact = false }) {
  const [syncing, setSyncing] = useState(false);
  const [result,  setResult]  = useState(null);

  const sync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res  = await fetch(`${API}/api/indices/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult({ ok: true, msg: `Sincronizado — ICL: ${data.ICL} reg., IPC: ${data.IPC} reg.` });
      onSuccess?.();
    } catch (e) {
      setResult({ ok: false, msg: e.message });
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

// ─── Selector de cláusula de ajuste ──────────────────────────
export function AjusteSelector({ tipoAjuste, onChange, period, onPeriod, increase, onIncrease }) {
  const { rows, loading, error, reload } = useIndice(tipoAjuste !== "FIJO" ? tipoAjuste : null);

  const latest  = rows.length > 0 ? rows[0] : null;
  const hasData = rows.length > 0;

  const tipos = [
    { id: "FIJO", label: "Fijo", sub: "Fijo",      icon: "%" },
    { id: "ICL",  label: "ICL",  sub: "Índice ICL", icon: "↗" },
    { id: "IPC",  label: "IPC",  sub: "Índice IPC", icon: "↗" },
  ];

  const periodos = ["trimestral", "semestral", "anual"];

  const descriptions = {
    ICL: "El alquiler se actualizará según el Índice para Contratos de Locación publicado por el BCRA.",
    IPC: "El alquiler se actualizará según el Índice de Precios al Consumidor (INDEC).",
  };

  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cláusula de ajuste</p>
        <div className="grid grid-cols-3 gap-3">
          {tipos.map(t => (
            <button key={t.id} type="button" onClick={() => onChange(t.id)}
              className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                tipoAjuste === t.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
              }`}>
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

      {/* Periodicidad */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodicidad de actualización</p>
        <div className="grid grid-cols-3 gap-2">
          {periodos.map(p => (
            <button key={p} type="button" onClick={() => onPeriod(p)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                period === p
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Porcentaje — solo FIJO */}
      {tipoAjuste === "FIJO" && (
        <Field label="Porcentaje de aumento (%)">
          <Input type="number" min="0" step="0.5" placeholder="Ej: 10"
            value={increase} onChange={e => onIncrease(e.target.value)} />
        </Field>
      )}

      {/* Estado del índice — ICL / IPC */}
      {tipoAjuste !== "FIJO" && (
        <div className="space-y-2">
          <div className="flex gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">
                Ajuste por {tipoAjuste}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{descriptions[tipoAjuste]}</p>
            </div>
          </div>

          {loading && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pl-1">
              <RefreshCw size={12} className="animate-spin" /> Verificando valores de {tipoAjuste}…
            </p>
          )}

          {!loading && hasData && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Check size={14} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Valor base disponible: <span className="font-bold">{latest.valor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Período: {latest.periodo?.slice(0, 7)} · Se usará como referencia al firmar
                </p>
              </div>
            </div>
          )}

          {!loading && !hasData && !error && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2.5">
              <div className="flex gap-2.5">
                <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No hay valores de <strong>{tipoAjuste}</strong> cargados. Sincronizá los datos del BCRA.
                </p>
              </div>
              <SyncIndicesButton onSuccess={reload} compact />
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">Error al verificar índices: {error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}