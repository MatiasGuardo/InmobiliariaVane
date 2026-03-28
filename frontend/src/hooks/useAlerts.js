import { useState, useEffect, useCallback } from "react";
import { diffDays, getAlertLevel } from "../utils/helpers";

// Clave de storage
const STORAGE_KEY = "propmanager_dismissed_alerts";

// Lee el mapa de alertas descartadas del localStorage
// Formato: { [contractId]: "Crítico" | "Urgente" | "Próximo" }
function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDismissed(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useAlerts(leases) {
  const [dismissed, setDismissed] = useState(readDismissed);

  // Sincroniza con localStorage
  useEffect(() => {
    writeDismissed(dismissed);
  }, [dismissed]);

  // Descarta una alerta (por contrato + nivel actual)
  const dismiss = useCallback((contractId, levelLabel) => {
    setDismissed(prev => ({ ...prev, [contractId]: levelLabel }));
  }, []);

  // Calcula qué alertas están activas (no descartadas o cambiaron de nivel)
  const activeAlerts = leases
    .filter(l => l.status === "activo")
    .map(l => {
      const days  = diffDays(l.endDate);
      const level = getAlertLevel(days);
      if (!level) return null;
      const lastDismissedLabel = dismissed[l.id];
      // Si el nivel actual es distinto al que se descartó, vuelve a aparecer
      const isDismissed = lastDismissedLabel === level.label;
      return { contractId: l.id, level, days, isDismissed };
    })
    .filter(Boolean);

  // Solo las no descartadas cuentan para el badge
  const badgeCount = activeAlerts.filter(a => !a.isDismissed).length;

  return { dismissed, dismiss, badgeCount, activeAlerts };
}