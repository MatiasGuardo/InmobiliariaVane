// ─── FORMATO DE FECHAS Y MONEDA ──────────────────────────────

export const fmtDate = d =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

export const diffDays = d => Math.ceil((new Date(d) - new Date()) / 86400000);

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

// ─── VALIDACIÓN DE FECHA ─────────────────────────────────────
// Verifica que una fecha string "YYYY-MM-DD" sea realmente válida
// (evita fechas como 30/02 que los inputs de tipo date normalizan o rechazan)
export const isValidDate = (str) => {
  if (!str) return false;
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth()    === m - 1 &&
    dt.getDate()     === d
  );
};

// ─── NIVELES DE ALERTA ────────────────────────────────────────

export const getAlertLevel = (days) => {
  if (days <= 15) return { label: "Crítico",  color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",       dot: "bg-red-500",    border: "border-red-200 dark:border-red-800"    };
  if (days <= 30) return { label: "Urgente",  color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", dot: "bg-orange-500", border: "border-orange-200 dark:border-orange-800" };
  if (days <= 90) return { label: "Próximo",  color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20",   dot: "bg-amber-400",  border: "border-amber-200 dark:border-amber-800"  };
  return null;
};

// ─── URL BASE DE LA API ───────────────────────────────────────

export const API = import.meta.env.VITE_API_URL || "http://localhost:3001";