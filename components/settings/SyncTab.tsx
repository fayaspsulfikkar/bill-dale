"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, RefreshCw, HardDrive, Clock } from "lucide-react";
import { useDataSync } from "@/hooks/useDataSync";
import { formatDistanceToNow } from "date-fns";
import db from "@/offline/db";

export default function SyncTab() {
  const { isSyncing, lastSyncedAt, forceSync } = useDataSync();
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [storageUsed, setStorageUsed] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const syncQueueCount = useLiveQuery(() => db.sync_queue.count(), []);

  useEffect(() => {
    setPendingCount(syncQueueCount || 0);
  }, [syncQueueCount]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        setStorageUsed(usage ? `${(usage / 1024 / 1024).toFixed(1)} MB` : null);
        setStorageQuota(quota ? `${(quota / 1024 / 1024 / 1024).toFixed(1)} GB` : null);
      });
    }
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Data & Sync</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Connection Status */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {isOnline ? <Cloud className="w-5 h-5 text-green-500" /> : <CloudOff className="w-5 h-5 text-red-500" />}
              <div>
                <p className="text-sm font-medium">{isOnline ? "Online" : "Offline"}</p>
                <p className="text-xs text-muted-foreground">{isOnline ? "Connected to Supabase" : "Using local data only"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Sync */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className={`w-5 h-5 ${pendingCount > 0 ? "text-amber-500" : "text-green-500"}`} />
              <div>
                <p className="text-sm font-medium">{pendingCount > 0 ? `${pendingCount} pending` : "All synced"}</p>
                <p className="text-xs text-muted-foreground">Items waiting to upload</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Synced */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }) : "Never synced"}
                </p>
                <p className="text-xs text-muted-foreground">Auto-syncs every 5 minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{storageUsed || "Unknown"} used</p>
                <p className="text-xs text-muted-foreground">{storageQuota ? `of ${storageQuota} available` : "Local storage"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={forceSync} disabled={isSyncing || !isOnline} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing…" : "Force Sync Now"}
        </Button>
      </div>
    </div>
  );
}
