import { Bell, Building2, CheckCircle, DollarSign, FileText, Key } from "lucide-react";
import { StatCard } from "../components/ui/StatCard";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel } from "../utils/helpers";

export function Dashboard({ properties, leases, tenants }) {
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2}   label="Propiedades Totales"  value={properties.length} color="blue" trend={8} />
        <StatCard icon={CheckCircle} label="Propiedades Ocupadas" value={occupied}
          sub={properties.length ? `${Math.round(occupied / properties.length * 100)}% ocupación` : ""}
          color="green" />
        <StatCard icon={Key}         label="Vacantes"             value={vacant}   color="orange" />
        <StatCard icon={DollarSign}  label="Renta Mensual Total"  value={fmtCurrency(totalRent)} color="slate" trend={6} />
      </div>

      {/* Barra de ocupación */}
      {properties.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
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
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Alertas de Vencimiento</h3>
            <span className="ml-auto text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              {alerts.length} contratos
            </span>
          </div>
          <div className="space-y-3">
            {alerts.map(a => (
              <div key={a.id} className={`flex items-center gap-4 p-3.5 rounded-xl border ${a.level.bg} ${a.level.border}`}>
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
              </div>
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
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}