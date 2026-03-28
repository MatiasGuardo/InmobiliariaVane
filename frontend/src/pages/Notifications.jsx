import { AlertTriangle, Calendar, CheckCircle, DollarSign } from "lucide-react";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel } from "../utils/helpers";

export function Notifications({ leases, properties, tenants }) {
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

  const ok = leases
    .filter(l => l.status === "activo" && diffDays(l.endDate) > 90)
    .sort((a, b) => diffDays(a.endDate) - diffDays(b.endDate));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de alertas de vencimiento de contratos</p>
      </div>

      {/* Leyenda */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "15 días o menos", color: "bg-red-500",    desc: "Crítico — acción inmediata" },
          { label: "16 a 30 días",    color: "bg-orange-400", desc: "Urgente — contactar inquilino" },
          { label: "31 a 90 días",    color: "bg-amber-400",  desc: "Próximo — planificar renovación" },
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
      {notifications.length === 0 && ok.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 text-center">
          <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Sin alertas activas</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Todos los contratos están en regla</p>
        </div>
      )}

      {/* Alertas */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 ${n.level.border} ${n.level.bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.level.bg} border ${n.level.border}`}>
                    <AlertTriangle size={16} className={n.level.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{n.prop?.address}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${n.level.bg} ${n.level.color} border ${n.level.border}`}>
                        {n.level.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Inquilino: {n.tenant?.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Calendar size={11} />Vence: {fmtDate(n.endDate)}</span>
                      <span className="flex items-center gap-1"><DollarSign size={11} />{fmtCurrency(n.rent)}/mes</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {n.days <= 0 ? (
                    <p className={`text-xl font-black ${n.level.color}`}>Venció</p>
                  ) : (
                    <>
                      <p className={`text-3xl font-black ${n.level.color}`}>{n.days}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">días restantes</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contratos al día */}
      {ok.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Contratos al día ({ok.length})</p>
          {ok.map(l => {
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