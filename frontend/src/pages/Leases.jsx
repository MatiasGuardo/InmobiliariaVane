import { useState, useEffect } from "react";
import {
  AlertTriangle, Calendar, CheckCircle, Edit2, FileText, Percent, Plus,
  RefreshCw, Search, Trash2, Calculator, X, ArrowUpDown,
  Building2, User, DollarSign, Phone, Mail, MapPin, TrendingUp,
  Info, ChevronDown,
} from "lucide-react";
import { Modal }                from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/FormField";
import { Badge }                from "../components/ui/Badge";
import { DocumentsSection }     from "../components/ui/DocumentsSection";
import { useDocuments }         from "../hooks/useDocuments";
import {
  fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel, isValidDate, API,
} from "../utils/helpers";

// ─── Constantes ───────────────────────────────────────────────
const PERIODS = [
  { value: "trimestral", label: "Trimestral", months: 3  },
  { value: "semestral",  label: "Semestral",  months: 6  },
  { value: "anual",      label: "Anual",      months: 12 },
];

const TIPOS_AJUSTE = [
  {
    value: "FIJO",
    label: "Porcentaje fijo",
    short: "Fijo",
    desc:  "El alquiler sube un % fijo en cada período",
    color: "blue",
    icon:  Percent,
  },
  {
    value: "ICL",
    label: "Índice ICL",
    short: "ICL",
    desc:  "Índice para Contratos de Locación (Banco Central)",
    color: "emerald",
    icon:  TrendingUp,
  },
  {
    value: "IPC",
    label: "Índice IPC",
    short: "IPC",
    desc:  "Índice de Precios al Consumidor (INDEC)",
    color: "violet",
    icon:  TrendingUp,
  },
];

const SORT_OPTIONS = [
  { value: "vencimiento_asc",  label: "Vencimiento ↑" },
  { value: "vencimiento_desc", label: "Vencimiento ↓" },
  { value: "precio_asc",       label: "Precio ↑"      },
  { value: "precio_desc",      label: "Precio ↓"      },
  { value: "inicio_asc",       label: "Más antiguo"   },
  { value: "inicio_desc",      label: "Más reciente"  },
];

// ─── Helpers ──────────────────────────────────────────────────
function getAlertStyles(alert) {
  if (!alert) return { card: "border border-gray-100 dark:border-gray-700/60", bar: "bg-blue-500" };
  const styles = {
    Crítico: { card: "border border-red-200/70 dark:border-gray-700/60 dark:shadow-[inset_3px_0_0_0_rgba(239,68,68,0.6)]", bar: "bg-red-500",    dot: "bg-red-500"    },
    Urgente: { card: "border border-orange-200/70 dark:border-gray-700/60 dark:shadow-[inset_3px_0_0_0_rgba(249,115,22,0.6)]", bar: "bg-orange-400", dot: "bg-orange-400" },
    Próximo: { card: "border border-amber-200/70 dark:border-gray-700/60 dark:shadow-[inset_3px_0_0_0_rgba(251,191,36,0.5)]", bar: "bg-amber-400",  dot: "bg-amber-400"  },
  };
  return styles[alert.label] || styles["Próximo"];
}

function applySorting(list, sortKey) {
  const s = [...list];
  switch (sortKey) {
    case "vencimiento_asc":  return s.sort((a, b) => new Date(a.endDate)   - new Date(b.endDate));
    case "vencimiento_desc": return s.sort((a, b) => new Date(b.endDate)   - new Date(a.endDate));
    case "precio_asc":       return s.sort((a, b) => a.rent - b.rent);
    case "precio_desc":      return s.sort((a, b) => b.rent - a.rent);
    case "inicio_asc":       return s.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    case "inicio_desc":      return s.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    default: return s;
  }
}

function tipoAjusteLabel(lease) {
  if (!lease) return "";
  if (lease.tipoAjuste === "ICL") return `ICL · ${PERIODS.find(p => p.value === lease.period)?.label || "Anual"}`;
  if (lease.tipoAjuste === "IPC") return `IPC · ${PERIODS.find(p => p.value === lease.period)?.label || "Anual"}`;
  return `+${lease.increase}% ${(PERIODS.find(p => p.value === lease.period)?.label || "Anual").toLowerCase()}`;
}

// ─── Hook: índices históricos ─────────────────────────────────
function useIndices(tipo) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (tipo !== "ICL" && tipo !== "IPC") { setData([]); return; }
    setLoading(true);
    setError(null);
    fetch(`${API}/api/leases/indices/${tipo}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [tipo]);

  return { data, loading, error };
}

// ─── Selector de tipo de ajuste ───────────────────────────────
function TipoAjusteSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TIPOS_AJUSTE.map(t => {
        const isSelected = value === t.value;
        const colorMap = {
          blue:    { sel: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",    dot: "bg-blue-500",    text: "text-blue-700 dark:text-blue-300",    ring: "ring-blue-200 dark:ring-blue-800"    },
          emerald: { sel: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-800" },
          violet:  { sel: "border-violet-500 bg-violet-50 dark:bg-violet-900/20",  dot: "bg-violet-500",  text: "text-violet-700 dark:text-violet-300",  ring: "ring-violet-200 dark:ring-violet-800"  },
        };
        const c = colorMap[t.color];
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
              isSelected
                ? `${c.sel} ring-2 ${c.ring}`
                : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            {isSelected && (
              <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${c.dot}`} />
            )}
            <t.icon size={16} className={isSelected ? c.text : "text-gray-400 dark:text-gray-500"} />
            <span className={`text-xs font-bold leading-none ${isSelected ? c.text : "text-gray-600 dark:text-gray-400"}`}>
              {t.short}
            </span>
            <span className={`text-xs leading-tight ${isSelected ? c.text + " opacity-80" : "text-gray-400 dark:text-gray-500"}`}>
              {t.label === "Porcentaje fijo" ? "Fijo" : t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Preview de índice (ICL / IPC) ────────────────────────────
function IndicePreview({ tipo, startDate }) {
  const { data, loading, error } = useIndices(tipo);

  // Valor base: el más cercano a la fecha de inicio
  const valorBase = data.length > 0 ? data[0] : null;

  const colorMap = {
    ICL: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
    IPC: { bg: "bg-violet-50 dark:bg-violet-900/20",   border: "border-violet-100 dark:border-violet-800/50",   text: "text-violet-700 dark:text-violet-400",   badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"   },
  };
  const c = colorMap[tipo];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-start gap-2">
        <Info size={14} className={`${c.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-xs font-semibold ${c.text}`}>
            Ajuste por {tipo}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {tipo === "ICL"
              ? "El alquiler se actualizará según el Índice para Contratos de Locación publicado por el BCRA."
              : "El alquiler se actualizará según el Índice de Precios al Consumidor publicado por el INDEC."
            }
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Cargando índices…</p>
      )}
      {error && (
        <p className="text-xs text-red-500">No se pudieron cargar los índices: {error}</p>
      )}

      {!loading && !error && valorBase && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Valor base que se usará al firmar:
          </p>
          <div className="flex items-center justify-between bg-white/60 dark:bg-gray-900/30 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(valorBase.periodo + "T12:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </span>
            <span className={`text-sm font-bold ${c.text}`}>
              {Number(valorBase.valor).toLocaleString("es-AR", { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Últimos 4 valores como mini-sparkline textual */}
          {data.length > 1 && (
            <details className="group">
              <summary className={`text-xs cursor-pointer select-none flex items-center gap-1 ${c.text} hover:opacity-80`}>
                <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                Ver últimos valores
              </summary>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {data.slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-white/60 dark:bg-gray-900/20">
                    <span className="text-gray-400 dark:text-gray-500">
                      {new Date(d.periodo + "T12:00:00").toLocaleDateString("es-AR", { month: "short", year: "numeric" })}
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {Number(d.valor).toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {!loading && !error && !valorBase && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠ No hay valores de {tipo} cargados en el sistema. Contactá al administrador.
        </p>
      )}
    </div>
  );
}

// ─── Sección de cláusula de ajuste (en formulario) ────────────
function AjusteSection({ form, setForm }) {
  const tipoInfo = TIPOS_AJUSTE.find(t => t.value === form.tipoAjuste) || TIPOS_AJUSTE[0];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
        <TrendingUp size={14} className="text-gray-400" />
        Cláusula de ajuste
      </p>

      {/* Selector de tipo */}
      <TipoAjusteSelector
        value={form.tipoAjuste}
        onChange={v => setForm({ ...form, tipoAjuste: v, increase: v === "FIJO" ? (form.increase || "6") : "" })}
      />

      {/* Periodicidad — siempre visible */}
      <Field label="Periodicidad de actualización">
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <button key={p.value} type="button" onClick={() => setForm({ ...form, period: p.value })}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                form.period === p.value
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Porcentaje — solo FIJO */}
      {form.tipoAjuste === "FIJO" && (
        <Field label="Porcentaje de aumento">
          <div className="relative">
            <Input
              type="number"
              placeholder="Ej: 10"
              value={form.increase}
              onChange={e => setForm({ ...form, increase: e.target.value })}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
          </div>
        </Field>
      )}

      {/* Preview de índice — ICL / IPC */}
      {(form.tipoAjuste === "ICL" || form.tipoAjuste === "IPC") && (
        <IndicePreview tipo={form.tipoAjuste} startDate={form.startDate} />
      )}

      {/* Resumen */}
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
        {form.tipoAjuste === "FIJO" && form.increase && (
          <span>El alquiler aumentará <strong className="text-blue-600 dark:text-blue-400">+{form.increase}%</strong> de forma <strong>{PERIODS.find(p => p.value === form.period)?.label.toLowerCase()}</strong></span>
        )}
        {form.tipoAjuste === "ICL" && (
          <span>El alquiler se ajustará por <strong className="text-emerald-600 dark:text-emerald-400">ICL</strong> de forma <strong>{PERIODS.find(p => p.value === form.period)?.label.toLowerCase()}</strong></span>
        )}
        {form.tipoAjuste === "IPC" && (
          <span>El alquiler se ajustará por <strong className="text-violet-600 dark:text-violet-400">IPC</strong> de forma <strong>{PERIODS.find(p => p.value === form.period)?.label.toLowerCase()}</strong></span>
        )}
        {form.tipoAjuste === "FIJO" && !form.increase && (
          <span className="text-gray-400 dark:text-gray-500 italic">Ingresá el porcentaje de aumento</span>
        )}
      </div>
    </div>
  );
}

// ─── Calculadora de ajuste ────────────────────────────────────
function RentCalculator({ lease, onClose }) {
  const periodInfo  = PERIODS.find(p => p.value === lease.period) || PERIODS[2];
  const [numPeriods, setNumPeriods] = useState(1);
  const maxPeriods  = Math.max(1, Math.ceil(24 / periodInfo.months));
  const { data: indices } = useIndices(lease.tipoAjuste);

  const isIndex = lease.tipoAjuste === "ICL" || lease.tipoAjuste === "IPC";

  // Proyección
  const rows = [];
  let rent = lease.rent;
  for (let i = 0; i <= numPeriods; i++) {
    const d = new Date(lease.startDate);
    d.setMonth(d.getMonth() + i * periodInfo.months);
    let projected = rent;
    if (i > 0) {
      if (!isIndex) {
        projected = Math.round(rent * (1 + (lease.increase || 6) / 100));
      } else {
        // Con índice: estimación usando el último valor disponible
        const idx = indices[i - 1];
        const base = indices[indices.length - 1];
        if (idx && base && base.valor > 0) {
          projected = Math.round(lease.rent * (idx.valor / base.valor));
        }
      }
    }
    rows.push({ i, rent: projected, date: d });
    rent = projected;
  }
  const finalRent = rows[rows.length - 1].rent;

  const colorMap = { FIJO: "text-blue-600 dark:text-blue-400", ICL: "text-emerald-600 dark:text-emerald-400", IPC: "text-violet-600 dark:text-violet-400" };
  const bgMap    = { FIJO: "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800", ICL: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800", IPC: "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800" };
  const headerBg = { FIJO: "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800", ICL: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800", IPC: "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800" };

  const tc = colorMap[lease.tipoAjuste] || colorMap.FIJO;
  const bc = bgMap[lease.tipoAjuste] || bgMap.FIJO;
  const hc = headerBg[lease.tipoAjuste] || headerBg.FIJO;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className={`flex items-center justify-between px-5 py-3.5 ${hc} border-b`}>
        <div className="flex items-center gap-2">
          <Calculator size={14} className={tc} />
          <span className={`text-sm font-semibold ${tc}`}>Calculadora de ajuste</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${bc} border ${tc}`}>
            {lease.tipoAjuste}
          </span>
          {isIndex && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">estimación</span>
          )}
        </div>
        <button onClick={onClose} className={`p-1 rounded-lg hover:opacity-70 transition-opacity ${tc}`}>
          <X size={14} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Info */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Renta base",   value: fmtCurrency(lease.rent)         },
            { label: "Tipo ajuste",  value: lease.tipoAjuste                },
            { label: "Periodicidad", value: periodInfo.label                },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
              <p className={`text-sm font-bold ${tc}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Número de ajustes</label>
            <span className={`text-sm font-bold ${tc}`}>
              {numPeriods} {numPeriods === 1 ? "ajuste" : "ajustes"}
              <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">({numPeriods * periodInfo.months} meses)</span>
            </span>
          </div>
          <input
            type="range" min="1" max={maxPeriods} step="1"
            value={numPeriods}
            onChange={e => setNumPeriods(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span>{periodInfo.months} meses</span>
            <span>{maxPeriods * periodInfo.months} meses</span>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-700/50 px-4 py-2">
            {["Período", "Fecha", "Renta"].map((h, i) => (
              <span key={h} className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${i === 2 ? "text-right" : i === 1 ? "text-center" : ""}`}>{h}</span>
            ))}
          </div>
          {rows.map((row, idx) => {
            const isFirst = idx === 0;
            const isLast  = idx === rows.length - 1 && !isFirst;
            return (
              <div key={idx} className={`grid grid-cols-3 px-4 py-2.5 text-sm border-t border-gray-50 dark:border-gray-700/50 ${isLast ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-white dark:bg-gray-800"}`}>
                <span className={`font-medium ${isFirst ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                  {isFirst ? "Actual" : `Ajuste ${row.i}`}
                </span>
                <span className="text-center text-xs text-gray-500 dark:text-gray-400 self-center">
                  {row.date.toLocaleDateString("es-AR", { month: "short", year: "numeric" })}
                </span>
                <span className={`text-right font-bold ${isLast ? "text-emerald-700 dark:text-emerald-400" : isFirst ? "text-gray-600 dark:text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>
                  {fmtCurrency(row.rent)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Resultado */}
        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Después de {numPeriods} {numPeriods === 1 ? "ajuste" : "ajustes"} ({numPeriods * periodInfo.months} meses)
            </p>
            {isIndex && (
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5 italic">
                * Proyección estimada con últimos valores disponibles
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{fmtCurrency(finalRent)}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">por mes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de detalle de contrato ─────────────────────────────
function LeaseDetailModal({ lease, properties, tenants, owners, onClose, onEdit, onRenew, onDelete }) {
  if (!lease) return null;

  const prop    = properties.find(p => p.id === lease.propertyId);
  const tenant  = tenants.find(t => t.id === lease.tenantId);
  const owner   = prop ? owners.find(o => o.id === prop.ownerId) : null;
  const days    = diffDays(lease.endDate);
  const alert   = lease.status === "activo" ? getAlertLevel(days) : null;

  const levelColors = {
    "Crítico": { header: "bg-red-500",    ring: "ring-red-200 dark:ring-red-900/60" },
    "Urgente": { header: "bg-orange-400", ring: "ring-orange-200 dark:ring-orange-900/60" },
    "Próximo": { header: "bg-amber-400",  ring: "ring-amber-200 dark:ring-amber-900/60" },
  };
  const lc       = alert ? (levelColors[alert.label] || levelColors["Próximo"]) : null;
  const canRenew = lease.status === "activo" || lease.status === "vencido";
  const docState = useDocuments("lease", lease.id);

  // Chip de tipo de ajuste
  const tipoInfo = TIPOS_AJUSTE.find(t => t.value === lease.tipoAjuste) || TIPOS_AJUSTE[0];
  const chipColors = {
    blue:    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50",
    emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50",
    violet:  "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${lc ? `ring-1 ${lc.ring}` : "border border-gray-100 dark:border-gray-700"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`${lc ? lc.header : "bg-blue-600"} px-6 py-5 rounded-t-2xl`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-3">
              {alert && (
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} className="text-white" />
                  <span className="text-white/90 text-xs font-semibold">{alert.label}</span>
                </div>
              )}
              <p className="text-white font-bold text-base leading-snug truncate">{prop?.address}</p>
              <p className="text-white/70 text-sm mt-0.5">{prop?.type}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0">
              <X size={15} className="text-white" />
            </button>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-3xl font-black text-white leading-none">{fmtCurrency(lease.rent)}</p>
            <p className="text-white/70 text-sm mb-0.5">/ mes</p>
            {alert && (
              <p className="ml-auto text-white font-bold text-sm">
                {days <= 0 ? "Venció" : `${days} días restantes`}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={11} /> Propiedad
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{prop?.address}</p>
            {prop?.type && <p className="text-xs text-gray-400 dark:text-gray-500">{prop.type}</p>}
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <User size={11} /> Inquilino
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{tenant?.name}</p>
            <div className="flex flex-col gap-1">
              {tenant?.email && <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Mail size={11} className="text-gray-400 flex-shrink-0" />{tenant.email}</span>}
              {tenant?.phone && <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Phone size={11} className="text-gray-400 flex-shrink-0" />{tenant.phone}</span>}
            </div>
          </div>

          {owner && (
            <>
              <div className="h-px bg-gray-100 dark:bg-gray-800" />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 size={11} /> Propietario
                </p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{owner.name}</p>
                <div className="flex flex-col gap-1">
                  {owner.email && <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Mail size={11} className="text-gray-400 flex-shrink-0" />{owner.email}</span>}
                  {owner.phone && <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Phone size={11} className="text-gray-400 flex-shrink-0" />{owner.phone}</span>}
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Info del contrato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><Calendar size={10} /> Inicio</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(lease.startDate)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><Calendar size={10} /> Vencimiento</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(lease.endDate)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={10} /> Renta mensual</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtCurrency(lease.rent)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={10} /> Ajuste</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${chipColors[tipoInfo.color]}`}>
                  {tipoInfo.short}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {lease.tipoAjuste === "FIJO" ? `+${lease.increase}%` : ""} {PERIODS.find(p => p.value === lease.period)?.label || "Anual"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">Estado:</p>
            <Badge status={lease.status} />
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800" />
          <DocumentsSection entityType="lease" entityId={lease.id} {...docState} />
          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          <div className="grid grid-cols-2 gap-2">
            {lease.status === "activo" && (
              <button onClick={() => { onClose(); onEdit(lease); }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Edit2 size={14} /> Editar
              </button>
            )}
            {canRenew && (
              <button onClick={() => { onClose(); onRenew(lease); }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <RefreshCw size={14} /> Renovar
              </button>
            )}
            <button onClick={() => { onClose(); onDelete(lease.id); }}
              className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors col-span-full">
              <Trash2 size={14} /> Eliminar contrato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Validación ───────────────────────────────────────────────
function validateLeaseForm(form, isNew = true) {
  const errors = [];
  if (!form.propertyId) errors.push("propiedad");
  if (!form.tenantId)   errors.push("inquilino");
  if (!form.startDate)  errors.push("fecha de inicio");
  if (!form.endDate)    errors.push("fecha de fin");
  if (!form.rent)       errors.push("renta mensual");
  if (form.tipoAjuste === "FIJO" && !form.increase) errors.push("porcentaje de aumento");
  if (errors.length > 0) {
    return errors.length === 1
      ? `Falta completar un campo: ${errors[0]}.`
      : `Faltan completar campos obligatorios: ${errors.join(", ")}.`;
  }
  if (!isValidDate(form.startDate)) return "Fecha de inicio inexistente.";
  if (!isValidDate(form.endDate))   return "Fecha de fin inexistente.";
  if (form.endDate <= form.startDate) return "La fecha de fin debe ser posterior a la de inicio.";
  if (isNew) {
    const todayStr = new Date().toISOString().split("T")[0];
    if (form.endDate < todayStr) return "La fecha de finalización no puede ser anterior a hoy.";
  }
  return null;
}

function validateRenewForm(form) {
  const errors = [];
  if (!form.tenantId)  errors.push("inquilino");
  if (!form.startDate) errors.push("fecha de inicio");
  if (!form.endDate)   errors.push("fecha de fin");
  if (!form.rent)      errors.push("renta mensual");
  if (form.tipoAjuste === "FIJO" && !form.increase) errors.push("porcentaje de aumento");
  if (errors.length > 0) {
    return errors.length === 1
      ? `Falta completar un campo: ${errors[0]}.`
      : `Faltan completar campos obligatorios: ${errors.join(", ")}.`;
  }
  if (!isValidDate(form.startDate)) return "Fecha de inicio inexistente.";
  if (!isValidDate(form.endDate))   return "Fecha de fin inexistente.";
  if (form.endDate <= form.startDate) return "La fecha de fin debe ser posterior a la de inicio.";
  return null;
}

// ─── DocumentsInModal ─────────────────────────────────────────
function DocumentsInModal({ leaseId }) {
  const docState = useDocuments("lease", leaseId);
  if (!leaseId) return <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Guardá el contrato primero para adjuntar documentos.</p>;
  return <DocumentsSection entityType="lease" entityId={leaseId} {...docState} />;
}

// ─── Chip de tipo de ajuste (en tarjeta) ─────────────────────
function AjusteChip({ lease }) {
  const tipoInfo = TIPOS_AJUSTE.find(t => t.value === (lease.tipoAjuste || "FIJO")) || TIPOS_AJUSTE[0];
  const chipColors = {
    blue:    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    violet:  "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${chipColors[tipoInfo.color]}`}>
      <tipoInfo.icon size={10} />
      {tipoInfo.short}
    </span>
  );
}

// ─── Leases ───────────────────────────────────────────────────
export function Leases({ leases, setLeases, properties, tenants, owners, initialTab = "activo" }) {
  const [tab,         setTab]         = useState(initialTab === "activo" ? "activo" : "finalizado");
  const [search,      setSearch]      = useState("");
  const [sortKey,     setSortKey]     = useState("vencimiento_asc");
  const [modal,       setModal]       = useState(false);
  const [renewModal,  setRenewModal]  = useState(false);
  const [detailLease, setDetailLease] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [formError,   setFormError]   = useState("");
  const [renewError,  setRenewError]  = useState("");
  const [calcOpen,    setCalcOpen]    = useState(null);

  const emptyForm = { propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6", period: "anual", tipoAjuste: "FIJO" };

  const [form,      setForm]      = useState(emptyForm);
  const [renewForm, setRenewForm] = useState({ tenantId: "", startDate: "", endDate: "", rent: "", increase: "6", period: "anual", tipoAjuste: "FIJO" });

  const activos     = [...leases].filter(l => l.status === "activo");
  const finalizados = [...leases].filter(l => l.status !== "activo" && l.status !== "renovado");

  const filterFn = (l) => {
    if (!search) return true;
    const q    = search.toLowerCase();
    const prop = properties.find(p => p.id === l.propertyId);
    const ten  = tenants.find(t => t.id === l.tenantId);
    return prop?.address?.toLowerCase().includes(q) || ten?.name?.toLowerCase().includes(q);
  };

  const currentList = applySorting((tab === "activo" ? activos : finalizados).filter(filterFn), sortKey);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModal(true);
  };

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({
      propertyId: l.propertyId, tenantId: l.tenantId,
      startDate: l.startDate, endDate: l.endDate,
      rent: String(l.rent), increase: String(l.increase || 6),
      period: l.period || "anual",
      tipoAjuste: l.tipoAjuste || "FIJO",
    });
    setFormError("");
    setModal(true);
  };

  const openRenew = (l) => {
    setRenewTarget(l);
    const isVencido = l.status === "vencido";
    const nextStart = isVencido ? new Date() : new Date(l.endDate);
    if (!isVencido) nextStart.setDate(nextStart.getDate() + 1);
    const ns = nextStart.toISOString().split("T")[0];
    const ne = new Date(new Date(ns).setFullYear(new Date(ns).getFullYear() + 1)).toISOString().split("T")[0];
    const newRent = (l.tipoAjuste === "FIJO")
      ? Math.round(l.rent * (1 + (l.increase || 6) / 100))
      : l.rent;
    setRenewForm({ tenantId: l.tenantId, startDate: ns, endDate: ne, rent: String(newRent), increase: String(l.increase || 6), period: l.period || "anual", tipoAjuste: l.tipoAjuste || "FIJO" });
    setRenewError("");
    setRenewModal(true);
  };

  const save = async () => {
    const err = validateLeaseForm(form, !editing);
    if (err) { setFormError(err); return; }
    setSaving(true); setFormError("");
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `${API}/api/leases/${editing}` : `${API}/api/leases`;
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rent: Number(form.rent), increase: Number(form.increase), period: form.period, tipoAjuste: form.tipoAjuste }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setLeases(prev => editing ? prev.map(l => l.id === editing ? saved : l) : [...prev, saved]);
      setModal(false);
    } catch (e) { setFormError("Error al guardar: " + e.message); }
    finally { setSaving(false); setEditing(null); }
  };

  const confirmRenew = async () => {
    const err = validateRenewForm(renewForm);
    if (err) { setRenewError(err); return; }
    setSaving(true); setRenewError("");
    try {
      const delRes = await fetch(`${API}/api/leases/${renewTarget.id}`, { method: "DELETE" });
      if (!delRes.ok) throw new Error(await delRes.text());
      const res = await fetch(`${API}/api/leases`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: renewTarget.propertyId,
          tenantId:   renewForm.tenantId,
          startDate:  renewForm.startDate,
          endDate:    renewForm.endDate,
          rent:       Number(renewForm.rent),
          increase:   Number(renewForm.increase),
          period:     renewForm.period,
          tipoAjuste: renewForm.tipoAjuste,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newLease = await res.json();
      setLeases(prev => [...prev.filter(l => l.id !== renewTarget.id), newLease]);
      setRenewModal(false); setRenewTarget(null);
    } catch (e) { setRenewError("Error al renovar: " + e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este contrato?")) return;
    try {
      await fetch(`${API}/api/leases/${id}`, { method: "DELETE" });
      setLeases(prev => prev.filter(l => l.id !== id));
    } catch (e) { alert("Error al eliminar: " + e.message); }
  };

  // ─── Tarjeta ──────────────────────────────────────────────
  const LeaseCard = ({ l }) => {
    const prop     = properties.find(p => p.id === l.propertyId);
    const tenant   = tenants.find(t => t.id === l.tenantId);
    const days     = diffDays(l.endDate);
    const alert    = l.status === "activo" ? getAlertLevel(days) : null;
    const styles   = getAlertStyles(alert);
    const progress = Math.min(100, Math.max(0,
      ((new Date() - new Date(l.startDate)) / (new Date(l.endDate) - new Date(l.startDate))) * 100
    ));
    const isCalcOpen = calcOpen === l.id;
    const canRenew   = l.status === "activo" || l.status === "vencido";

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl ${styles.card} transition-all hover:shadow-md`}>
        <div className="p-5 cursor-pointer" onClick={() => setDetailLease(l)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                {alert && <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${styles.dot}`} />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{prop?.address}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tenant?.name}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Calendar size={11} />{fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AjusteChip lease={l} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">{tipoAjusteLabel(l)}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-gray-100">{fmtCurrency(l.rent)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">por mes</p>
                {alert
                  ? <p className={`text-xs font-semibold mt-1 ${alert.color}`}>{days <= 0 ? "Venció" : `${fmtDuration(days)} restantes`}</p>
                  : <Badge status={l.status} />
                }
              </div>
              <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                {l.status === "activo" && (
                  <>
                    <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Editar">
                      <Edit2 size={13} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => setCalcOpen(isCalcOpen ? null : l.id)}
                      className={`p-1.5 rounded-lg transition-colors ${isCalcOpen ? "bg-blue-100 dark:bg-blue-900/40" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
                      title="Calculadora"
                    >
                      <Calculator size={13} className="text-blue-500 dark:text-blue-400" />
                    </button>
                  </>
                )}
                {canRenew && (
                  <button onClick={() => openRenew(l)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Renovar">
                    <RefreshCw size={13} className="text-emerald-500" />
                  </button>
                )}
                <button onClick={() => del(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          </div>

          {l.status === "activo" && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                <span>Progreso del contrato</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${styles.bar || "bg-blue-500"}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {isCalcOpen && (
          <div className="px-5 pb-5" onClick={e => e.stopPropagation()}>
            <RentCalculator lease={l} onClose={() => setCalcOpen(null)} />
          </div>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contratos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activos.length} activos · {finalizados.length} finalizados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 w-fit">
        {[
          { key: "activo",     label: "Activos",     count: activos.length     },
          { key: "finalizado", label: "Finalizados", count: finalizados.length },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => { setTab(key); setSearch(""); setCalcOpen(null); setSortKey("vencimiento_asc"); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === key ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar en contratos ${tab === "activo" ? "activos" : "finalizados"}…`}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <div className="relative">
          <select value={sortKey} onChange={e => setSortKey(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:border-blue-500 outline-none cursor-pointer">
            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-gray-400"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>

      {currentList.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Hacé click en una tarjeta para ver los detalles del contrato</p>
      )}

      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-12 text-center">
            {tab === "activo" ? <FileText size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" /> : <CheckCircle size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />}
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? "Sin resultados" : tab === "activo" ? "Sin contratos activos" : "Sin contratos finalizados"}
            </p>
          </div>
        ) : (
          currentList.map(l => <LeaseCard key={l.id} l={l} />)
        )}
      </div>

      {/* Modal de detalle */}
      {detailLease && (
        <LeaseDetailModal
          lease={detailLease} properties={properties} tenants={tenants} owners={owners || []}
          onClose={() => setDetailLease(null)}
          onEdit={(l) => { setDetailLease(null); openEdit(l); }}
          onRenew={(l) => { setDetailLease(null); openRenew(l); }}
          onDelete={(id) => { setDetailLease(null); del(id); }}
        />
      )}

      {/* ── Modal nuevo / editar ── */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Editar Contrato" : "Nuevo Contrato"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Propiedad">
              <Select value={form.propertyId} onChange={e => { setForm({ ...form, propertyId: e.target.value }); setFormError(""); }}>
                <option value="">Seleccionar...</option>
                {(editing ? properties : properties.filter(p => p.status === "vacante")).map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </Select>
            </Field>
            <Field label="Inquilino">
              <Select value={form.tenantId} onChange={e => { setForm({ ...form, tenantId: e.target.value }); setFormError(""); }}>
                <option value="">Seleccionar...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de inicio">
              <Input type="date" value={form.startDate} onChange={e => { setForm({ ...form, startDate: e.target.value }); setFormError(""); }} />
            </Field>
            <Field label="Fecha de fin">
              <Input type="date" value={form.endDate} onChange={e => { setForm({ ...form, endDate: e.target.value }); setFormError(""); }} />
            </Field>
          </div>
          <Field label="Renta mensual (ARS)">
            <Input type="number" placeholder="Ej: 350000" value={form.rent} onChange={e => { setForm({ ...form, rent: e.target.value }); setFormError(""); }} />
          </Field>

          <AjusteSection form={form} setForm={setForm} />

          {editing && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
              <DocumentsInModal leaseId={editing} />
            </div>
          )}

          {formError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setModal(false); setEditing(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? "Guardando…" : (editing ? "Actualizar Contrato" : "Crear Contrato")}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal renovación ── */}
      <Modal open={renewModal} onClose={() => { setRenewModal(false); setRenewTarget(null); }} title="Renovar Contrato" wide>
        {renewTarget && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Contrato a reemplazar</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{properties.find(p => p.id === renewTarget.propertyId)?.address}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fmtDate(renewTarget.startDate)} → {fmtDate(renewTarget.endDate)} · {fmtCurrency(renewTarget.rent)}/mes · {tenants.find(t => t.id === renewTarget.tenantId)?.name}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">⚠ Este contrato se eliminará y será reemplazado por el nuevo.</p>
            </div>
            <Field label="Inquilino para el nuevo contrato">
              <Select value={renewForm.tenantId} onChange={e => { setRenewForm({ ...renewForm, tenantId: e.target.value }); setRenewError(""); }}>
                <option value="">Seleccionar...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nueva fecha de inicio">
                <Input type="date" value={renewForm.startDate} onChange={e => { setRenewForm({ ...renewForm, startDate: e.target.value }); setRenewError(""); }} />
              </Field>
              <Field label="Nueva fecha de fin">
                <Input type="date" value={renewForm.endDate} onChange={e => { setRenewForm({ ...renewForm, endDate: e.target.value }); setRenewError(""); }} />
              </Field>
            </div>
            <Field label="Nueva renta mensual (ARS)">
              <Input type="number" value={renewForm.rent} onChange={e => { setRenewForm({ ...renewForm, rent: e.target.value }); setRenewError(""); }} />
            </Field>

            <AjusteSection form={renewForm} setForm={setRenewForm} />

            {renewError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{renewError}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setRenewModal(false); setRenewTarget(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmRenew} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <RefreshCw size={14} />
                {saving ? "Renovando…" : "Confirmar Renovación"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}