"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store, Shield, ChevronRight, Eye, EyeOff, Receipt, Database,
  Settings2, Cloud, CloudOff, RefreshCw, Trash2, HardDrive, Clock,
  Upload, FileText, Loader2, Check, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import db from "@/offline/db";
import { motion, AnimatePresence } from "framer-motion";
import { useDataSync } from "@/hooks/useDataSync";
import { formatDistanceToNow } from "date-fns";

type SettingsTab = "general" | "security" | "receipts" | "sync";

const TABS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { id: "general", label: "General", icon: Store },
  { id: "security", label: "Security", icon: Shield },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "sync", label: "Data & Sync", icon: Database },
];

export default function SettingsPage() {
  const router = useRouter();
  const { businessId, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your POS system preferences.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-52 shrink-0 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                  active
                    ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-[3px] border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "receipts" && <ReceiptsTab />}
              {activeTab === "sync" && <SyncTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── GENERAL TAB ─── */
function GeneralTab() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">General</h2>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => router.push("/dashboard/settings/business")}
        className="text-left w-full"
      >
        <Card className="bg-card/50 border-border/50 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Business Profile
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              Update shop name, GST, bank details, address, and invoice prefix.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.button>
    </div>
  );
}

/* ─── SECURITY TAB ─── */
function SecurityTab() {
  const { businessId } = useAuthStore();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const business = useLiveQuery(
    () => businessId ? db.businesses.get(businessId) : undefined,
    [businessId]
  );
  const hasPin = !!business?.admin_pin;

  // Keep input focused
  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 50);

  useEffect(() => { focusInput(); }, [step]);

  const savePin = async (value: string) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await db.businesses.update(businessId, { admin_pin: value } as never);
      if (supabase) {
        await supabase.from("businesses").update({ admin_pin: value }).eq("id", businessId);
      }
      setSaved(true);
      setPin("");
      setConfirmPin("");
      setStep("enter");
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleInput = (value: string) => {
    // Only keep digits, max 4
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setError("");

    if (step === "enter") {
      setPin(digits);
      if (digits.length === 4) {
        setStep("confirm");
        setConfirmPin("");
      }
    } else {
      setConfirmPin(digits);
      if (digits.length === 4) {
        if (digits !== pin) {
          setError("PINs do not match. Try again.");
          setConfirmPin("");
          focusInput();
        } else {
          savePin(digits);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === "confirm") {
      if (confirmPin.length === 0) {
        setStep("enter");
        setPin(pin.slice(0, -1));
      } else {
        setConfirmPin(confirmPin.slice(0, -1));
      }
    } else {
      setPin(pin.slice(0, -1));
    }
  };

  const reset = () => {
    setPin("");
    setConfirmPin("");
    setStep("enter");
    setError("");
    focusInput();
  };

  const currentValue = step === "enter" ? pin : confirmPin;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Security</h2>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" />
            Staff Mode PIN
          </CardTitle>
          <CardDescription>
            Set the 4-digit PIN that unlocks sensitive sections when Staff Mode is active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className={`flex items-center gap-2 text-sm font-medium ${hasPin ? "text-green-500" : "text-amber-500"}`}>
            {hasPin ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {hasPin ? "PIN is configured" : "No PIN set — Staff Mode is insecure"}
          </div>

          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold"
            >
              ✅ PIN updated successfully!
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <div onClick={focusInput} className="cursor-pointer">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              {step === "enter" ? "Enter New PIN" : "Confirm PIN"}
            </Label>
            <div className="flex justify-start gap-3 mt-3">
              {[0, 1, 2, 3].map((i) => {
                const filled = i < currentValue.length;
                const active = i === currentValue.length;
                return (
                  <div
                    key={i}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                      active
                        ? "bg-primary/10 border-2 border-primary shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                        : filled
                        ? "bg-primary/5 border border-primary/30"
                        : "bg-muted/30 border border-border"
                    }`}
                  >
                    {filled ? <div className="w-3 h-3 bg-foreground rounded-full" /> : null}
                  </div>
                );
              })}
            </div>
            {/* Hidden input — captures keyboard on desktop & mobile */}
            <input
              ref={inputRef}
              autoFocus
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentValue}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace") {
                  e.preventDefault();
                  handleBackspace();
                }
              }}
              className="sr-only"
              aria-label="PIN input"
            />
          </div>

          {step === "confirm" && (
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline">
              Start over
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── RECEIPTS TAB ─── */
function ReceiptsTab() {
  const { businessId } = useAuthStore();

  const settings = useLiveQuery(
    () => businessId ? db.business_settings.where("business_id").equals(businessId).first() : undefined,
    [businessId]
  );

  const [form, setForm] = useState({
    receipt_header: "",
    receipt_footer: "",
    receipt_paper_size: "80mm" as "80mm" | "58mm",
    receipt_show_gst: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        receipt_header: settings.receipt_header || "",
        receipt_footer: settings.receipt_footer || "",
        receipt_paper_size: settings.receipt_paper_size || "80mm",
        receipt_show_gst: settings.receipt_show_gst ?? true,
      });
      setLogoUrl(settings.receipt_logo_url || null);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const record = {
        id: settings?.id || crypto.randomUUID(),
        business_id: businessId,
        ...form,
        receipt_logo_url: logoUrl || undefined,
        updated_at: new Date().toISOString(),
      };
      await db.business_settings.put(record);
      if (supabase) {
        await supabase.from("business_settings").upsert(record);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !businessId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `receipts/${businessId}/logo.${ext}`;
      const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("assets").getPublicUrl(path);
        setLogoUrl(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Receipt Customization</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Header Text</Label>
              <textarea
                value={form.receipt_header}
                onChange={(e) => setForm({ ...form, receipt_header: e.target.value })}
                placeholder="Welcome to our store!"
                rows={3}
                maxLength={200}
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Footer Text</Label>
              <textarea
                value={form.receipt_footer}
                onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                placeholder="Thank you! Exchange within 7 days."
                rows={3}
                maxLength={200}
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" /> Options</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Receipt Logo</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain border border-border bg-white" />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Upload className="w-4 h-4" />
                  </div>
                )}
                <label className="cursor-pointer text-xs text-primary hover:underline font-medium">
                  {uploading ? "Uploading…" : logoUrl ? "Change" : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
                {logoUrl && (
                  <button onClick={() => setLogoUrl(null)} className="text-xs text-destructive hover:underline">Remove</button>
                )}
              </div>
            </div>

            {/* Paper Size */}
            <div className="space-y-2">
              <Label>Paper Size</Label>
              <div className="flex gap-2">
                {(["80mm", "58mm"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setForm({ ...form, receipt_paper_size: size })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.receipt_paper_size === size
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* GST Toggle */}
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Show GST Breakdown</Label>
              <button
                onClick={() => setForm({ ...form, receipt_show_gst: !form.receipt_show_gst })}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.receipt_show_gst ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.receipt_show_gst ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {saved && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
          ✅ Receipt settings saved!
        </motion.div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full max-w-xs h-11 font-semibold">
        {saving ? "Saving…" : "Save Receipt Settings"}
      </Button>
    </div>
  );
}

/* ─── DATA & SYNC TAB ─── */
function SyncTab() {
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
