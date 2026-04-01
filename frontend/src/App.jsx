import { useState, createContext } from "react";
import { Sidebar }       from "./components/layout/Sidebar";
import { Dashboard }     from "./pages/Dashboard";
import { Properties }    from "./pages/Properties";
import { Contacts }      from "./pages/Contacts";
import { Leases }        from "./pages/Leases";
import { Notifications } from "./pages/Notifications";
import { ErrorBox }      from "./components/ui/ErrorBox";
import { useApi }        from "./hooks/useApi";
import { useTheme }      from "./hooks/useTheme";
import { useAlerts }     from "./hooks/useAlerts";
import { useAuth }       from "./hooks/useAuth";
import Login             from "./pages/Login";

// AuthContext para acceso global a autenticación
export const AuthContext = createContext(null);

export default function App() {
  const [active,      setActiveRaw] = useState("dashboard");
  const [propFilter,  setPropFilter] = useState("todos");
  const [leaseFilter, setLeaseFilter] = useState("activo");
  const { dark, toggleDark } = useTheme();

  // ✅ useAuth siempre se llama primero — incluye loading mientras lee localStorage
  const auth = useAuth();

  // ✅ Todos los useApi siempre se llaman (regla de hooks: nunca después de un return condicional)
  // Cuando el usuario no está autenticado, useApi no va a hacer fetch igual
  // porque el token no existe, pero los hooks deben existir siempre.
  const { data: properties, setData: setProperties, loading: lProps,   error: eProps,   reload: reloadProps }   = useApi(auth.token ? "/api/properties" : null);
  const { data: owners,     setData: setOwners,     loading: lOwners,  error: eOwners,  reload: reloadOwners }  = useApi(auth.token ? "/api/owners"     : null);
  const { data: tenants,    setData: setTenants,    loading: lTenants, error: eTenants, reload: reloadTenants } = useApi(auth.token ? "/api/tenants"    : null);
  const { data: leases,     setData: setLeases,     loading: lLeases,  error: eLeases,  reload: reloadLeases }  = useApi(auth.token ? "/api/leases"     : null);

  const { badgeCount, dismiss, activeAlerts } = useAlerts(leases);

  // ✅ Esperar a que useAuth termine de leer localStorage antes de decidir qué mostrar
  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  // ✅ Si no hay sesión, mostrar login
  if (!auth.user) {
    return (
      <Login
        onLoginSuccess={() => {/* auth.user se actualiza solo vía useAuth */}}
        auth={auth}
      />
    );
  }

  const dataLoading = lProps || lOwners || lTenants || lLeases;
  const dataError   = eProps || eOwners || eTenants || eLeases;

  const handleSetActive = (target) => {
    if (typeof target === "string") {
      setActiveRaw(target);
    } else {
      const { page, filter } = target;
      setActiveRaw(page);
      if (page === "properties" && filter) setPropFilter(filter);
      if (page === "leases"     && filter) setLeaseFilter(filter);
    }
  };

  const handleLogout = () => {
    auth.logout();
  };

  const shared = { properties, setProperties, owners, setOwners, tenants, setTenants, leases, setLeases };

  if (dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Cargando datos…</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-sm w-full space-y-4">
          <ErrorBox
            message={dataError}
            onRetry={() => { reloadProps(); reloadOwners(); reloadTenants(); reloadLeases(); }}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Verificá que el servidor esté corriendo en{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
              {import.meta.env.VITE_API_URL || "http://localhost:3001"}
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <div className="flex min-h-screen bg-gray-50/80 dark:bg-gray-900 font-sans">
        <Sidebar
          active={active}
          setActive={handleSetActive}
          alertCount={badgeCount}
          dark={dark}
          toggleDark={toggleDark}
          user={auth.user}
          tenant={auth.tenant}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {active === "dashboard"     && <Dashboard     {...shared} setActive={handleSetActive} activeAlerts={activeAlerts} />}
            {active === "properties"    && <Properties    {...shared} initialFilter={propFilter} />}
            {active === "contacts"      && <Contacts      {...shared} />}
            {active === "leases"        && <Leases        {...shared} initialTab={leaseFilter} />}
            {active === "notifications" && <Notifications {...shared} activeAlerts={activeAlerts} dismiss={dismiss} setActive={handleSetActive} />}
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}