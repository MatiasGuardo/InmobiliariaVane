import { useState } from "react";
import { AlertTriangle, Calendar, CheckCircle, Edit2, FileText, Percent, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Modal }              from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/FormField";
import { Badge }              from "../components/ui/Badge";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel, isValidDate, API } from "../utils/helpers";

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
  return null;
}

// ─── Leases ───────────────────────────────────────────────────
export function Leases({ leases, setLeases, properties, tenants }) {
  const [search,      setSearch]      = useState("");
  const [modal,       setModal]       = useState(false);
  const [renewModal,  setRenewModal]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [formError,   setFormError]   = useState("");
  const [renewError,  setRenewError]  = useState("");

  const [form, setForm] = useState({
    propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6",
  });
  const [renewForm, setRenewForm] = useState({
    tenantId: "", startDate: "", endDate: "", rent: "", increase: "6",
  });

  // Separar y ordenar
  const activos = [...leases]
    .filter(l => l.status === "activo")
    .sort((a, b) => diffDays(a.endDate) - diffDays(b.endDate));

  const finalizados = [...leases]
    .filter(l => l.status !== "activo")
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

  // Filtro de búsqueda
  const filterFn = (l) => {
    if (!search) return true;
    const q    = search.toLowerCase();
    const prop = properties.find(p => p.id === l.propertyId);
    const ten  = tenants.find(t => t.id === l.tenantId);
    return (
      prop?.address?.toLowerCase().includes(q) ||
      ten?.name?.toLowerCase().includes(q)
    );
  };

  const filteredActivos    = activos.filter(filterFn);
  const filteredFinalizados = finalizados.filter(filterFn);

  const openNew = () => {
    setEditing(null);
    setForm({ propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6" });
    setFormError("");
    setModal(true);
  };

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({ propertyId: l.propertyId, tenantId: l.tenantId, startDate: l.startDate, endDate: l.endDate, rent: String(l.rent), increase: String(l.increase) });
    setFormError("");
    setModal(true);
  };

  const openRenew = (l) => {
    setRenewTarget(l);
    const nextStart = new Date(l.endDate);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextStartStr = nextStart.toISOString().split("T")[0];
    const nextEnd = new Date(nextStart);
    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    const nextEndStr = nextEnd.toISOString().split("T")[0];
    const newRent = Math.round(l.rent * (1 + (l.increase || 6) / 100));
    // Pre-rellena con el mismo inquilino, pero permite cambiar
    setRenewForm({ tenantId: l.tenantId, startDate: nextStartStr, endDate: nextEndStr, rent: String(newRent), increase: String(l.increase || 6) });
    setRenewError("");
    setRenewModal(true);
  };

  const save = async () => {
    const err = validateLeaseForm(form, !editing);
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError("");
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `${API}/api/leases/${editing}` : `${API}/api/leases`;
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rent: Number(form.rent), increase: Number(form.increase) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setLeases(prev => editing ? prev.map(l => l.id === editing ? saved : l) : [...prev, saved]);
      setModal(false);
    } catch (e) {
      setFormError("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  const confirmRenew = async () => {
    const err = validateRenewForm(renewForm);
    if (err) { setRenewError(err); return; }
    setSaving(true);
    setRenewError("");
    try {
      // Marcar el contrato anterior como renovado
      await fetch(`${API}/api/leases/${renewTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "renovado" }),
      });
      // Crear nuevo contrato (puede tener distinto inquilino)
      const res = await fetch(`${API}/api/leases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: renewTarget.propertyId,
          tenantId:   renewForm.tenantId,
          startDate:  renewForm.startDate,
          endDate:    renewForm.endDate,
          rent:       Number(renewForm.rent),
          increase:   Number(renewForm.increase),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newLease = await res.json();
      setLeases(prev => [
        ...prev.map(l => l.id === renewTarget.id ? { ...l, status: "renovado" } : l),
        newLease,
      ]);
      setRenewModal(false);
      setRenewTarget(null);
    } catch (e) {
      setRenewError("Error al renovar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este contrato?")) return;
    try {
      await fetch(`${API}/api/leases/${id}`, { method: "DELETE" });
      setLeases(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  // ─── Tarjeta de contrato ─────────────────────────────────────
  const LeaseCard = ({ l }) => {
    const prop    = properties.find(p => p.id === l.propertyId);
    const tenant  = tenants.find(t => t.id === l.tenantId);
    const days    = diffDays(l.endDate);
    const alert   = l.status === "activo" ? getAlertLevel(days) : null;
    const progress = Math.min(100, Math.max(0,
      ((new Date() - new Date(l.startDate)) / (new Date(l.endDate) - new Date(l.startDate))) * 100
    ));

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
                  <Percent size={11} />+{l.increase}% anual
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
                  <button onClick={() => openRenew(l)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Renovar">
                    <RefreshCw size={13} className="text-emerald-500" />
                  </button>
                </>
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
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contratos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activos.length} activos · {finalizados.length} finalizados</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por dirección o inquilino..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Contratos activos */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Contratos Activos
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({activos.length})</span>
        </h2>
        {filteredActivos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-12 text-center">
            <FileText size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? "Sin resultados para tu búsqueda" : "Sin contratos activos"}
            </p>
          </div>
        ) : (
          filteredActivos.map(l => <LeaseCard key={l.id} l={l} />)
        )}
      </div>

      {/* Contratos finalizados */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" />
          Contratos Finalizados
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({finalizados.length})</span>
        </h2>
        {filteredFinalizados.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-12 text-center">
            <CheckCircle size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? "Sin resultados para tu búsqueda" : "Sin contratos finalizados"}
            </p>
          </div>
        ) : (
          filteredFinalizados.map(l => <LeaseCard key={l.id} l={l} />)
        )}
      </div>

      {/* Modal nuevo / editar */}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Renta mensual (ARS)">
              <Input type="number" placeholder="Ej: 350000" value={form.rent} onChange={e => { setForm({ ...form, rent: e.target.value }); setFormError(""); }} />
            </Field>
            <Field label="Aumento anual (%)" hint="Cláusula de ajuste por año">
              <Input type="number" placeholder="Ej: 6" value={form.increase} onChange={e => setForm({ ...form, increase: e.target.value })} />
            </Field>
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

      {/* Modal renovación — incluye selector de inquilino */}
      <Modal open={renewModal} onClose={() => { setRenewModal(false); setRenewTarget(null); }} title="Renovar Contrato" wide>
        {renewTarget && (
          <div className="space-y-4">
            {/* Resumen contrato anterior */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Contrato anterior</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {properties.find(p => p.id === renewTarget.propertyId)?.address}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fmtDate(renewTarget.startDate)} → {fmtDate(renewTarget.endDate)} · {fmtCurrency(renewTarget.rent)}/mes ·{" "}
                Inquilino: {tenants.find(t => t.id === renewTarget.tenantId)?.name}
              </p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              El contrato anterior pasará a estado <strong>Renovado</strong>. Podés cambiar el inquilino si corresponde.
            </p>

            {/* Inquilino (puede cambiar) */}
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nueva renta mensual (ARS)" hint="Pre-calculado con el aumento aplicado">
                <Input type="number" value={renewForm.rent} onChange={e => { setRenewForm({ ...renewForm, rent: e.target.value }); setRenewError(""); }} />
              </Field>
              <Field label="Aumento anual (%)" hint="Para el nuevo contrato">
                <Input type="number" value={renewForm.increase} onChange={e => setRenewForm({ ...renewForm, increase: e.target.value })} />
              </Field>
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