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
const CURRENCIES = [
  { code: "INR", symbol: "\u20b9", name: "Indian Rupee",       flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { code: "USD", symbol: "$",     name: "US Dollar",          flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "EUR", symbol: "\u20ac", name: "Euro",               flag: "\uD83C\uDDEA\uD83C\uDDFA" },
  { code: "GBP", symbol: "\u00a3", name: "British Pound",      flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "AED", symbol: "\u062f.\u0625", name: "UAE Dirham", flag: "\uD83C\uDDE6\uD83C\uDDEA" },
  { code: "SAR", symbol: "\u0631.\u0633", name: "Saudi Riyal", flag: "\uD83C\uDDF8\uD83C\uDDE6" },
  { code: "JPY", symbol: "\u00a5", name: "Japanese Yen",       flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  { code: "CNY", symbol: "\u00a5", name: "Chinese Yuan",       flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { code: "SGD", symbol: "S$",    name: "Singapore Dollar",   flag: "\uD83C\uDDF8\uD83C\uDDEC" },
  { code: "MYR", symbol: "RM",    name: "Malaysian Ringgit",  flag: "\uD83C\uDDF2\uD83C\uDDFE" },
  { code: "BDT", symbol: "\u09f3", name: "Bangladeshi Taka",  flag: "\uD83C\uDDE7\uD83C\uDDE9" },
  { code: "PKR", symbol: "\u20a8", name: "Pakistani Rupee",   flag: "\uD83C\uDDF5\uD83C\uDDF0" },
  { code: "LKR", symbol: "\u20a8", name: "Sri Lankan Rupee",  flag: "\uD83C\uDDF1\uD83C\uDDF0" },
  { code: "NPR", symbol: "\u20a8", name: "Nepalese Rupee",    flag: "\uD83C\uDDF3\uD83C\uDDF5" },
  { code: "AUD", symbol: "A$",    name: "Australian Dollar",  flag: "\uD83C\uDDE6\uD83C\uDDFA" },
  { code: "CAD", symbol: "C$",    name: "Canadian Dollar",   flag: "\uD83C\uDDE8\uD83C\uDDE6" },
  { code: "CHF", symbol: "Fr",    name: "Swiss Franc",        flag: "\uD83C\uDDE8\uD83C\uDDED" },
  { code: "KRW", symbol: "\u20a9", name: "South Korean Won",  flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { code: "THB", symbol: "\u0e3f", name: "Thai Baht",         flag: "\uD83C\uDDF9\uD83C\uDDED" },
  { code: "IDR", symbol: "Rp",    name: "Indonesian Rupiah", flag: "\uD83C\uDDEE\uD83C\uDDE9" },
];

const ALL_DAYS = [
  { id: "mon", label: "Mon" }, { id: "tue", label: "Tue" }, { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" }, { id: "fri", label: "Fri" }, { id: "sat", label: "Sat" }, { id: "sun", label: "Sun" },
];

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
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
    <div className="flex flex-wrap gap-1.5">
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

function GeneralTab() {
  const router = useRouter();
  const { businessId } = useAuthStore();
  const settings = useLiveQuery(
    () => businessId ? db.business_settings.where("business_id").equals(businessId).first() : undefined,
    [businessId]
  );

  const [form, setForm] = useState({
    // Currency & Formatting
    currency_code: "INR",
    currency_symbol: "\u20b9",
    date_format: "DD/MM/YYYY" as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD",
    time_format: "12h" as "12h" | "24h",
    decimal_places: 2,
    // Tax & Invoicing
    default_gst_rate: 18,
    invoice_prefix: "INV-",
    invoice_start_number: 1,
    invoice_number_padding: 4,
    // POS Behavior
    default_payment_method: "cash" as "cash" | "card" | "upi",
    pos_quick_add: true,
    pos_sound_effects: true,
    staff_mode_default_minutes: 10,
    auto_session_timeout_minutes: 0,
    low_stock_threshold: 10,
    barcode_format: "ean13" as "ean13" | "code128" | "qr",
    // Business Hours
    business_hours_open: "09:00",
    business_hours_close: "21:00",
    business_days: ["mon", "tue", "wed", "thu", "fri", "sat"] as string[],
    // Notifications
    notify_low_stock: true,
    notify_daily_summary: true,
    notify_sync_failures: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(prev => ({
        ...prev,
        currency_code: settings.currency_code || prev.currency_code,
        currency_symbol: settings.currency_symbol || prev.currency_symbol,
        date_format: settings.date_format || prev.date_format,
        time_format: settings.time_format || prev.time_format,
        decimal_places: settings.decimal_places ?? prev.decimal_places,
        default_gst_rate: settings.default_gst_rate ?? prev.default_gst_rate,
        invoice_prefix: settings.invoice_prefix ?? prev.invoice_prefix,
        invoice_start_number: settings.invoice_start_number ?? prev.invoice_start_number,
        invoice_number_padding: settings.invoice_number_padding ?? prev.invoice_number_padding,
        default_payment_method: settings.default_payment_method || prev.default_payment_method,
        pos_quick_add: settings.pos_quick_add ?? prev.pos_quick_add,
        pos_sound_effects: settings.pos_sound_effects ?? prev.pos_sound_effects,
        staff_mode_default_minutes: settings.staff_mode_default_minutes ?? prev.staff_mode_default_minutes,
        auto_session_timeout_minutes: settings.auto_session_timeout_minutes ?? prev.auto_session_timeout_minutes,
        low_stock_threshold: settings.low_stock_threshold ?? prev.low_stock_threshold,
        barcode_format: settings.barcode_format || prev.barcode_format,
        business_hours_open: settings.business_hours_open || prev.business_hours_open,
        business_hours_close: settings.business_hours_close || prev.business_hours_close,
        business_days: settings.business_days || prev.business_days,
        notify_low_stock: settings.notify_low_stock ?? prev.notify_low_stock,
        notify_daily_summary: settings.notify_daily_summary ?? prev.notify_daily_summary,
        notify_sync_failures: settings.notify_sync_failures ?? prev.notify_sync_failures,
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const record = {
        id: settings?.id || crypto.randomUUID(),
        business_id: businessId,
        ...(settings || {}),
        ...form,
        updated_at: new Date().toISOString(),
      } as any;
      await db.business_settings.put(record);
      if (supabase) {
        await supabase.from("business_settings").upsert(record);
      }
      // Invalidate currency cache so formatCurrency picks up new values
      const { invalidateCurrencyCache } = await import("@/lib/formatCurrency");
      invalidateCurrencyCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const u = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">General</h2>

      {/* ── Card 1: Business Profile ── */}
      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => router.push("/dashboard/settings/business")} className="text-left w-full">
        <Card className="bg-card/50 border-border/50 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Business Profile</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Update shop name, GST, bank details, address, and invoice prefix.</CardDescription>
          </CardHeader>
        </Card>
      </motion.button>

      {/* ── Card 2: Currency & Formatting ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" /> Currency & Formatting</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <select
                value={form.currency_code}
                onChange={(e) => {
                  const c = CURRENCIES.find(c => c.code === e.target.value);
                  if (c) u({ currency_code: c.code, currency_symbol: c.symbol, decimal_places: c.code === "JPY" || c.code === "KRW" ? 0 : 2 });
                }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name} ({c.symbol})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Decimal Places</Label>
              <ChipSelect value={form.decimal_places} options={[{ label: "0", value: 0 }, { label: "2", value: 2 }, { label: "3", value: 3 }]} onChange={v => u({ decimal_places: v })} />
              <p className="text-xs text-muted-foreground">e.g. JPY uses 0, INR/USD uses 2</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date Format</Label>
              <ChipSelect value={form.date_format} options={[
                { label: "DD/MM/YYYY", value: "DD/MM/YYYY" as const },
                { label: "MM/DD/YYYY", value: "MM/DD/YYYY" as const },
                { label: "YYYY-MM-DD", value: "YYYY-MM-DD" as const },
              ]} onChange={v => u({ date_format: v })} />
            </div>
            <div className="space-y-2">
              <Label>Time Format</Label>
              <ChipSelect value={form.time_format} options={[
                { label: "12-hour", value: "12h" as const },
                { label: "24-hour", value: "24h" as const },
              ]} onChange={v => u({ time_format: v })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Tax & Invoicing ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Tax & Invoicing</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default GST Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={form.default_gst_rate} onChange={e => u({ default_gst_rate: Number(e.target.value) })} className="max-w-[120px]" />
              <p className="text-xs text-muted-foreground">Pre-filled when adding new products.</p>
            </div>
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input value={form.invoice_prefix} onChange={e => u({ invoice_prefix: e.target.value })} placeholder="e.g. INV-, BD-" className="max-w-[160px]" maxLength={10} />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Starting Invoice Number</Label>
              <Input type="number" min="1" value={form.invoice_start_number} onChange={e => u({ invoice_start_number: Number(e.target.value) })} className="max-w-[120px]" />
            </div>
            <div className="space-y-2">
              <Label>Number Padding</Label>
              <ChipSelect value={form.invoice_number_padding} options={[
                { label: "1 → 1", value: 1 }, { label: "01 → 2", value: 2 },
                { label: "001 → 3", value: 3 }, { label: "0001 → 4", value: 4 },
              ]} onChange={v => u({ invoice_number_padding: v })} />
              <p className="text-xs text-muted-foreground">Preview: {form.invoice_prefix}{String(form.invoice_start_number).padStart(form.invoice_number_padding, '0')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: POS Behavior ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" /> POS Behavior</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Payment Method</Label>
              <ChipSelect value={form.default_payment_method} options={[
                { label: "💵 Cash", value: "cash" as const },
                { label: "💳 Card", value: "card" as const },
                { label: "📱 UPI", value: "upi" as const },
              ]} onChange={v => u({ default_payment_method: v })} />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Alert Threshold</Label>
              <Input type="number" min="0" value={form.low_stock_threshold} onChange={e => u({ low_stock_threshold: Number(e.target.value) })} className="max-w-[120px]" />
              <p className="text-xs text-muted-foreground">Items below this quantity trigger alerts.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Staff Mode Default Timer</Label>
              <ChipSelect value={form.staff_mode_default_minutes} options={[
                { label: "5m", value: 5 }, { label: "10m", value: 10 }, { label: "20m", value: 20 },
                { label: "30m", value: 30 }, { label: "1hr", value: 60 },
              ]} onChange={v => u({ staff_mode_default_minutes: v })} />
              <p className="text-xs text-muted-foreground">Pre-selected unlock duration in PIN dialog.</p>
            </div>
            <div className="space-y-2">
              <Label>Auto-Lock Timeout (min)</Label>
              <Input type="number" min="0" value={form.auto_session_timeout_minutes} onChange={e => u({ auto_session_timeout_minutes: Number(e.target.value) })} className="max-w-[120px]" />
              <p className="text-xs text-muted-foreground">0 = disabled. Re-enables staff mode lock after inactivity.</p>
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="POS Quick Add Mode" desc="Clicking a product directly adds it to cart." value={form.pos_quick_add} onChange={() => u({ pos_quick_add: !form.pos_quick_add })} />
            <ToggleRow label="POS Sound Effects" desc="Play a beep when scanning or adding items." value={form.pos_sound_effects} onChange={() => u({ pos_sound_effects: !form.pos_sound_effects })} />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 5: Business Hours & Notifications ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Business Hours & Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input type="time" value={form.business_hours_open} onChange={e => u({ business_hours_open: e.target.value })} className="max-w-[160px]" />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input type="time" value={form.business_hours_close} onChange={e => u({ business_hours_close: e.target.value })} className="max-w-[160px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map(d => {
                const active = form.business_days.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => u({ business_days: active ? form.business_days.filter(x => x !== d.id) : [...form.business_days, d.id] })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="Low Stock Notifications" desc="Alert when items fall below threshold." value={form.notify_low_stock} onChange={() => u({ notify_low_stock: !form.notify_low_stock })} />
            <ToggleRow label="Daily Summary" desc="Receive a daily sales summary notification." value={form.notify_daily_summary} onChange={() => u({ notify_daily_summary: !form.notify_daily_summary })} />
            <ToggleRow label="Sync Failure Alerts" desc="Notify when data sync to cloud fails." value={form.notify_sync_failures} onChange={() => u({ notify_sync_failures: !form.notify_sync_failures })} />
          </div>
        </CardContent>
      </Card>

      {/* ── Save Button ── */}
      <div className="sticky bottom-4 z-10">
        <Card className="bg-card/90 backdrop-blur-lg border-border/50 shadow-xl">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {saved ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-500 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> All preferences saved!
                </motion.span>
              ) : "Changes are not saved until you click Save."}
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-10 font-semibold px-8">
              {saving ? "Saving..." : "Save All Preferences"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── SECURITY TAB ─── */
function SecurityTab() {
  const { businessId } = useAuthStore();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"verify" | "enter" | "confirm">("verify");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const business = useLiveQuery(
    () => businessId ? db.businesses.get(businessId) : undefined,
    [businessId]
  );
  const hasPin = !!business?.admin_pin;

  useEffect(() => {
    if (business !== undefined && !hasPin) setStep("enter");
  }, [business, hasPin]);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 50);
  useEffect(() => { focusInput(); }, [step]);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const savePin = async (value: string) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await db.businesses.update(businessId, { admin_pin: value } as never);
      if (supabase) {
        await supabase.from("businesses").update({ admin_pin: value }).eq("id", businessId);
      }
      setSaved(true);
      resetAll();
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setError("");
    if (step === "verify") {
      setCurrentPin(digits);
      if (digits.length === 4) {
        if (digits === business?.admin_pin) {
          setStep("enter"); setNewPin("");
        } else {
          setError("Incorrect current PIN"); setCurrentPin(""); triggerShake(); focusInput();
        }
      }
    } else if (step === "enter") {
      setNewPin(digits);
      if (digits.length === 4) { setStep("confirm"); setConfirmPin(""); }
    } else {
      setConfirmPin(digits);
      if (digits.length === 4) {
        if (digits !== newPin) {
          setError("PINs do not match. Try again."); setConfirmPin(""); triggerShake(); focusInput();
        } else { savePin(digits); }
      }
    }
  };

  const handleBackspace = () => {
    if (step === "confirm") {
      if (confirmPin.length === 0) { setStep("enter"); setNewPin(newPin.slice(0, -1)); }
      else setConfirmPin(confirmPin.slice(0, -1));
    } else if (step === "enter") {
      if (newPin.length === 0 && hasPin) { setStep("verify"); setCurrentPin(""); }
      else setNewPin(newPin.slice(0, -1));
    } else {
      setCurrentPin(currentPin.slice(0, -1));
    }
  };

  const resetAll = () => {
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
    setStep(hasPin ? "verify" : "enter"); setError(""); focusInput();
  };

  const currentValue = step === "verify" ? currentPin : step === "enter" ? newPin : confirmPin;
  const stepLabel = step === "verify" ? "Enter Current PIN" : step === "enter" ? "Enter New PIN" : "Confirm New PIN";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Security</h2>
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" /> Staff Mode PIN
          </CardTitle>
          <CardDescription>
            {hasPin ? "To change your PIN, verify the current one first." : "Set a 4-digit PIN to secure Staff Mode."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`flex items-center gap-2 text-sm font-medium ${hasPin ? "text-green-500" : "text-amber-500"}`}>
            {hasPin ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {hasPin ? "PIN is configured" : "No PIN set — Staff Mode is insecure"}
          </div>

          {hasPin && (
            <div className="flex items-center gap-2">
              {(["verify", "enter", "confirm"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    step === s ? "border-primary bg-primary text-primary-foreground"
                    : (s === "verify" && step !== "verify") || (s === "enter" && step === "confirm")
                    ? "border-green-500 bg-green-500/10 text-green-500"
                    : "border-border text-muted-foreground"
                  }`}>
                    {((s === "verify" && step !== "verify") || (s === "enter" && step === "confirm"))
                      ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < 2 && <div className="w-8 h-[2px] bg-border" />}
                </div>
              ))}
            </div>
          )}

          {saved && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
              ✅ PIN updated successfully!
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </motion.div>
          )}

          <div onClick={focusInput} className="cursor-pointer">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{stepLabel}</Label>
            <motion.div animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.4 }}
              className="flex justify-start gap-3 mt-3">
              {[0, 1, 2, 3].map((i) => {
                const filled = i < currentValue.length;
                const active = i === currentValue.length;
                return (
                  <div key={i} className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    active ? "bg-primary/10 border-2 border-primary shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : filled ? "bg-primary/5 border border-primary/30"
                    : "bg-muted/30 border border-border"
                  }`}>
                    {filled ? <div className="w-3 h-3 bg-foreground rounded-full" /> : null}
                  </div>
                );
              })}
            </motion.div>
            <input ref={inputRef} autoFocus type="text" inputMode="numeric" pattern="[0-9]*"
              value={currentValue} onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); } }}
              className="sr-only" aria-label="PIN input" />
          </div>

          {(step === "enter" || step === "confirm") && hasPin && (
            <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground underline">Start over</button>
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
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Logo image must be less than 1MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
      setUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
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
