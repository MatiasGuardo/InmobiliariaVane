import { useState, useEffect } from "react";

export function useTheme() {
  // Invertimos la lógica: ahora 'dark' es true cuando el usuario quiere modo claro
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches === false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return { dark, toggleDark: () => setDark(d => !d) };
}