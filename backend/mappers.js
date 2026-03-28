// ─── MAPPERS: transforman filas de la BD al formato del frontend ─────────────

export function mapOwner(row) {
  return {
    id:         String(row.id),
    name:       `${row.nombre} ${row.apellido}`,
    email:      row.email,
    phone:      row.telefono || "",
    properties: row.properties ? row.properties.split(",").map(String) : [],
  };
}

export function mapTenant(row) {
  return {
    id:      String(row.id),
    name:    `${row.nombre} ${row.apellido}`,
    email:   row.email,
    phone:   row.telefono || "",
    leaseId: row.leaseId ? String(row.leaseId) : null,
  };
}

export function mapProperty(row) {
  return {
    id:      String(row.id),
    address: `${row.direccion}${row.numero ? ", " + row.numero : ""}`,
    type:    mapTipo(row.tipo),
    price:   Number(row.precio_lista),
    status:  row.estado === "alquilada" ? "ocupado" : "vacante",
    ownerId: String(row.id_propietario),
    leaseId: row.leaseId ? String(row.leaseId) : null,
  };
}

// Parsea el campo indice_ajuste de la BD y devuelve { increase, period }
// Formato guardado: "10% trimestral" | "5% semestral" | "6% anual"
function parseIndiceAjuste(indice) {
  if (!indice) return { increase: 6, period: "anual" };
  const match = String(indice).match(/^([\d.]+)%?\s*(trimestral|semestral|anual)?/i);
  if (!match) return { increase: 6, period: "anual" };
  return {
    increase: Number(match[1]) || 6,
    period:   (match[2] || "anual").toLowerCase(),
  };
}

export function mapLease(row) {
  const { increase, period } = parseIndiceAjuste(row.indice_ajuste);
  return {
    id:         String(row.id),
    propertyId: String(row.propiedad_id),
    tenantId:   String(row.inquilino_id),
    startDate:  row.fecha_inicio instanceof Date
                  ? row.fecha_inicio.toISOString().split("T")[0]
                  : String(row.fecha_inicio),
    endDate:    row.fecha_fin instanceof Date
                  ? row.fecha_fin.toISOString().split("T")[0]
                  : String(row.fecha_fin),
    rent:       Number(row.monto_renta),
    increase,
    period,
    status:     row.estado_contrato === "activo" ? "activo" : row.estado_contrato,
  };
}

// Traduce tipo del frontend al ENUM de la BD
export function mapTipoDB(tipo) {
  const m = {
    "Departamento":    "departamento",
    "Local Comercial": "local_comercial",
    "Casa":            "casa",
    "Oficina":         "oficina",
    "Galpón":          "galpon",
    "Terreno":         "terreno",
  };
  return m[tipo] || "otro";
}

// Traduce tipo de la BD al formato del frontend
export function mapTipo(tipo) {
  const m = {
    departamento:    "Departamento",
    local_comercial: "Local Comercial",
    casa:            "Casa",
    oficina:         "Oficina",
    galpon:          "Galpón",
    terreno:         "Terreno",
    otro:            "Otro",
  };
  return m[tipo] || tipo;
}

// Descompone un nombre completo en nombre + apellido
export function splitName(fullName) {
  const parts    = fullName.trim().split(" ");
  const apellido = parts.length > 1 ? parts.at(-1) : "";
  const nombre   = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  return { nombre, apellido };
}
