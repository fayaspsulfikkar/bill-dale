"use client";

import { useState, useEffect } from "react";

/**
 * Wrapper that forces re-render of all children when currency settings change.
 * Listens for the 'currency-changed' custom event dispatched by invalidateCurrencyCache().
 */
export function CurrencyRefreshBoundary({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('currency-changed', handler);
    return () => window.removeEventListener('currency-changed', handler);
  }, []);

  // The key change forces React to remount all children, picking up new formatCurrency values
  return <div key={version}>{children}</div>;
}
