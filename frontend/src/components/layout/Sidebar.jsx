import { Building2, Users, FileText, Bell, LayoutDashboard, Sun, Moon } from "lucide-react";

const NAV = [
  { id: "dashboard",     label: "Dashboard",   icon: LayoutDashboard },
  { id: "properties",    label: "Propiedades", icon: Building2 },
  { id: "contacts",      label: "Contactos",   icon: Users },
  { id: "leases",        label: "Contratos",   icon: FileText },
  { id: "notifications", label: "Alertas",     icon: Bell },
];

export function Sidebar({ active, setActive, alertCount, dark, toggleDark }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">PropManager</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Gestión Inmobiliaria</p>
          </div>
        </div>
      </div>

      {/* Nav */}
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
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Icon size={16} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"} />
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

      {/* Footer: dark mode toggle + user */}
      <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
        {/* Toggle modo oscuro */}
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {dark
            ? <Sun size={16} className="text-amber-400" />
            : <Moon size={16} className="text-gray-400" />
          }
          {dark ? "Modo Claro" : "Modo Oscuro"}
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
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