
// ===============================
// CONFIGURACIÓN DE VITE
// ===============================
// Este archivo configura el bundler Vite para el frontend React.
// Se agregan plugins para React y TailwindCSS.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Exporta la configuración principal de Vite
export default defineConfig({
  plugins: [
    react(),      // Plugin para soporte de React (JSX, Fast Refresh)
    tailwindcss(), // Plugin para procesar clases de TailwindCSS
  ],
})