import { useState } from "react";
import { AlertTriangle, Calendar, CheckCircle, DollarSign, Search, X, Phone, Mail, MapPin, Percent } from "lucide-react";
import { fmtDate, fmtCurrency, fmtDuration, diffDays, getAlertLevel } from "../utils/helpers";

// ─── Modal de detalle de alerta ───────────────────────────────
function AlertDetailModal({ alert, onClose }) {
  if (!alert) return null;

  const { level, prop, tenant, days } = alert;

  const levelColors = {
    "Crítico": {
      header:  "bg-red-500",
      badge:   "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
      ring:    "ring-red-200 dark:ring-red-800",
      icon:    "text-red-500",
      daysBg:  "bg-red-50 dark:bg-red-900/20",
      daysText:"text-red-600 dark:text-red-400",
    },
    "Urgente": {
      header:  "bg-orange-400",
      badge:   "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
      ring:    "ring-orange-200 dark:ring-orange-800",
      icon:    "text-orange-500",
      daysBg:  "bg-orange-50 dark:bg-orange-900/20",
      daysText:"text-orange-600 dark:text-orange-400",
    },
    "Próximo": {
      header:  "bg-amber-400",
      badge:   "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      ring:    "ring-amber-200 dark:ring-amber-800",
      icon:    "text-amber-500",
      daysBg:  "bg-amber-50 dark:bg-amber-900/20",
      daysText:"text-amber-600 dark:text-amber-400",
    },
  };

  const c = levelColors[level.label] || levelColors["Próximo"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md ring-1 ${c.ring} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header de color según nivel */}
        <div className={`${c.header} px-6 py-5`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={18} className="text-white" />
                <span className="text-white font-bold text-base">{level.label}</span>
              </div>
              <p className="text-white/90 text-sm font-medium truncate max-w-xs">{prop?.address}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Días restantes destacados */}
          <div className="mt-4 flex items-end gap-1">
            {days <= 0 ? (
              <p className="text-3xl font-black text-white">Venció</p>
            ) : (
              <>
                <p className="text-4xl font-black text-white leading-none">{days}</p>
                <p className="text-white/80 text-sm mb-1">días restantes</p>
              </>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">

          {/* Propiedad */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={11} /> Propiedad
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{prop?.address}</p>
            {prop?.type && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{prop.type}</p>
            )}
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Inquilino */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Inquilino</p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{tenant?.name}</p>
            <div className="flex flex-col gap-1.5">
              {tenant?.email && (
                <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Mail size={11} className="text-gray-400 flex-shrink-0" />{tenant.email}
                </span>
              )}
              {tenant?.phone && (
                <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Phone size={11} className="text-gray-400 flex-shrink-0" />{tenant.phone}
                </span>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Fechas y renta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={10} /> Inicio
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(alert.startDate)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={10} /> Vencimiento
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(alert.endDate)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <DollarSign size={10} /> Renta mensual
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtCurrency(alert.rent)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <Percent size={10} /> Ajuste
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">+{alert.increase}% {alert.period || "anual"}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────
export function Notifications({ leases, properties, tenants, activeAlerts, dismiss }) {
  const [search,       setSearch]       = useState("");
  const [openAlert,    setOpenAlert]    = useState(null); // alerta actualmente abierta en modal

  // Construye la lista completa de alertas
  const allAlerts = leases
    .filter(l => l.status === "activo")
    .map(l => {
      const days        = diffDays(l.endDate);
      const level       = getAlertLevel(days);
      if (!level) return null;
      const prop        = properties.find(p => p.id === l.propertyId);
      const tenant      = tenants.find(t => t.id === l.tenantId);
      const activeInfo  = activeAlerts?.find(a => a.contractId === l.id);
      const isDismissed = activeInfo?.isDismissed ?? false;
      return { ...l, days, level, prop, tenant, isDismissed };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  // Solo mostramos las no descartadas
  const pendientes = allAlerts.filter(a => !a.isDismissed);

  // Contratos sin alerta (más de 90 días)
  const ok = leases
    .filter(l => l.status === "activo" && diffDays(l.endDate) > 90)
    .sort((a, b) => diffDays(a.endDate) - diffDays(b.endDate));

  const filterFn = (a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.prop?.address?.toLowerCase().includes(q) ||
      a.tenant?.name?.toLowerCase().includes(q)
    );
  };

  const filteredPendientes = pendientes.filter(filterFn);
  const filteredOk         = ok.filter(l => {
    if (!search) return true;
    const q      = search.toLowerCase();
    const prop   = properties.find(p => p.id === l.propertyId);
    const tenant = tenants.find(t => t.id === l.tenantId);
    return prop?.address?.toLowerCase().includes(q) || tenant?.name?.toLowerCase().includes(q);
  });

  // Abrir modal y descartar la alerta
  const handleOpen = (alert) => {
    setOpenAlert(alert);
    dismiss(alert.id, alert.level.label);
  };

  const handleClose = () => setOpenAlert(null);

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
          { label: "15 días o menos", color: "bg-red-500",    desc: "Crítico — tocá para ver detalles" },
          { label: "16 a 30 días",    color: "bg-orange-400", desc: "Urgente — tocá para ver detalles" },
          { label: "31 a 90 días",    color: "bg-amber-400",  desc: "Próximo — tocá para ver detalles" },
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

      {/* Sin alertas ni contratos */}
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
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Alertas</h2>
            <span className="text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              {filteredPendientes.length}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500 ml-1">— tocá para ver detalles</p>
          </div>
          <div className="space-y-3">
            {filteredPendientes.map(a => (
              <button
                key={a.id}
                onClick={() => handleOpen(a)}
                className={`w-full text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${a.level.bg} ${a.level.border}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${a.level.bg} ${a.level.border}`}>
                    <AlertTriangle size={16} className={a.level.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{a.prop?.address}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${a.level.bg} ${a.level.color} ${a.level.border}`}>
                        {a.level.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{a.tenant?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.days <= 0 ? (
                      <p className={`text-xl font-black ${a.level.color}`}>Venció</p>
                    ) : (
                      <>
                        <p className={`text-2xl font-black ${a.level.color}`}>{a.days}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">días</p>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sin alertas pendientes pero hay contratos */}
      {filteredPendientes.length === 0 && allAlerts.length > 0 && !search && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-10 text-center">
          <CheckCircle size={30} className="text-emerald-400 mx-auto mb-2" />
          <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">Todas las alertas revisadas</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Reaparecerán cuando cambien de estado</p>
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
              <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{prop?.address}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tenant?.name}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />Vence {fmtDate(l.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={11} />{fmtCurrency(l.rent)}/mes
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmtDuration(days)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">restantes</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalle */}
      <AlertDetailModal alert={openAlert} onClose={handleClose} />
    </div>
  );
}