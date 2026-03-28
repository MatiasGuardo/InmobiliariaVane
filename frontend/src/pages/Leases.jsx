import { useState } from "react";
import { AlertTriangle, Calendar, CheckCircle, Edit2, FileText, Percent, Plus, RefreshCw, Search, Trash2, Calculator, X } from "lucide-react";
import { Modal }              from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/FormField";
import { Badge }              from "../components/ui/Badge";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel, isValidDate, API } from "../utils/helpers";

const PERIODS = [
  { value: "trimestral", label: "Trimestral", months: 3  },
  { value: "semestral",  label: "Semestral",  months: 6  },
  { value: "anual",      label: "Anual",      months: 12 },
];

// ─── Calculadora de ajuste ─────────────────────────────────────
function RentCalculator({ lease, onClose }) {
  const periodInfo = PERIODS.find(p => p.value === lease.period) || PERIODS[2];
  const [numPeriods, setNumPeriods] = useState(1);
  const maxPeriods = Math.max(1, Math.ceil(24 / periodInfo.months));
  const rate = lease.increase / 100;

  const rows = [];
  let rent = lease.rent;
  for (let i = 0; i <= numPeriods; i++) {
    const d = new Date(lease.startDate);
    d.setMonth(d.getMonth() + i * periodInfo.months);
    rows.push({ i, rent, date: d });
    if (i < numPeriods) rent = Math.round(rent * (1 + rate));
  }
  const finalRent = rows[rows.length - 1].rent;
  const totalPct  = (((finalRent / lease.rent) - 1) * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Calculadora de ajuste</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
          <X size={14} className="text-blue-500 dark:text-blue-400" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Renta base",   value: fmtCurrency(lease.rent) },
            { label: "Aumento",      value: `+${lease.increase}%`   },
            { label: "Periodicidad", value: periodInfo.label        },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Número de ajustes</label>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
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

        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Después de {numPeriods} {numPeriods === 1 ? "ajuste" : "ajustes"} ({numPeriods * periodInfo.months} meses)
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Incremento total: +{totalPct}%</p>
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

// ─── Selector de periodicidad ─────────────────────────────────
function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {PERIODS.map(p => (
        <button key={p.value} type="button" onClick={() => onChange(p.value)}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
            value === p.value
              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400"
          }`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Validación ──────────────────────────────────────────────
function validateLeaseForm(form, isNew = true) {
  const errors = [];
  if (!form.propertyId) errors.push("propiedad");
  if (!form.tenantId)   errors.push("inquilino");
  if (!form.startDate)  errors.push("fecha de inicio");
  if (!form.endDate)    errors.push("fecha de fin");
  if (!form.rent)       errors.push("renta mensual");
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

// ─── Leases ───────────────────────────────────────────────────
export function Leases({ leases, setLeases, properties, tenants, initialTab = "activo" }) {
  const [tab,         setTab]         = useState(initialTab === "activo" ? "activo" : "finalizado");
  const [search,      setSearch]      = useState("");
  const [modal,       setModal]       = useState(false);
  const [renewModal,  setRenewModal]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [formError,   setFormError]   = useState("");
  const [renewError,  setRenewError]  = useState("");
  const [calcOpen,    setCalcOpen]    = useState(null);

  const [form, setForm] = useState({
    propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6", period: "anual",
  });
  const [renewForm, setRenewForm] = useState({
    tenantId: "", startDate: "", endDate: "", rent: "", increase: "6", period: "anual",
  });

  const activos     = [...leases].filter(l => l.status === "activo").sort((a, b) => diffDays(a.endDate) - diffDays(b.endDate));
  // Finalizados: todos los no-activos EXCEPTO "renovado" (esos se eliminan al renovar)
  const finalizados = [...leases].filter(l => l.status !== "activo" && l.status !== "renovado").sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

  const filterFn = (l) => {
    if (!search) return true;
    const q    = search.toLowerCase();
    const prop = properties.find(p => p.id === l.propertyId);
    const ten  = tenants.find(t => t.id === l.tenantId);
    return prop?.address?.toLowerCase().includes(q) || ten?.name?.toLowerCase().includes(q);
  };

  const currentList = (tab === "activo" ? activos : finalizados).filter(filterFn);

  const openNew = () => {
    setEditing(null);
    setForm({ propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6", period: "anual" });
    setFormError("");
    setModal(true);
  };

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({
      propertyId: l.propertyId, tenantId: l.tenantId,
      startDate: l.startDate, endDate: l.endDate,
      rent: String(l.rent), increase: String(l.increase), period: l.period || "anual",
    });
    setFormError("");
    setModal(true);
  };

  const openRenew = (l) => {
    setRenewTarget(l);
    // Para contratos vencidos, la nueva fecha de inicio es hoy
    // Para contratos activos, la nueva fecha de inicio es el día siguiente al fin
    const isVencido = l.status === "vencido";
    let nextStart;
    if (isVencido) {
      nextStart = new Date();
    } else {
      nextStart = new Date(l.endDate);
      nextStart.setDate(nextStart.getDate() + 1);
    }
    const ns = nextStart.toISOString().split("T")[0];
    const nextEnd = new Date(nextStart);
    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    const ne = nextEnd.toISOString().split("T")[0];
    const newRent = Math.round(l.rent * (1 + (l.increase || 6) / 100));
    setRenewForm({ tenantId: l.tenantId, startDate: ns, endDate: ne, rent: String(newRent), increase: String(l.increase || 6), period: l.period || "anual" });
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
        body: JSON.stringify({ ...form, rent: Number(form.rent), increase: Number(form.increase), period: form.period }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setLeases(prev => editing ? prev.map(l => l.id === editing ? saved : l) : [...prev, saved]);
      setModal(false);
    } catch (e) { setFormError("Error al guardar: " + e.message); }
    finally { setSaving(false); setEditing(null); }
  };

  // Al renovar: eliminamos el contrato anterior (no lo marcamos como renovado)
  // y creamos uno nuevo activo. Si el anterior era activo, el backend libera
  // la propiedad al eliminarlo y la vuelve a marcar al crear el nuevo.
  const confirmRenew = async () => {
    const err = validateRenewForm(renewForm);
    if (err) { setRenewError(err); return; }
    setSaving(true); setRenewError("");
    try {
      // 1. Eliminar el contrato anterior
      const delRes = await fetch(`${API}/api/leases/${renewTarget.id}`, { method: "DELETE" });
      if (!delRes.ok) throw new Error(await delRes.text());

      // 2. Crear el nuevo contrato activo
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
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newLease = await res.json();

      // 3. Quitar el anterior del estado local y agregar el nuevo
      setLeases(prev => [...prev.filter(l => l.id !== renewTarget.id), newLease]);
      setRenewModal(false);
      setRenewTarget(null);
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

  // ─── Tarjeta de contrato ──────────────────────────────────────
  const LeaseCard = ({ l }) => {
    const prop    = properties.find(p => p.id === l.propertyId);
    const tenant  = tenants.find(t => t.id === l.tenantId);
    const days    = diffDays(l.endDate);
    const alert   = l.status === "activo" ? getAlertLevel(days) : null;
    const progress = Math.min(100, Math.max(0,
      ((new Date() - new Date(l.startDate)) / (new Date(l.endDate) - new Date(l.startDate))) * 100
    ));
    const periodLabel = PERIODS.find(p => p.value === l.period)?.label || "Anual";
    const isCalcOpen  = calcOpen === l.id;

    // Puede renovar si está activo O si está vencido
    const canRenew = l.status === "activo" || l.status === "vencido";

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 transition-all hover:shadow-md ${alert ? alert.border : "border-gray-100 dark:border-gray-700"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{prop?.address}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tenant?.name}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Calendar size={11} />{fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Percent size={11} />+{l.increase}% {periodLabel.toLowerCase()}
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
            <div className="flex flex-col gap-1">
              {l.status === "activo" && (
                <>
                  <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Editar">
                    <Edit2 size={13} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => setCalcOpen(isCalcOpen ? null : l.id)}
                    className={`p-1.5 rounded-lg transition-colors ${isCalcOpen ? "bg-blue-100 dark:bg-blue-900/40" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
                    title="Calculadora de ajuste"
                  >
                    <Calculator size={13} className="text-blue-500 dark:text-blue-400" />
                  </button>
                </>
              )}
              {canRenew && (
                <button onClick={() => openRenew(l)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Renovar contrato">
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
              <div
                className={`h-full rounded-full transition-all duration-700 ${alert ? (days <= 15 ? "bg-red-500" : days <= 30 ? "bg-orange-400" : "bg-amber-400") : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {isCalcOpen && (
          <div className="mt-4">
            <RentCalculator lease={l} onClose={() => setCalcOpen(null)} />
          </div>
        )}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contratos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activos.length} activos · {finalizados.length} finalizados
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 w-fit">
        {[
          { key: "activo",     label: "Activos",     count: activos.length     },
          { key: "finalizado", label: "Finalizados", count: finalizados.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(""); setCalcOpen(null); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === key
                ? "bg-blue-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === key
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar en contratos ${tab === "activo" ? "activos" : "finalizados"}…`}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-12 text-center">
            {tab === "activo"
              ? <FileText size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
              : <CheckCircle size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            }
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? "Sin resultados para tu búsqueda" : tab === "activo" ? "Sin contratos activos" : "Sin contratos finalizados"}
            </p>
          </div>
        ) : (
          currentList.map(l => <LeaseCard key={l.id} l={l} />)
        )}
      </div>

      {/* ── Modal nuevo / editar ── */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Editar Contrato" : "Nuevo Contrato"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Propiedad">
              <Select value={form.propertyId} onChange={e => { setForm({ ...form, propertyId: e.target.value }); setFormError(""); }}>
                <option value="">Seleccionar...</option>
                {(editing ? properties : properties.filter(p => p.status === "vacante"))
                  .map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
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
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Percent size={14} className="text-gray-400" /> Cláusula de ajuste
            </p>
            <div className="flex gap-3 items-end">
              <div className="w-28 flex-shrink-0">
                <Field label="Porcentaje">
                  <Input type="number" placeholder="Ej: 10" value={form.increase} onChange={e => setForm({ ...form, increase: e.target.value })} />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Periodicidad">
                  <PeriodSelector value={form.period} onChange={v => setForm({ ...form, period: v })} />
                </Field>
              </div>
            </div>
            {form.increase && (
              <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
                El alquiler aumentará un <strong>{form.increase}%</strong> de forma <strong>{PERIODS.find(p => p.value === form.period)?.label.toLowerCase()}</strong>
              </p>
            )}
          </div>
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
            {/* Resumen contrato anterior */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Contrato a reemplazar</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {properties.find(p => p.id === renewTarget.propertyId)?.address}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fmtDate(renewTarget.startDate)} → {fmtDate(renewTarget.endDate)} · {fmtCurrency(renewTarget.rent)}/mes ·{" "}
                {tenants.find(t => t.id === renewTarget.tenantId)?.name}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                ⚠ Este contrato se eliminará y será reemplazado por el nuevo.
              </p>
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
            <Field label="Nueva renta mensual (ARS)" hint="Pre-calculado con el aumento aplicado">
              <Input type="number" value={renewForm.rent} onChange={e => { setRenewForm({ ...renewForm, rent: e.target.value }); setRenewError(""); }} />
            </Field>
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Percent size={14} className="text-gray-400" /> Cláusula de ajuste del nuevo contrato
              </p>
              <div className="flex gap-3 items-end">
                <div className="w-28 flex-shrink-0">
                  <Field label="Porcentaje">
                    <Input type="number" value={renewForm.increase} onChange={e => setRenewForm({ ...renewForm, increase: e.target.value })} />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Periodicidad">
                    <PeriodSelector value={renewForm.period} onChange={v => setRenewForm({ ...renewForm, period: v })} />
                  </Field>
                </div>
              </div>
              {renewForm.increase && (
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
                  El alquiler aumentará un <strong>{renewForm.increase}%</strong> de forma <strong>{PERIODS.find(p => p.value === renewForm.period)?.label.toLowerCase()}</strong>
                </p>
              )}
            </div>
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