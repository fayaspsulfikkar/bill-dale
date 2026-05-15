"use client";

import { useEffect } from "react";
import { usePOSStore } from "@/store/posStore";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function OnlineStatusBar() {
  const { isOnline, setIsOnline, pendingSyncCount } = usePOSStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold print:hidden ${isOnline && pendingSyncCount > 0 ? "bg-blue-500/10 text-blue-600 border-b border-blue-500/20" : "bg-destructive/10 text-destructive border-b border-destructive/20"}`}>
      {isOnline ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{pendingSyncCount} transaction{pendingSyncCount !== 1 ? "s" : ""} pending sync</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline — bills will sync when connection returns</span>
        </>
      )}
    </div>
  );
}
