// ─── FORMATO DE FECHAS Y MONEDA ──────────────────────────────

export const fmtDate = d =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

// Usa new Date() fresco cada vez para que los días sean siempre correctos
export const diffDays = d => Math.ceil((new Date(d) - new Date()) / 86400000);

// Muestra meses si > 90 días, días si ≤ 90, "Venció" si ya pasó
export const fmtDuration = (days) => {
  if (days <= 0) return "Venció";
  if (days > 90) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }
  return `${days} días`;
};

export const fmtCurrency = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

// ─── NIVELES DE ALERTA ────────────────────────────────────────

export const getAlertLevel = (days) => {
  if (days <= 15) return { label: "Crítico",  color: "text-red-600",    bg: "bg-red-50",    dot: "bg-red-500",    border: "border-red-200" };
  if (days <= 30) return { label: "Urgente",  color: "text-orange-600", bg: "bg-orange-50", dot: "bg-orange-500", border: "border-orange-200" };
  if (days <= 90) return { label: "Próximo",  color: "text-amber-600",  bg: "bg-amber-50",  dot: "bg-amber-400",  border: "border-amber-200" };
  return null;
};

// ─── URL BASE DE LA API ───────────────────────────────────────

export const API = import.meta.env.VITE_API_URL || "http://localhost:3001";