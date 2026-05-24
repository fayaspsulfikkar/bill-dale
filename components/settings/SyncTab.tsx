"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, RefreshCw, HardDrive, Clock } from "lucide-react";
import { useDataSync } from "@/hooks/useDataSync";
import { formatDistanceToNow } from "date-fns";
import db from "@/offline/db";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-primary" : "bg-muted"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function ChipSelect<T extends string | number>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            value === o.value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SyncTab() {
  const { isSyncing, lastSyncedAt, forceSync } = useDataSync();
  const { form, u } = useBusinessSettings();
  const [isOnline, setIsOnline] = useState(true);
  const [storageUsed, setStorageUsed] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const syncQueueCount = useLiveQuery(() => db.sync_queue.count(), []);

  useEffect(() => {
    setPendingCount(syncQueueCount || 0);
  }, [syncQueueCount]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
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
                  {lastSyncedAt && lastSyncedAt !== "undefined" && !isNaN(new Date(lastSyncedAt).getTime()) ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }) : "Never synced"}
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

      <div className="flex gap-3 pt-2 pb-4 border-b border-border/50">
        <Button onClick={forceSync} disabled={isSyncing || !isOnline} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing…" : "Force Sync Now"}
        </Button>
      </div>

      <div className="pt-2 space-y-6">
        <div>
          <Label className="text-sm font-semibold">Auto-Sync Frequency</Label>
          <p className="text-xs text-muted-foreground mb-2">How often should background data synchronize with the server?</p>
          <ChipSelect
            value={form.sync_auto_sync_interval ?? 5}
            options={[
              { label: "Real-time (1 min)", value: 1 },
              { label: "Fast (5 mins)", value: 5 },
              { label: "Normal (15 mins)", value: 15 },
              { label: "Slow (60 mins)", value: 60 },
              { label: "Manual Only", value: 0 }
            ]}
            onChange={(val) => u({ sync_auto_sync_interval: val as number })}
          />
        </div>

        <div>
          <Label className="text-sm font-semibold">Conflict Resolution Policy</Label>
          <p className="text-xs text-muted-foreground mb-2">What happens when an offline edit conflicts with cloud data?</p>
          <ChipSelect
            value={form.sync_conflict_resolution ?? 'server_wins'}
            options={[
              { label: "Server Wins (Safe)", value: 'server_wins' },
              { label: "Local Wins (Overwrite)", value: 'local_wins' },
              { label: "Manual Resolve (Prompt)", value: 'manual' }
            ]}
            onChange={(val) => u({ sync_conflict_resolution: val as any })}
          />
        </div>

        <div className="space-y-4">
          <ToggleRow
            label="Background Sync via Service Worker"
            desc="Enable silent syncs even when the POS tab is closed (requires PWA)."
            value={form.sync_background_sync_enabled ?? true}
            onChange={() => u({ sync_background_sync_enabled: !(form.sync_background_sync_enabled ?? true) })}
          />
        </div>

        <div>
          <Label className="text-sm font-semibold">Max Retry Attempts</Label>
          <p className="text-xs text-muted-foreground mb-2">How many times should failed sync requests be retried?</p>
          <ChipSelect
            value={form.sync_retry_attempts ?? 3}
            options={[
              { label: "1 Attempt", value: 1 },
              { label: "3 Attempts", value: 3 },
              { label: "5 Attempts", value: 5 },
              { label: "Infinite", value: 0 }
            ]}
            onChange={(val) => u({ sync_retry_attempts: val as number })}
          />
        </div>
      </div>
    </div>
  );
}
