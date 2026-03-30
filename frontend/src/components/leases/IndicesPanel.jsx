// frontend/src/components/leases/IndicesPanel.jsx
import { useState, useEffect } from "react";
import { TrendingUp, ChevronRight, Database } from "lucide-react";
import { Field, Input, Select } from "../ui/FormField";
import { SyncIndicesButton } from "./ajusteSelector";
import { API } from "../../utils/helpers";

// ─── Estado actual de los índices en BD ──────────────────────
function IndicesStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/indices/debug/status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return null;
  if (!status || status.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {status.map((row) => (
        <div
          key={row.tipo}
          className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600"
        >
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            {row.tipo}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {row.total} registros
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Último: {String(row.ultimo).slice(0, 7)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Formulario de carga manual de un valor de índice ────────
function ManualIndexForm({ onSaved }) {
  const [tipo, setTipo] = useState("ICL");
  const [periodo, setPeriodo] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!periodo || !valor) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/indices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, periodo, valor: parseFloat(valor) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus({
        ok: true,
        msg: `✓ ${tipo} ${periodo.slice(0, 7)} = ${valor} guardado`,
      });
      setValor("");
      onSaved?.();
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Carga manual de valor
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="ICL">ICL</option>
            <option value="IPC">IPC</option>
          </Select>
        </Field>
        <Field label="Período">
          <Input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </Field>
        <Field label="Valor">
          <Input
            type="number"
            step="0.01"
            placeholder="1234.56"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </Field>
      </div>
      <button
        onClick={save}
        disabled={saving || !periodo || !valor}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Guardando…" : "Guardar valor manual"}
      </button>
      {status && (
        <p
          className={`text-xs ${
            status.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {status.msg}
        </p>
      )}
    </div>
  );
}

// ─── Panel colapsable de gestión de índices ───────────────────
export function IndicesPanel() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => setRefreshKey((k) => k + 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <TrendingUp size={15} className="text-teal-500" />
          Gestión de índices ICL / IPC
        </span>
        <ChevronRight
          size={15}
          className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Los índices se sincronizan automáticamente todos los días a las
            08:00 hs. Podés forzar la sincronización manual ahora.
          </p>

          {/* Estado actual */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Database size={12} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Datos en base de datos
              </p>
            </div>
            <IndicesStatus key={refreshKey} />
          </div>

          <SyncIndicesButton onSuccess={handleSuccess} />

          <div className="h-px bg-gray-100 dark:bg-gray-700" />
          <ManualIndexForm onSaved={handleSuccess} />
        </div>
      )}
    </div>
  );
}