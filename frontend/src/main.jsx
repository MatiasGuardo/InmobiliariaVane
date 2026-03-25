
// ===============================
// PUNTO DE ENTRADA DEL FRONTEND
// ===============================
// Este archivo monta la app React en el DOM.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Estilos globales
import App from './App.jsx' // Componente principal

// Monta el componente App dentro de StrictMode para mejores advertencias
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
