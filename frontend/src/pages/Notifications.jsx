import { useState } from "react";
import { AlertTriangle, Calendar, CheckCircle, DollarSign, Search, X, ChevronDown } from "lucide-react";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel } from "../utils/helpers";

export function Notifications({ leases, properties, tenants, activeAlerts, dismiss }) {
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null); // contractId expandido actualmente

  // Construye la lista completa de alertas con metadata
  const allAlerts = leases
    .filter(l => l.status === "activo")
    .map(l => {
      const days  = diffDays(l.endDate);
      const level = getAlertLevel(days);
      if (!level) return null;
      const prop   = properties.find(p => p.id === l.propertyId);
      const tenant = tenants.find(t => t.id === l.tenantId);
      const activeInfo   = activeAlerts?.find(a => a.contractId === l.id);
      const isDismissed  = activeInfo?.isDismissed ?? false;
      return { ...l, days, level, prop, tenant, isDismissed };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  // Pendientes (no descartadas) y ya vistas
  const pendientes = allAlerts.filter(a => !a.isDismissed);
  const vistas     = allAlerts.filter(a => a.isDismissed);

  // Contratos sin alerta (más de 90 días)
  const ok = leases
    .filter(l => l.status === "activo" && diffDays(l.endDate) > 90)
    .sort((a, b) => diffDays(a.endDate) - diffDays(b.endDate));

  // Filtro de búsqueda (busca en dirección o inquilino)
  const filterFn = (a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.prop?.address?.toLowerCase().includes(q) ||
      a.tenant?.name?.toLowerCase().includes(q)
    );
  };

  const filteredPendientes = pendientes.filter(filterFn);
  const filteredVistas     = vistas.filter(filterFn);
  const filteredOk         = ok.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    const prop   = properties.find(p => p.id === l.propertyId);
    const tenant = tenants.find(t => t.id === l.tenantId);
    return prop?.address?.toLowerCase().includes(q) || tenant?.name?.toLowerCase().includes(q);
  });

  // Al expandir una alerta la descartamos
  const handleExpand = (contractId, levelLabel) => {
    if (expanded === contractId) {
      setExpanded(null);
    } else {
      setExpanded(contractId);
      dismiss(contractId, levelLabel);
    }
  };

  const AlertCard = ({ a }) => {
    const isOpen = expanded === a.id;
    const prop   = a.prop;
    const tenant = a.tenant;

    return (
      <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${a.level.border} ${a.level.bg}`}>
        {/* Cabecera — siempre visible, clickeable */}
        <button
          onClick={() => handleExpand(a.id, a.level.label)}
          className="w-full flex items-start gap-4 p-5 text-left hover:opacity-90 transition-opacity"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${a.level.bg} ${a.level.border}`}>
            <AlertTriangle size={16} className={a.level.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{prop?.address}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${a.level.bg} ${a.level.color} ${a.level.border}`}>
                {a.level.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tenant?.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              {a.days <= 0 ? (
                <p className={`text-xl font-black ${a.level.color}`}>Venció</p>
              ) : (
                <>
                  <p className={`text-2xl font-black ${a.level.color}`}>{a.days}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">días</p>
                </>
              )}
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {/* Detalle expandible */}
        {isOpen && (
          <div className="px-5 pb-5 border-t border-current/10 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 dark:bg-gray-900/30 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Propiedad</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{prop?.address}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{prop?.type}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-900/30 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inquilino</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tenant?.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tenant?.email}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-900/30 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Calendar size={10} />Fechas</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmtDate(a.startDate)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">→ {fmtDate(a.endDate)}</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-900/30 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><DollarSign size={10} />Renta</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtCurrency(a.rent)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">por mes</p>
              </div>
            </div>
            {tenant?.phone && (
              <div className="bg-white/60 dark:bg-gray-900/30 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contacto</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{tenant.phone}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de alertas de vencimiento de contratos</p>
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

      {/* Leyenda */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "15 días o menos", color: "bg-red-500",    desc: "Crítico — toca para ver detalles" },
          { label: "16 a 30 días",    color: "bg-orange-400", desc: "Urgente — toca para ver detalles" },
          { label: "31 a 90 días",    color: "bg-amber-400",  desc: "Próximo — toca para ver detalles" },
        ].map(({ label, color, desc }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${color}`} />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sin nada */}
      {allAlerts.length === 0 && ok.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 text-center">
          <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Sin alertas activas</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Todos los contratos están en regla</p>
        </div>
      )}

      {/* Alertas pendientes */}
      {filteredPendientes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Alertas pendientes</h2>
            <span className="text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              {filteredPendientes.length}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500 ml-1">— tocá una alerta para ver detalles y descartarla</p>
          </div>
          {filteredPendientes.map(a => <AlertCard key={a.id} a={a} />)}
        </div>
      )}

      {/* Alertas ya vistas (descartadas) */}
      {filteredVistas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Vistas
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({filteredVistas.length}) — reaparecerán cuando cambien de estado</span>
          </h2>
          {filteredVistas.map(a => (
            <div key={a.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center gap-4 opacity-60">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.level.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{a.prop?.address}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{a.tenant?.name} · {a.level.label}</p>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">
                {a.days <= 0 ? "Venció" : `${a.days}d`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Contratos al día */}
      {filteredOk.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Contratos al día ({filteredOk.length})</p>
          {filteredOk.map(l => {
            const prop   = properties.find(p => p.id === l.propertyId);
            const tenant = tenants.find(t => t.id === l.tenantId);
            const days   = diffDays(l.endDate);
            return (
              <div key={l.id} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
                      <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{prop?.address}</p>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                          Al día
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Inquilino: {tenant?.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={11} />Vence: {fmtDate(l.endDate)}</span>
                        <span className="flex items-center gap-1"><DollarSign size={11} />{fmtCurrency(l.rent)}/mes</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmtDuration(days)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">restantes</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}