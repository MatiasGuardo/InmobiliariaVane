import { useMemo } from "react";
import { useApi } from "./hooks/useApi";
import { useTheme } from "./hooks/useTheme";
import { Sidebar } from "./components/layout/Sidebar";
import { ErrorBox } from "./components/ui/ErrorBox";
import { Dashboard } from "./pages/Dashboard";
import { Properties } from "./pages/Properties";
import { Contacts } from "./pages/Contacts";
import { Leases } from "./pages/Leases";
import { Notifications } from "./pages/Notifications";
import { diffDays, getAlertLevel } from "./utils/helpers";
import { useState } from "react";

export default function App() {
  const [active, setActive] = useState("dashboard");
  const { dark, toggleDark } = useTheme();

  const { data: properties, setData: setProperties, loading: lProps,   error: eProps,   reload: reloadProps }  = useApi("/api/properties");
  const { data: owners,     setData: setOwners,     loading: lOwners,  error: eOwners,  reload: reloadOwners } = useApi("/api/owners");
  const { data: tenants,    setData: setTenants,    loading: lTenants, error: eTenants, reload: reloadTenants }= useApi("/api/tenants");
  const { data: leases,     setData: setLeases,     loading: lLeases,  error: eLeases,  reload: reloadLeases } = useApi("/api/leases");

  const loading = lProps || lOwners || lTenants || lLeases;
  const error   = eProps || eOwners || eTenants || eLeases;

  const alertCount = useMemo(
    () => leases.filter(l => l.status === "activo" && getAlertLevel(diffDays(l.endDate))).length,
    [leases]
  );

  const shared = { properties, setProperties, owners, setOwners, tenants, setTenants, leases, setLeases };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Cargando datos…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-sm w-full">
          <ErrorBox
            message={error}
            onRetry={() => { reloadProps(); reloadOwners(); reloadTenants(); reloadLeases(); }}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
            Verificá que el servidor esté corriendo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/80 dark:bg-gray-900 font-sans">
      <Sidebar
        active={active}
        setActive={setActive}
        alertCount={alertCount}
        dark={dark}
        toggleDark={toggleDark}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {active === "dashboard"     && <Dashboard     {...shared} />}
          {active === "properties"    && <Properties    {...shared} />}
          {active === "contacts"      && <Contacts      {...shared} />}
          {active === "leases"        && <Leases        {...shared} />}
          {active === "notifications" && <Notifications {...shared} />}
        </div>
      </main>
    </div>
  );
}