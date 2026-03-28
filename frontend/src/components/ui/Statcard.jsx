// Componente de tarjeta de estadística genérica
import React from "react";

export function StatCard({ icon: Icon, label, value, color = "#2563eb" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      padding: 20,
      marginBottom: 16,
      minWidth: 220
    }}>
      {Icon && <Icon size={32} color={color} style={{ marginRight: 16 }} />}
      <div>
        <div style={{ fontSize: 14, color: "#888" }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}
