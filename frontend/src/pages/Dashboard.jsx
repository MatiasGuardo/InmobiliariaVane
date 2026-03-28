import { Bell, Building2, CheckCircle, DollarSign, FileText, Key } from "lucide-react";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel } from "../utils/helpers";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

// ─── StatCard interactivo ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "blue", trend, onClick }) {
  const colors = {
    blue:   { bg: "bg-blue-50 dark:bg-blue-900/30",       icon: "text-blue-600 dark:text-blue-400",     ring: "hover:ring-blue-300 dark:hover:ring-blue-700" },
    green:  { bg: "bg-emerald-50 dark:bg-emerald-900/30", icon: "text-emerald-600 dark:text-emerald-400", ring: "hover:ring-emerald-300 dark:hover:ring-emerald-700" },
    orange: { bg: "bg-orange-50 dark:bg-orange-900/30",   icon: "text-orange-600 dark:text-orange-400", ring: "hover:ring-orange-300 dark:hover:ring-orange-700" },
    slate:  { bg: "bg-slate-50 dark:bg-slate-700",        icon: "text-slate-600 dark:text-slate-300",   ring: "hover:ring-slate-300 dark:hover:ring-slate-600" },
  };
  const c = colors[color] || colors.blue;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 transition-all duration-200 hover:shadow-md hover:ring-2 ${c.ring} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon size={18} className={c.icon} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// setActive ahora acepta un objeto { page, filter } además de un string simple
export function Dashboard({ properties, leases, tenants, setActive, activeAlerts }) {
  const occupied  = properties.filter(p => p.status === "ocupado").length;
  const vacant    = properties.filter(p => p.status === "vacante").length;
  const totalRent = leases.filter(l => l.status === "activo").reduce((s, l) => s + l.rent, 0);

  // Alertas para mostrar en el widget del dashboard (solo no descartadas)
  const dashAlerts = leases
    .filter(l => l.status === "activo")
    .map(l => {
      const days  = diffDays(l.endDate);
      const level = getAlertLevel(days);
      if (!level) return null;
      const active = activeAlerts?.find(a => a.contractId === l.id);
      if (active?.isDismissed) return null;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2} label="Propiedades Totales" value={properties.length}
          color="blue" trend={8}
          onClick={() => setActive({ page: "properties", filter: "todos" })}
        />
        <StatCard
          icon={CheckCircle} label="Propiedades Ocupadas" value={occupied}
          sub={properties.length ? `${Math.round(occupied / properties.length * 100)}% ocupación` : ""}
          color="green"
          onClick={() => setActive({ page: "properties", filter: "ocupado" })}
        />
        <StatCard
          icon={Key} label="Vacantes" value={vacant}
          color="orange"
          onClick={() => setActive({ page: "properties", filter: "vacante" })}
        />
        <StatCard
          icon={DollarSign} label="Renta Mensual Total" value={fmtCurrency(totalRent)}
          color="slate" trend={6}
          onClick={() => setActive({ page: "leases", filter: "activo" })}
        />
      </div>

      {/* Barra de ocupación */}
      {properties.length > 0 && (
        <button
          onClick={() => setActive({ page: "properties", filter: "todos" })}
          className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tasa de Ocupación</h3>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(occupied / properties.length * 100)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
              style={{ width: `${(occupied / properties.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{occupied} ocupadas</span>
            <span>{vacant} vacantes</span>
          </div>
        </button>
      )}

      {/* Alertas */}
      {dashAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Alertas de Vencimiento</h3>
            <span className="ml-auto text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              {dashAlerts.length} contratos
            </span>
          </div>
          <div className="space-y-3">
            {dashAlerts.map(a => (
              <button
                key={a.id}
                onClick={() => setActive({ page: "notifications" })}
                className={`w-full text-left flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:opacity-80 ${a.level.bg} ${a.level.border}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.level.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{a.prop?.address}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.tenant?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${a.level.color}`}>
                    {a.days <= 0 ? "Venció" : fmtDuration(a.days)}
                  </p>
                  <p className={`text-xs ${a.level.color}`}>{a.level.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contratos recientes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Contratos Activos Recientes</h3>
        {recentLeases.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Sin contratos activos</p>
        ) : (
          <div className="space-y-2">
            {recentLeases.map(l => {
              const prop   = properties.find(p => p.id === l.propertyId);
              const tenant = tenants.find(t => t.id === l.tenantId);
              const days   = diffDays(l.endDate);
              const alert  = getAlertLevel(days);
              return (
                <button
                  key={l.id}
                  onClick={() => setActive({ page: "leases", filter: "activo" })}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{prop?.address}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{tenant?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fmtCurrency(l.rent)}</p>
                    {alert
                      ? <p className={`text-xs ${alert.color}`}>{fmtDuration(days)} restantes</p>
                      : <p className="text-xs text-gray-400 dark:text-gray-500">Vence {fmtDate(l.endDate)}</p>
                    }
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
