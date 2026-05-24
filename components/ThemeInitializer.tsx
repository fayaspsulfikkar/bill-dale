"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

// Applies the persisted theme class on mount to avoid flash
export default function ThemeInitializer() {
  const { theme, accent } = useThemeStore();

  useEffect(() => {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.remove('theme-blue', 'theme-zinc', 'theme-rose', 'theme-green', 'theme-orange');
    if (accent) {
      root.classList.add(`theme-${accent}`);
    }
  }, [theme, accent]);

  return null;
}
