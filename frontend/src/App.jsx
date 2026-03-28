// Componente principal de la aplicación

import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Properties from "./pages/Properties.jsx";
import Leases from "./pages/Leases.jsx";
import Contacts from "./pages/Contacts.jsx";

export default function App() {
  // Datos de ejemplo
  const [properties, setProperties] = useState([
    { id: 1, address: "Calle Falsa 123", status: "ocupado", type: "Departamento", price: 50000, ownerId: 1 },
    { id: 2, address: "Av. Siempre Viva 742", status: "vacante", type: "Casa", price: 80000, ownerId: 2 },
  ]);
  const [leases, setLeases] = useState([
    { id: 1, propertyId: 1, tenantId: 1, startDate: "2024-01-01", endDate: "2025-01-01", rent: 50000, status: "activo" },
  ]);
  const [tenants, setTenants] = useState([
    { id: 1, name: "Juan Pérez" },
  ]);
  const [owners, setOwners] = useState([
    { id: 1, name: "Ana Dueña" },
    { id: 2, name: "Carlos Propietario" },
  ]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard properties={properties} leases={leases} tenants={tenants} />} />
        <Route path="/propiedades" element={<Properties properties={properties} setProperties={setProperties} owners={owners} />} />
        <Route path="/contratos" element={<Leases leases={leases} setLeases={setLeases} properties={properties} tenants={tenants} />} />
        <Route path="/contactos" element={<Contacts owners={owners} setOwners={setOwners} tenants={tenants} setTenants={setTenants} properties={properties} leases={leases} />} />
      </Routes>
    </BrowserRouter>
  );
}
