import { useState } from "react";
import { Edit2, Mail, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { Modal }              from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/FormField";
import { fmtDate, API }      from "../utils/helpers";

export function Contacts({ owners, setOwners, tenants, setTenants, properties, leases }) {
  const [tab,     setTab]     = useState("owners");
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "owner" });
  const [formError, setFormError] = useState("");

  const list = (tab === "owners" ? owners : tenants).filter(person => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      person.name?.toLowerCase().includes(q) ||
      person.email?.toLowerCase().includes(q) ||
      person.phone?.toLowerCase().includes(q)
    );
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", role: tab === "owners" ? "owner" : "tenant" });
    setFormError("");
    setModal(true);
  };

  const openEdit = (person) => {
    setEditing(person.id);
    setForm({ name: person.name, email: person.email, phone: person.phone || "", role: tab === "owners" ? "owner" : "tenant" });
    setFormError("");
    setModal(true);
  };

  const validate = () => {
    const missing = [];
    if (!form.name)  missing.push("nombre");
    if (!form.email) missing.push("email");
    if (missing.length > 1) return `Faltan completar campos obligatorios: ${missing.join(", ")}.`;
    if (missing.length === 1) return `Falta completar un campo: ${missing[0]}.`;
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError("");
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
      setFormError("Error al guardar: " + e.message);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contactos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {owners.length} propietarios · {tenants.length} inquilinos
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 w-fit">
        <button onClick={() => { setTab("owners"); setSearch(""); }}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "owners" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
          Propietarios
        </button>
        <button onClick={() => { setTab("tenants"); setSearch(""); }}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "tenants" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
          Inquilinos
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Lista */}
      <div className="grid gap-3">
        {list.map(person => {
          const personProps = tab === "owners" ? properties.filter(p => p.ownerId === person.id) : [];
          const lease       = tab === "tenants" ? leases.find(l => l.id === person.leaseId) : null;
          return (
            <div key={person.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {person.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{person.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1"><Mail size={11} />{person.email}</span>
                    {person.phone && <span className="flex items-center gap-1"><Phone size={11} />{person.phone}</span>}
                  </div>
                  {tab === "owners" && personProps.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5">{personProps.length} propiedad(es)</p>
                  )}
                  {lease && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      Contrato activo · Vence {fmtDate(lease.endDate)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(person)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Edit2 size={13} className="text-gray-400" />
                  </button>
                  <button onClick={() => del(person.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 text-center">
            <Users size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? "Sin resultados para tu búsqueda" : "Sin contactos"}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Editar Contacto" : "Nuevo Contacto"}>
        <div className="space-y-4">
          <Field label="Rol">
            <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={!!editing}>
              <option value="owner">Propietario</option>
              <option value="tenant">Inquilino</option>
            </Select>
          </Field>
          <Field label="Nombre completo">
            <Input placeholder="Ej: Juan Pérez" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setFormError(""); }} />
          </Field>
          <Field label="Email">
            <Input type="email" placeholder="juan@email.com" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setFormError(""); }} />
          </Field>
          <Field label="Teléfono" hint="Opcional">
            <Input placeholder="+54 11 1234-5678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          {formError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
              {saving ? "Guardando…" : (editing ? "Actualizar" : "Crear Contacto")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}