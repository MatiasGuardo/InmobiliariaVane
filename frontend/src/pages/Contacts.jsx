import { useState } from "react";
import { Mail, Phone, Plus, Trash2, Users } from "lucide-react";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/FormField";
import { fmtDate, API } from "../utils/helpers";

export function Contacts({ owners, setOwners, tenants, setTenants, properties, leases }) {
  const [tab,    setTab]    = useState("owners");
  const [modal,  setModal]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "owner" });

  const list = tab === "owners" ? owners : tenants;

  const save = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    const endpoint = form.role === "owner" ? "/api/owners" : "/api/tenants";
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      if (form.role === "owner") setOwners(prev => [...prev, saved]);
      else                       setTenants(prev => [...prev, saved]);
      setModal(false);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este contacto? Esta acción no se puede deshacer.")) return;
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
        <button
          onClick={() => { setForm({ name: "", email: "", phone: "", role: tab === "owners" ? "owner" : "tenant" }); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
        >
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("owners")}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "owners" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
          Propietarios
        </button>
        <button onClick={() => setTab("tenants")}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === "tenants" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
          Inquilinos
        </button>
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
                <button onClick={() => del(person.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 text-center">
            <Users size={36} className="text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">Sin contactos</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Contacto">
        <div className="space-y-4">
          <Field label="Rol">
            <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="owner">Propietario</option>
              <option value="tenant">Inquilino</option>
            </Select>
          </Field>
          <Field label="Nombre completo">
            <Input placeholder="Ej: Juan Pérez" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </Field>
          <Field label="Email">
            <Input type="email" placeholder="juan@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </Field>
          <Field label="Teléfono" hint="Opcional">
            <Input placeholder="+54 11 1234-5678" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? "Guardando…" : "Crear Contacto"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}