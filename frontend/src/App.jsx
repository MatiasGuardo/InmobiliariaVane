import { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2, Users, FileText, Bell, LayoutDashboard,
  Plus, Search, X, AlertTriangle,
  CheckCircle, Calendar, DollarSign, Phone, Mail,
  Edit2, Trash2, ArrowUpRight, ArrowDownRight, Percent, Key,
  User, RefreshCw, Moon, Sun
} from "lucide-react";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const today    = new Date();
const fmtDate  = d => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
const diffDays = d => Math.ceil((new Date(d) - today) / 86400000);

const getAlertLevel = (days) => {
  if (days <= 15) return { label: "Crítico",  color: "text-red-500",    bg: "bg-red-500/10",    dot: "bg-red-500",    border: "border-red-500/20"    };
  if (days <= 30) return { label: "Urgente",  color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400", border: "border-orange-500/20"  };
  if (days <= 90) return { label: "Próximo",  color: "text-amber-400",  bg: "bg-amber-500/10",  dot: "bg-amber-400",  border: "border-amber-500/20"   };
  return null;
};

const fmtCurrency = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ─── DARK MODE HOOK ──────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    let stored = localStorage.getItem("propmanager-dark");
    if (stored === "true" || stored === "false") {
      return stored === "true";
    } else {
      // Si hay un valor inválido, lo limpiamos y usamos el sistema
      localStorage.removeItem("propmanager-dark");
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Siempre guardar como string "true" o "false"
    localStorage.setItem("propmanager-dark", dark ? "true" : "false");
  }, [dark]);

  return [dark, setDark];
}

// ─── HOOK useApi ─────────────────────────────────────────────────────────────
function useApi(endpoint) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);
  return { data, setData, loading, error, reload: load };
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── FORM HELPERS ────────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
    >
      {children}
    </select>
  );
}

// ─── LOADING / ERROR ─────────────────────────────────────────────────────────
function ErrorBox({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <AlertTriangle size={28} className="text-red-400 mx-auto mb-2" />
      <p className="font-medium text-red-700">Error al cargar datos</p>
      <p className="text-sm text-red-500 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-xl hover:bg-red-200 transition-colors">
          Reintentar
        </button>
      )}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "blue", trend }) {
  const colors = {
    blue:   { bg: "bg-blue-50",    icon: "text-blue-600" },
    green:  { bg: "bg-emerald-50", icon: "text-emerald-600" },
    orange: { bg: "bg-orange-50",  icon: "text-orange-600" },
    slate:  { bg: "bg-slate-50",   icon: "text-slate-600" },
  };
  const c = colors[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon size={18} className={c.icon} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    ocupado:    "bg-emerald-100 text-emerald-700",
    vacante:    "bg-gray-100 text-gray-600",
    activo:     "bg-blue-100 text-blue-700",
    vencido:    "bg-red-100 text-red-700",
    rescindido: "bg-orange-100 text-orange-700",
    renovado:   "bg-purple-100 text-purple-700",
    pendiente:  "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ properties, leases, tenants }) {
  const occupied  = properties.filter(p => p.status === "ocupado").length;
  const vacant    = properties.filter(p => p.status === "vacante").length;
  const totalRent = leases.filter(l => l.status === "activo").reduce((s, l) => s + l.rent, 0);

  const alerts = leases
    .filter(l => l.status === "activo")
    .map(l => {
      const days  = diffDays(l.endDate);
      const level = getAlertLevel(days);
      if (!level) return null;
      return { ...l, days, level, prop: properties.find(p => p.id === l.propertyId), tenant: tenants.find(t => t.id === l.tenantId) };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);


  const recentLeases = [...leases]
    .filter(l => l.status === "activo")
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2}   label="Propiedades Totales"  value={properties.length} color="blue"   trend={8} />
        <StatCard icon={CheckCircle} label="Propiedades Ocupadas" value={occupied} sub={properties.length ? `${Math.round(occupied / properties.length * 100)}% ocupación` : ""} color="green" />
        <StatCard icon={Key}         label="Vacantes"             value={vacant}   color="orange" />
        <StatCard icon={DollarSign}  label="Renta Mensual Total"  value={fmtCurrency(totalRent)} color="slate" trend={6} />
      </div>

      {properties.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Tasa de Ocupación</h3>
            <span className="text-2xl font-bold text-gray-900">{Math.round(occupied / properties.length * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
              style={{ width: `${(occupied / properties.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{occupied} ocupadas</span>
            <span>{vacant} vacantes</span>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800">Alertas de Vencimiento</h3>
            <span className="ml-auto text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {alerts.length} contratos
            </span>
          </div>
          <div className="space-y-3">
            {alerts.map(a => (
              <div key={a.id} className={`flex items-center gap-4 p-3.5 rounded-xl border ${a.level.bg} ${a.level.border}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.level.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.prop?.address}</p>
                  <p className="text-xs text-gray-500">{a.tenant?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${a.level.color}`}>{a.days === 0 ? "Hoy" : `${a.days}d`}</p>
                  <p className={`text-xs ${a.level.color}`}>{a.level.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Contratos Activos Recientes</h3>
        {recentLeases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin contratos activos</p>
        ) : (
          <div className="space-y-2">
            {recentLeases.map(l => {
              const prop   = properties.find(p => p.id === l.propertyId);
              const tenant = tenants.find(t => t.id === l.tenantId);
              const days   = diffDays(l.endDate);
              const alert  = getAlertLevel(days);
              return (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{prop?.address}</p>
                    <p className="text-xs text-gray-400">{tenant?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{fmtCurrency(l.rent)}</p>
                    {alert
                      ? <p className={`text-xs ${alert.color}`}>{days}d restantes</p>
                      : <p className="text-xs text-gray-400">Vence {fmtDate(l.endDate)}</p>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROPERTIES ──────────────────────────────────────────────────────────────
function Properties({ properties, setProperties, owners }) {
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("todos");
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ address: "", type: "Departamento", price: "", status: "vacante", ownerId: "" });

  const filtered = properties.filter(p => {
    const matchSearch = p.address.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "todos" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const openNew  = () => { setEditing(null); setForm({ address: "", type: "Departamento", price: "", status: "vacante", ownerId: "" }); setModal(true); };
  const openEdit = (p) => { setEditing(p.id); setForm({ address: p.address, type: p.type, price: p.price, status: p.status, ownerId: p.ownerId }); setModal(true); };

  const save = async () => {
    if (!form.address || !form.price) return;
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `${API}/api/properties/${editing}` : `${API}/api/properties`;
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setProperties(prev => editing ? prev.map(p => p.id === editing ? saved : p) : [...prev, saved]);
      setModal(false);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar esta propiedad?")) return;
    try {
      await fetch(`${API}/api/properties/${id}`, { method: "DELETE" });
      setProperties(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propiedades</h1>
          <p className="text-sm text-gray-500 mt-1">{properties.length} propiedades registradas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nueva Propiedad
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por dirección..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {["todos", "ocupado", "vacante"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${filter === f ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map(p => {
          const owner = owners.find(o => o.id === p.ownerId);
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{p.address}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{p.type}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {owner && <span className="flex items-center gap-1"><User size={11} />{owner.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{fmtCurrency(p.price)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">por mes</p>
                    <Badge status={p.status} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <Edit2 size={13} className="text-gray-400" />
                    </button>
                    <button onClick={() => del(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <Building2 size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-500">Sin propiedades</p>
            <p className="text-sm text-gray-400 mt-1">Agrega tu primera propiedad</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Propiedad" : "Nueva Propiedad"} wide>
        <div className="space-y-4">
          <Field label="Dirección completa">
            <Input placeholder="Av. Santa Fe 2450, Piso 3B" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {["Departamento", "Casa", "Local Comercial", "Oficina", "Galpón", "Terreno", "Otro"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="vacante">Vacante</option>
                <option value="ocupado">Ocupado</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio lista (ARS)">
              <Input type="number" placeholder="Ej: 320000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label="Propietario">
              <Select value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? "Guardando…" : (editing ? "Actualizar" : "Crear Propiedad")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── CONTACTS ────────────────────────────────────────────────────────────────
function Contacts({ owners, setOwners, tenants, setTenants, properties, leases }) {
  const [tab,     setTab]     = useState("owners");
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "owner" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", role: tab === "owners" ? "owner" : "tenant" });
    setModal(true);
  };

  const openEdit = (person) => {
    setEditing(person.id);
    setForm({ name: person.name, email: person.email, phone: person.phone || "", role: tab === "owners" ? "owner" : "tenant" });
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    const endpoint = form.role === "owner" ? "/api/owners" : "/api/tenants";
    const method   = editing ? "PUT" : "POST";
    const url      = editing ? `${API}${endpoint}/${editing}` : `${API}${endpoint}`;
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      if (form.role === "owner") {
        setOwners(prev => editing ? prev.map(o => o.id === editing ? saved : o) : [...prev, saved]);
      } else {
        setTenants(prev => editing ? prev.map(t => t.id === editing ? saved : t) : [...prev, saved]);
      }
      setModal(false);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    const endpoint = tab === "owners" ? `/api/owners/${id}` : `/api/tenants/${id}`;
    try {
      const res = await fetch(`${API}${endpoint}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (tab === "owners") setOwners(prev => prev.filter(o => o.id !== id));
      else                  setTenants(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  const list = tab === "owners" ? owners : tenants;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-sm text-gray-500 mt-1">{owners.length} propietarios · {tenants.length} inquilinos</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("owners")}  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "owners"  ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>Propietarios</button>
        <button onClick={() => setTab("tenants")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "tenants" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>Inquilinos</button>
      </div>

      <div className="grid gap-3">
        {list.map(person => {
          const personProperties = tab === "owners" ? properties.filter(p => p.ownerId === person.id) : [];
          const lease = tab === "tenants" ? leases.find(l => l.id === person.leaseId) : null;
          return (
            <div key={person.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {person.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{person.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Mail size={11} />{person.email}</span>
                    {person.phone && <span className="flex items-center gap-1"><Phone size={11} />{person.phone}</span>}
                  </div>
                  {tab === "owners" && personProperties.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1.5">{personProperties.length} propiedad(es)</p>
                  )}
                  {lease && (
                    <p className="text-xs text-emerald-600 mt-1.5">Contrato activo · Vence {fmtDate(lease.endDate)}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(person)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <Edit2 size={13} className="text-gray-400" />
                  </button>
                  <button onClick={() => del(person.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <Users size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-500">Sin contactos</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Editar Contacto" : "Nuevo Contacto"}>
        <div className="space-y-4">
          <Field label="Rol">
            <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={!!editing}>
              <option value="owner">Propietario</option>
              <option value="tenant">Inquilino</option>
            </Select>
          </Field>
          <Field label="Nombre completo">
            <Input placeholder="Ej: Juan Pérez" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" placeholder="juan@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Teléfono" hint="Opcional">
            <Input placeholder="+54 11 1234-5678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setModal(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? "Guardando…" : (editing ? "Actualizar" : "Crear Contacto")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── LEASES ──────────────────────────────────────────────────────────────────
function Leases({ leases, setLeases, properties, tenants }) {
  const [modal,       setModal]       = useState(false);
  const [renewModal,  setRenewModal]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [form, setForm] = useState({ propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6" });
  const [renewForm, setRenewForm] = useState({ startDate: "", endDate: "", rent: "", increase: "6" });


  // Separar y ordenar
  const activos = [...leases]
    .filter(l => l.status === "activo")
    .sort((a, b) => diffDays(a.endDate) - diffDays(b.endDate)); // más próximos a vencer primero

  const finalizados = [...leases]
    .filter(l => l.status !== "activo")
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate)); // más recientes primero

  // Tabs para activos/finalizados
  const [tab, setTab] = useState("activos");

  const openNew = () => {
    setEditing(null);
    setForm({ propertyId: "", tenantId: "", startDate: "", endDate: "", rent: "", increase: "6" });
    setModal(true);
  };

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({ propertyId: l.propertyId, tenantId: l.tenantId, startDate: l.startDate, endDate: l.endDate, rent: String(l.rent), increase: String(l.increase) });
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
    setRenewForm({ startDate: nextStartStr, endDate: nextEndStr, rent: String(newRent), increase: String(l.increase || 6) });
    setRenewModal(true);
  };

  const save = async () => {
    // Validar fechas inválidas (ej: 30/02/2025) para inicio y fin antes de chequear campos vacíos
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const validStart = form.startDate && !isNaN(start.getTime()) && form.startDate === start.toISOString().split('T')[0];
    const validEnd = form.endDate && !isNaN(end.getTime()) && form.endDate === end.toISOString().split('T')[0];
    if ((form.startDate && !validStart) || (form.endDate && !validEnd)) {
      alert("Fecha incorrecta");
      return;
    }
    if (!form.propertyId || !form.tenantId || !form.startDate || !form.endDate || !form.rent) {
      alert("Completa todos los campos obligatorios");
      return;
    }
    // Validar que la fecha de fin no sea anterior a hoy
    if (end < new Date(new Date().toISOString().split('T')[0])) {
      alert("Fecha invalida");
      return;
    }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `${API}/api/leases/${editing}` : `${API}/api/leases`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rent: Number(form.rent), increase: Number(form.increase) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setLeases(prev => editing ? prev.map(l => l.id === editing ? saved : l) : [...prev, saved]);
      setModal(false);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  const confirmRenew = async () => {
    if (!renewForm.startDate || !renewForm.endDate || !renewForm.rent) return;
    setSaving(true);
    try {
      // Marcar contrato anterior como renovado
      await fetch(`${API}/api/leases/${renewTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "renovado" }),
      });
      // Crear nuevo contrato
      const res = await fetch(`${API}/api/leases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: renewTarget.propertyId,
          tenantId:   renewTarget.tenantId,
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
      alert("Error al renovar: " + e.message);
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

  // Card reutilizable
  const LeaseCard = ({ l }) => {
    const prop   = properties.find(p => p.id === l.propertyId);
    const tenant = tenants.find(t => t.id === l.tenantId);
    const days   = diffDays(l.endDate);
    const alert  = l.status === "activo" ? getAlertLevel(days) : null;
    const progress = Math.min(100, Math.max(0,
      ((new Date() - new Date(l.startDate)) / (new Date(l.endDate) - new Date(l.startDate))) * 100
    ));

    return (
      <div className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${alert ? alert.border : l.status === "activo" ? "border-emerald-200" : "border-gray-100"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{prop?.address}</p>
              <p className="text-sm text-gray-500 mt-0.5">{tenant?.name}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={11} />{fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Percent size={11} />+{l.increase}% anual
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="font-bold text-gray-900">{fmtCurrency(l.rent)}</p>
              <p className="text-xs text-gray-400 mt-0.5">por mes</p>
              {alert
                ? <p className={`text-xs font-semibold mt-1 ${alert.color}`}>{days <= 0 ? "Vencido" : `${days} días`}</p>
                : null
              }
            </div>
            <div className="flex flex-col gap-1">
              {(l.status === "activo" || l.status === "finalizado" || l.status === "vencido" || l.status === "rescindido") && (
                <>
                  <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Editar">
                    <Edit2 size={13} className="text-gray-400" />
                  </button>
                  <button onClick={() => openRenew(l)} className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors" title="Renovar">
                    <RefreshCw size={13} className="text-emerald-500" />
                  </button>
                </>
              )}
              <button onClick={() => del(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {l.status === "activo" && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Progreso del contrato</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">{activos.length} activos · {finalizados.length} finalizados</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("activos")}  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "activos"  ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>Activos</button>
        <button onClick={() => setTab("finalizados")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "finalizados" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>Finalizados</button>
      </div>

      {/* Lista según tab */}
      <div className="space-y-3">
        {tab === "activos" ? (
          activos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
              <FileText size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-500">Sin contratos activos</p>
            </div>
          ) : (
            activos.map(l => <LeaseCard key={l.id} l={l} />)
          )
        ) : (
          finalizados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
              <CheckCircle size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-500">Sin contratos finalizados</p>
            </div>
          ) : (
            finalizados.map(l => <LeaseCard key={l.id} l={l} />)
          )
        )}
      </div>

      {/* Modal nuevo / editar */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Editar Contrato" : "Nuevo Contrato"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Propiedad">
              <Select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </Select>
            </Field>
            <Field label="Inquilino">
              <Select value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de inicio"><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Fecha de fin">   <Input type="date" value={form.endDate}   onChange={e => setForm({ ...form, endDate:    e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Renta mensual (ARS)">
              <Input type="number" placeholder="Ej: 350000" value={form.rent} onChange={e => setForm({ ...form, rent: e.target.value })} />
            </Field>
            <Field label="Aumento anual (%)" hint="Cláusula de ajuste por año">
              <Input type="number" placeholder="Ej: 6" value={form.increase} onChange={e => setForm({ ...form, increase: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setModal(false); setEditing(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? "Guardando…" : (editing ? "Actualizar" : "Crear Contrato")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal renovación */}
      <Modal open={renewModal} onClose={() => { setRenewModal(false); setRenewTarget(null); }} title="Renovar Contrato" wide>
        {renewTarget && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 mb-1">Contrato anterior</p>
              <p className="text-sm font-medium text-gray-800">
                {properties.find(p => p.id === renewTarget.propertyId)?.address}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fmtDate(renewTarget.startDate)} → {fmtDate(renewTarget.endDate)} · {fmtCurrency(renewTarget.rent)}/mes
              </p>
            </div>
            <p className="text-sm text-gray-600">
              El contrato anterior pasará a estado <strong>Renovado</strong>. Completá los datos del nuevo período:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nueva fecha de inicio">
                <Input type="date" value={renewForm.startDate} onChange={e => setRenewForm({ ...renewForm, startDate: e.target.value })} />
              </Field>
              <Field label="Nueva fecha de fin">
                <Input type="date" value={renewForm.endDate} onChange={e => setRenewForm({ ...renewForm, endDate: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nueva renta mensual (ARS)" hint="Pre-calculado con el aumento aplicado">
                <Input type="number" value={renewForm.rent} onChange={e => setRenewForm({ ...renewForm, rent: e.target.value })} />
              </Field>
              <Field label="Aumento anual (%)" hint="Para el nuevo contrato">
                <Input type="number" value={renewForm.increase} onChange={e => setRenewForm({ ...renewForm, increase: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setRenewModal(false); setRenewTarget(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmRenew} disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
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

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function Notifications({ leases, properties, tenants }) {
  const notifications = leases
    .filter(l => l.status === "activo" && new Date(l.endDate) >= new Date())
    .map(l => {
      const days  = diffDays(l.endDate);
      const level = getAlertLevel(days);
      if (!level) return null;
      return { ...l, days, level, prop: properties.find(p => p.id === l.propertyId), tenant: tenants.find(t => t.id === l.tenantId) };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  const ok = leases.filter(l => l.status === "activo" && diffDays(l.endDate) > 90);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Sistema de alertas de vencimiento de contratos</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "15 días o menos", color: "bg-red-500",    desc: "Crítico — acción inmediata" },
          { label: "16 a 30 días",    color: "bg-orange-400", desc: "Urgente — contactar inquilino" },
          { label: "31 a 90 días",    color: "bg-amber-400",  desc: "Próximo — planificar renovación" },
        ].map(({ label, color, desc }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${color}`} />
            <div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Sin alertas activas</p>
            <p className="text-sm text-gray-400 mt-1">Todos los contratos están en regla</p>
          </div>
        )}
        {notifications.map(a => (
          <div key={a.id} className={`flex items-center gap-4 p-3.5 rounded-xl border ${a.level.bg} ${a.level.border}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.level.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{a.prop?.address}</p>
              <p className="text-xs text-gray-500">{a.tenant?.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-bold ${a.level.color}`}>{a.days === 0 ? "Hoy" : `${a.days}d`}</p>
              <p className={`text-xs ${a.level.color}`}>{a.level.label}</p>
            </div>
          </div>
        ))}
      </div>

      {ok.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-3">Contratos sin alertas ({ok.length})</p>
          <div className="space-y-2">
            {ok.map(l => {
              const prop   = properties.find(p => p.id === l.propertyId);
              const tenant = tenants.find(t => t.id === l.tenantId);
              return (
                <div key={l.id} className="bg-white rounded-xl border border-emerald-200 px-4 py-3 flex items-center gap-3">
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{prop?.address}</p>
                    <p className="text-xs text-gray-400">{tenant?.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">Vence {fmtDate(l.endDate)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",     label: "Dashboard",   icon: LayoutDashboard },
  { id: "properties",    label: "Propiedades", icon: Building2 },
  { id: "contacts",      label: "Contactos",   icon: Users },
  { id: "leases",        label: "Contratos",   icon: FileText },
  { id: "notifications", label: "Alertas",     icon: Bell },
];

function Sidebar({ active, setActive, alertCount, dark, onToggleDark }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">PropManager</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Gestión Inmobiliaria</p>
          </div>
          {/* ── TOGGLE DARK MODE ── */}
          <button
            onClick={onToggleDark}
            title={dark ? "Modo claro" : "Modo oscuro"}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all flex-shrink-0"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const badge    = id === "notifications" && alertCount > 0;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              <Icon size={16} className={isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"} />
              {label}
              {badge && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">A</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">Admin</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">admin@inmob.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("dashboard");
  const [dark, setDark] = useDarkMode();

  const { data: properties, setData: setProperties, loading: lProps,   error: eProps,   reload: reloadProps }   = useApi("/api/properties");
  const { data: owners,     setData: setOwners,     loading: lOwners,  error: eOwners,  reload: reloadOwners }  = useApi("/api/owners");
  const { data: tenants,    setData: setTenants,    loading: lTenants, error: eTenants, reload: reloadTenants } = useApi("/api/tenants");
  const { data: leases,     setData: setLeases,     loading: lLeases,  error: eLeases,  reload: reloadLeases }  = useApi("/api/leases");

  const loading = lProps || lOwners || lTenants || lLeases;
  const error   = eProps || eOwners || eTenants || eLeases;

  const alertCountRaw = useMemo(
    () => leases.filter(l => l.status === "activo" && getAlertLevel(diffDays(l.endDate))).length,
    [leases]
  );

  // Badge: solo se oculta cuando no hay alertas, o al entrar a la sección, pero si aparece una alerta nueva, se muestra inmediatamente
  const [badgeDismissed, setBadgeDismissed] = useState(false);

  // Si la cantidad de alertas aumenta, mostrar el badge inmediatamente
  const prevAlertCountRef = useRef(alertCountRaw);
  useEffect(() => {
    if (alertCountRaw > prevAlertCountRef.current) {
      setBadgeDismissed(false);
    }
    prevAlertCountRef.current = alertCountRaw;
  }, [alertCountRaw]);

  // Al entrar a "notifications" → ocultar badge
  const handleSetActive = (id) => {
    setActive(id);
    if (id === "notifications") {
      setBadgeDismissed(true);
    }
  };

  const alertCount = badgeDismissed ? 0 : alertCountRaw;
  const shared = { properties, setProperties, owners, setOwners, tenants, setTenants, leases, setLeases };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Cargando datos…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-sm w-full">
          <ErrorBox message={error} onRetry={() => { reloadProps(); reloadOwners(); reloadTenants(); reloadLeases(); }} />
          <p className="text-xs text-gray-400 text-center mt-4">
            Verificá que el servidor esté corriendo en <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{API}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/80 dark:bg-gray-950 font-sans">
      <Sidebar
        active={active}
        setActive={handleSetActive}
        alertCount={alertCount}
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 bg-white dark:bg-gray-900 rounded-2xl">
          {active === "dashboard"     && <Dashboard     {...shared} />}
          {active === "properties"    && <Properties    {...shared} />}
          {active === "contacts"      && <Contacts      {...shared} />}
          {active === "leases"        && <Leases        {...shared} />}
          {active === "notifications" && <Notifications {...shared} />}
        </div>
      </main>
    </div>
  );
}