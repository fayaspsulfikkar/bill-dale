"use client";

import { useState, useEffect, createContext, useContext } from "react";

/**
 * Provides a reactive version counter that bumps when currency format changes.
 * Page-level components call useCurrencyVersion() to subscribe and re-render.
 */
const CurrencyCtx = createContext(0);

export function useCurrencyVersion(): number {
  return useContext(CurrencyCtx);
}

export function CurrencyRefreshBoundary({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('currency-changed', handler);
    return () => window.removeEventListener('currency-changed', handler);
  }, []);

  return (
    <CurrencyCtx.Provider value={version}>
      {children}
    </CurrencyCtx.Provider>
  );
}
