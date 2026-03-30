// frontend/src/pages/Leases.jsx
import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Search, Edit2, Trash2, TrendingUp,
  Calendar, DollarSign, Percent, Info, AlertTriangle,
  RefreshCw, X, Check, ChevronRight,
} from "lucide-react";
import { Modal }                from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/FormField";
import { Badge }                from "../components/ui/Badge";
import { DocumentsSection }     from "../components/ui/DocumentsSection";
import { useDocuments }         from "../hooks/useDocuments";
import { fmtDate, fmtCurrency, diffDays, getAlertLevel, isValidDate, API } from "../utils/helpers";

const TABS = ["activo", "vencido", "rescindido", "renovado", "todos"];

// ─── Hook: obtiene últimos valores de un índice ───────────────
function useIndice(tipo) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!tipo || tipo === "FIJO") { setRows([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/indices/${tipo}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, reload: load };
}

// ─── Componente: selector de cláusula de ajuste ───────────────
function AjusteSelector({ tipoAjuste, onChange, period, onPeriod, increase, onIncrease }) {
  const { rows, loading, error, reload } = useIndice(tipoAjuste !== "FIJO" ? tipoAjuste : null);

  const latest  = rows.length > 0 ? rows[0] : null;
  const hasData = rows.length > 0;

  const tipos = [
    { id: "FIJO", label: "Fijo",  sub: "Fijo",       icon: "%" },
    { id: "ICL",  label: "ICL",   sub: "Índice ICL",  icon: "↗" },
    { id: "IPC",  label: "IPC",   sub: "Índice IPC",  icon: "↗" },
  ];

  const periodos = ["trimestral", "semestral", "anual"];

  const descriptions = {
    ICL: "El alquiler se actualizará según el Índice para Contratos de Locación publicado por el BCRA.",
    IPC: "El alquiler se actualizará según el Índice de Precios al Consumidor (INDEC).",
  };

  return (
    <div className="space-y-4">
      {/* Tipo selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-gray-400" /> Cláusula de ajuste
        </p>
        <div className="grid grid-cols-3 gap-3">
          {tipos.map(t => (
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

      {/* Periodicidad */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Periodicidad de actualización</p>
        <div className="grid grid-cols-3 gap-2">
          {periodos.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriod(p)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                period === p
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Porcentaje — solo para FIJO */}
      {tipoAjuste === "FIJO" && (
        <Field label="Porcentaje de aumento (%)">
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder="Ej: 10"
            value={increase}
            onChange={e => onIncrease(e.target.value)}
          />
        </Field>
      )}

      {/* Info / estado del índice — ICL o IPC */}
      {tipoAjuste !== "FIJO" && (
        <div className="space-y-2">
          {/* Descripción */}
          <div className="flex gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">
                Ajuste por {tipoAjuste}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{descriptions[tipoAjuste]}</p>
            </div>
          </div>

          {/* Cargando */}
          {loading && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pl-1">
              <RefreshCw size={12} className="animate-spin" /> Verificando valores de {tipoAjuste}…
            </p>
          )}

          {/* Tiene datos: muestra el último valor */}
          {!loading && hasData && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Check size={14} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Valor base disponible: <span className="font-bold">{latest.valor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Período: {latest.periodo?.slice(0, 7)} · Se usará como referencia al firmar el contrato
                </p>
              </div>
            </div>
          )}

          {/* Sin datos: warning + botón de sync */}
          {!loading && !hasData && !error && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2.5">
              <div className="flex gap-2.5">
                <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No hay valores de <strong>{tipoAjuste}</strong> cargados en el sistema. Sincronizá los datos del BCRA para poder usar este tipo de ajuste.
                </p>
              </div>
              <SyncIndicesButton onSuccess={reload} compact />
            </div>
          )}

          {/* Error de red */}
          {!loading && error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">
                Error al verificar índices: {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Botón de sincronización con el BCRA ─────────────────────
function SyncIndicesButton({ onSuccess, compact = false }) {
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

// ─── Documentos adjuntos a un contrato ───────────────────────
function LeaseDocuments({ leaseId }) {
  const docState = useDocuments("lease", leaseId);
  if (!leaseId) return (
    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
      Guardá el contrato primero para adjuntar documentos.
    </p>
  );
  return <DocumentsSection entityType="lease" entityId={leaseId} {...docState} />;
}

// ─── Badge de tipo de ajuste ──────────────────────────────────
function AjusteBadge({ tipo }) {
  const map = {
    ICL:  "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
    IPC:  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    FIJO: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[tipo] || map.FIJO}`}>
      {tipo || "FIJO"}
    </span>
  );
}

// ─── Modal de detalle del contrato ───────────────────────────
function LeaseDetailModal({ lease, properties, tenants, owners, onClose, onEdit, onDelete, onStatusChange }) {
  if (!lease) return null;

  const prop    = properties.find(p => p.id === lease.propertyId);
  const tenant  = tenants.find(t => t.id === lease.tenantId);
  const owner   = prop ? owners.find(o => o.id === prop.ownerId) : null;
  const days    = diffDays(lease.endDate);
  const alert   = lease.status === "activo" ? getAlertLevel(days) : null;
  const docState = useDocuments("lease", lease.id);

  const headerBg = alert
    ? (alert.label === "Crítico" ? "bg-red-500" : alert.label === "Urgente" ? "bg-orange-400" : "bg-amber-500")
    : "bg-blue-600";

  const otrosEstados = ["activo", "vencido", "rescindido", "renovado"].filter(s => s !== lease.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${headerBg} px-6 py-5 rounded-t-2xl`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-3">
              <p className="text-white/70 text-xs font-medium mb-0.5">Contrato #{lease.id}</p>
              <p className="text-white font-bold text-base leading-snug truncate">{prop?.address}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0">
              <X size={15} className="text-white" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Badge status={lease.status} />
            <AjusteBadge tipo={lease.tipoAjuste} />
            {alert && lease.status === "activo" && (
              <span className="text-white/90 text-sm font-bold ml-auto">
                {days <= 0 ? "Venció" : `${days}d restantes`}
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-5">

          {/* Partes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Inquilino</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tenant?.name}</p>
              {tenant?.email && <p className="text-xs text-gray-400 mt-0.5">{tenant.email}</p>}
              {tenant?.phone && <p className="text-xs text-gray-400">{tenant.phone}</p>}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Propietario</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{owner?.name ?? "—"}</p>
              {owner?.email && <p className="text-xs text-gray-400 mt-0.5">{owner.email}</p>}
            </div>
          </div>

          {/* Fechas y montos */}
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
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={10} /> Renta base</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtCurrency(lease.rent)}/mes</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={10} /> Ajuste</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {lease.tipoAjuste === "FIJO" || !lease.tipoAjuste
                  ? `+${lease.increase ?? 0}% ${lease.period ?? "anual"}`
                  : `${lease.tipoAjuste} · ${lease.period ?? "anual"}`}
              </p>
            </div>
          </div>

          {/* Índice base (ICL/IPC) */}
          {(lease.tipoAjuste === "ICL" || lease.tipoAjuste === "IPC") && lease.indiceBaseValor && (
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Índice base al inicio del contrato</p>
              <p className="text-sm font-bold text-teal-800 dark:text-teal-200">
                {Number(lease.indiceBaseValor).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              {lease.indiceBaseFecha && (
                <p className="text-xs text-teal-600 dark:text-teal-400">Período: {lease.indiceBaseFecha?.slice(0, 7)}</p>
              )}
            </div>
          )}

          {/* Próxima actualización */}
          {lease.proximaActualizacion && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <TrendingUp size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                Próxima actualización: <strong>{fmtDate(lease.proximaActualizacion)}</strong>
              </p>
            </div>
          )}

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Documentos */}
          <DocumentsSection entityType="lease" entityId={lease.id} {...docState} />

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { onClose(); onEdit(lease); }}
              className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Edit2 size={14} /> Editar
            </button>
            <button onClick={() => { onClose(); onDelete(lease.id); }}
              className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={14} /> Eliminar
            </button>
          </div>

          {/* Cambiar estado */}
          {otrosEstados.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Cambiar estado:</p>
              <div className="flex flex-wrap gap-2">
                {otrosEstados.map(s => (
                  <button key={s} onClick={() => onStatusChange(lease.id, s)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors capitalize">
                    <ChevronRight size={11} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Panel de gestión de índices (accesible desde aquí) ───────
function IndicesPanelToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <TrendingUp size={15} className="text-teal-500" />
          Gestión de índices ICL / IPC
        </span>
        <ChevronRight size={15} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Los índices se sincronizan automáticamente cada día a las 08:00 hs. Podés forzar la sincronización manualmente ahora.
          </p>
          <SyncIndicesButton />
          <div className="h-px bg-gray-100 dark:bg-gray-700" />
          <ManualIndexForm />
        </div>
      )}
    </div>
  );
}

// ─── Formulario de carga manual de un índice ─────────────────
function ManualIndexForm() {
  const [tipo,    setTipo]    = useState("ICL");
  const [periodo, setPeriodo] = useState("");
  const [valor,   setValor]   = useState("");
  const [status,  setStatus]  = useState(null);
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    if (!periodo || !valor) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/indices`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tipo, periodo, valor: parseFloat(valor) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus({ ok: true, msg: `✓ ${tipo} ${periodo.slice(0, 7)} = ${valor} guardado` });
      setValor("");
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Carga manual de valor</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="ICL">ICL</option>
            <option value="IPC">IPC</option>
          </Select>
        </Field>
        <Field label="Período">
          <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </Field>
        <Field label="Valor">
          <Input type="number" step="0.01" placeholder="1234.56" value={valor} onChange={e => setValor(e.target.value)} />
        </Field>
      </div>
      <button onClick={save} disabled={saving || !periodo || !valor}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? "Guardando…" : "Guardar valor manual"}
      </button>
      {status && (
        <p className={`text-xs ${status.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {status.msg}
        </p>
      )}
    </div>
  );
}

// ─── Página principal: Contratos ──────────────────────────────
export function Leases({ properties, setProperties, owners, tenants, leases, setLeases, initialTab = "activo" }) {
  const [tab,     setTab]     = useState(initialTab);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [detail,  setDetail]  = useState(null);
  const [formErr, setFormErr] = useState("");

  const [form, setForm] = useState({
    propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "",
    tipoAjuste: "FIJO", increase: "6", period: "anual", status: "activo",
  });

  // ── Actualiza el form cuando cambia initialTab desde afuera ──
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // ── Lista filtrada ──
  const filtered = leases.filter(l => {
    const matchTab    = tab === "todos" || l.status === tab;
    const prop        = properties.find(p => p.id === l.propertyId);
    const tenant      = tenants.find(t => t.id === l.tenantId);
    const q           = search.toLowerCase();
    const matchSearch = !search ||
      prop?.address?.toLowerCase().includes(q) ||
      tenant?.name?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", tipoAjuste: "FIJO", increase: "6", period: "anual", status: "activo" });
    setFormErr("");
    setModal(true);
  };

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({
      propertyId: l.propertyId,
      tenantId:   l.tenantId,
      startDate:  l.startDate  ?? "",
      endDate:    l.endDate    ?? "",
      rent:       String(l.rent),
      tipoAjuste: l.tipoAjuste ?? "FIJO",
      increase:   String(l.increase ?? 6),
      period:     l.period     ?? "anual",
      status:     l.status     ?? "activo",
    });
    setFormErr("");
    setModal(true);
  };

  const validate = () => {
    if (!form.propertyId)              return "Seleccioná una propiedad.";
    if (!form.tenantId)                return "Seleccioná un inquilino.";
    if (!isValidDate(form.startDate))  return "La fecha de inicio no es válida.";
    if (!isValidDate(form.endDate))    return "La fecha de fin no es válida.";
    if (new Date(form.endDate) <= new Date(form.startDate))
                                       return "La fecha de fin debe ser posterior al inicio.";
    if (!form.rent || Number(form.rent) <= 0) return "Ingresá un monto de renta válido.";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setFormErr(err); return; }
    setSaving(true);
    setFormErr("");
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `${API}/api/leases/${editing}` : `${API}/api/leases`;
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: form.propertyId,
          tenantId:   form.tenantId,
          startDate:  form.startDate,
          endDate:    form.endDate,
          rent:       Number(form.rent),
          tipoAjuste: form.tipoAjuste,
          increase:   form.tipoAjuste === "FIJO" ? Number(form.increase) : 0,
          period:     form.period,
          status:     form.status,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const saved = await res.json();
      if (editing) {
        setLeases(prev => prev.map(l => l.id === editing ? { ...l, ...saved } : l));
      } else {
        setLeases(prev => [...prev, saved]);
        setProperties(prev => prev.map(p => p.id === form.propertyId ? { ...p, status: "ocupado", leaseId: saved.id } : p));
      }
      setModal(false);
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este contrato? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API}/api/leases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      const deleted = leases.find(l => l.id === id);
      setLeases(prev => prev.filter(l => l.id !== id));
      if (deleted) {
        setProperties(prev => prev.map(p => p.id === deleted.propertyId ? { ...p, status: "vacante", leaseId: null } : p));
      }
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/api/leases/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLeases(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  // Solo propiedades vacantes (o la actual al editar)
  const propiedadesDisponibles = properties.filter(p =>
    p.status === "vacante" || (editing && leases.find(l => l.id === editing)?.propertyId === p.id)
  );

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contratos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {leases.filter(l => l.status === "activo").length} contratos activos
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      {/* Panel de índices (colapsable) */}
      <IndicesPanelToggle />

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => {
          const count = t === "todos" ? leases.length : leases.filter(l => l.status === t).length;
          return (
            <button key={t} onClick={() => { setTab(t); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {t}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por propiedad o inquilino…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
          Hacé click en un contrato para ver los detalles
        </p>
      )}

      {/* Lista */}
      <div className="grid gap-3">
        {filtered.map(l => {
          const prop   = properties.find(p => p.id === l.propertyId);
          const tenant = tenants.find(t => t.id === l.tenantId);
          const days   = diffDays(l.endDate);
          const alert  = l.status === "activo" ? getAlertLevel(days) : null;

          return (
            <div key={l.id}
              onClick={() => setDetail(l)}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  alert
                    ? `${alert.bg} border ${alert.border}`
                    : "bg-blue-50 dark:bg-blue-900/30"
                }`}>
                  <FileText size={16} className={alert ? alert.color : "text-blue-600 dark:text-blue-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {prop?.address || "(propiedad eliminada)"}
                    </p>
                    <Badge status={l.status} />
                    <AjusteBadge tipo={l.tipoAjuste} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {tenant?.name || "(inquilino eliminado)"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />{fmtDate(l.startDate)} — {fmtDate(l.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={11} />{fmtCurrency(l.rent)}/mes
                    </span>
                    {l.tipoAjuste === "FIJO" && l.increase > 0 && (
                      <span className="flex items-center gap-1">
                        <Percent size={11} />+{l.increase}% {l.period}
                      </span>
                    )}
                    {l.proximaActualizacion && (
                      <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                        <TrendingUp size={11} />Próx. act.: {fmtDate(l.proximaActualizacion)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {alert && (
                    <div className="text-right mr-1">
                      <p className={`text-xl font-black leading-none ${alert.color}`}>
                        {days <= 0 ? "Venció" : `${days}d`}
                      </p>
                      <p className={`text-xs ${alert.color}`}>{alert.label}</p>
                    </div>
                  )}
                  <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Edit2 size={13} className="text-gray-400" />
                  </button>
                  <button onClick={() => del(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 text-center">
            <FileText size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? "Sin resultados para tu búsqueda" : "Sin contratos"}
            </p>
            {!search && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Creá el primer contrato con el botón de arriba
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {detail && (
        <LeaseDetailModal
          lease={detail}
          properties={properties}
          tenants={tenants}
          owners={owners}
          onClose={() => setDetail(null)}
          onEdit={(l) => { setDetail(null); openEdit(l); }}
          onDelete={(id) => { setDetail(null); del(id); }}
          onStatusChange={(id, status) => {
            updateStatus(id, status);
            setDetail(prev => prev ? { ...prev, status } : null);
          }}
        />
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        title={editing ? "Editar Contrato" : "Nuevo Contrato"}
        wide
      >
        <div className="space-y-4">

          {/* Partes */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Propiedad">
              <Select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {propiedadesDisponibles.map(p => (
                  <option key={p.id} value={p.id}>{p.address}</option>
                ))}
              </Select>
            </Field>
            <Field label="Inquilino">
              <Select value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha inicio">
              <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="Fecha fin">
              <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>

          {/* Renta */}
          <Field label="Renta mensual (ARS)">
            <Input
              type="number"
              placeholder="Ej: 350000"
              value={form.rent}
              onChange={e => setForm({ ...form, rent: e.target.value })}
            />
          </Field>

          {/* Cláusula de ajuste */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-700/30">
            <AjusteSelector
              tipoAjuste={form.tipoAjuste}
              onChange={v  => setForm({ ...form, tipoAjuste: v })}
              period={form.period}
              onPeriod={v  => setForm({ ...form, period: v })}
              increase={form.increase}
              onIncrease={v => setForm({ ...form, increase: v })}
            />
          </div>

          {/* Estado (solo al editar) */}
          {editing && (
            <Field label="Estado del contrato">
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="activo">Activo</option>
                <option value="vencido">Vencido</option>
                <option value="rescindido">Rescindido</option>
                <option value="renovado">Renovado</option>
              </Select>
            </Field>
          )}

          {/* Documentos (solo al editar) */}
          {editing && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
              <LeaseDocuments leaseId={editing} />
            </div>
          )}

          {/* Error de validación */}
          {formErr && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{formErr}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setModal(false); setEditing(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando…" : (editing ? "Actualizar" : "Crear Contrato")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}