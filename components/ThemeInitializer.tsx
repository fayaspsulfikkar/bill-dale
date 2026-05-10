"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

// Applies the persisted theme class on mount to avoid flash
export default function ThemeInitializer() {
  const { theme } = useThemeStore();

  useEffect(() => {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  return null;
}
