"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield, Check, AlertTriangle, Lock, Key, Smartphone, MapPin, EyeOff, Activity, Clock, User, Monitor, Hash } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import db from "@/offline/db";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ALL_ROLES, ROLE_PRESETS, type POSAction } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLogger";
import { PIN_ACTIONS, SAMPLE_LOGS, LOCK_TIMEOUTS, FAILED_ATTEMPT_OPTIONS, COOLDOWN_OPTIONS } from "./security-constants";

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

export default function SecurityTab() {
  const { businessId, user } = useAuthStore();
  
  // Settings DB State
  const settings = useLiveQuery(
    () => businessId ? db.business_settings.where("business_id").equals(businessId).first() : undefined,
    [businessId]
  );
  
  // Businesses DB State (for Staff PIN)
  const business = useLiveQuery(
    () => businessId ? db.businesses.get(businessId) : undefined,
    [businessId]
  );
  
  // Audit Logs State
  const auditLogs = useLiveQuery(async () => {
    if (!businessId) return [];
    const logs = await db.activity_logs.where("business_id").equals(businessId).toArray();
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  }, [businessId]) || [];

  const users = useLiveQuery(() => db.users.toArray()) || [];
  const userMap = users.reduce((acc, u) => {
    acc[u.id] = u.name || u.email || "Unknown User";
    return acc;
  }, {} as Record<string, string>);
  
  // Pin Auth State
  const hasPin = !!business?.admin_pin;
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"verify" | "enter" | "confirm">("verify");
  const [pinError, setPinError] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Settings Form State
  const [form, setForm] = useState({
    security_pin_length: 4 as 4 | 6,
    security_auto_lock_enabled: false,
    security_auto_lock_minutes: 0,
    security_lock_on_minimize: false,
    security_lock_after_sale: false,
    security_failed_attempts_limit: 5,
    security_cooldown_minutes: 15,
    security_require_admin_new_device: true,
    security_allow_trusted_devices_only: false,
    security_staff_branch_only: true,
    security_admin_pin_switch_branch: true,
    security_mask_customer_phone: false,
    security_hide_credit_balance: false,
    security_hide_profit_non_admin: true,
    security_pin_required_actions: [] as string[],
    security_role_permissions: {} as Record<string, Record<string, boolean>>,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydrating = useRef(true);

  // Expanded Sections State
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (settings) {
      isHydrating.current = true;
      setForm(prev => ({
        ...prev,
        security_pin_length: settings.security_pin_length ?? 4,
        security_auto_lock_enabled: settings.security_auto_lock_enabled ?? false,
        security_auto_lock_minutes: settings.security_auto_lock_minutes ?? 0,
        security_lock_on_minimize: settings.security_lock_on_minimize ?? false,
        security_lock_after_sale: settings.security_lock_after_sale ?? false,
        security_failed_attempts_limit: settings.security_failed_attempts_limit ?? 5,
        security_cooldown_minutes: settings.security_cooldown_minutes ?? 15,
        security_require_admin_new_device: settings.security_require_admin_new_device ?? true,
        security_allow_trusted_devices_only: settings.security_allow_trusted_devices_only ?? false,
        security_staff_branch_only: settings.security_staff_branch_only ?? true,
        security_admin_pin_switch_branch: settings.security_admin_pin_switch_branch ?? true,
        security_mask_customer_phone: settings.security_mask_customer_phone ?? false,
        security_hide_credit_balance: settings.security_hide_credit_balance ?? false,
        security_hide_profit_non_admin: settings.security_hide_profit_non_admin ?? true,
        security_pin_required_actions: settings.security_pin_required_actions ?? [],
        security_role_permissions: settings.security_role_permissions ?? {},
      }));
    }
  }, [settings]);

  // Handle step resets when PIN state changes
  useEffect(() => {
    if (business !== undefined && !hasPin) setStep("enter");
  }, [business, hasPin]);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 50);
  useEffect(() => { focusInput(); }, [step]);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  // --- SAVE ACTIONS ---
  
  const savePin = async (value: string) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await db.businesses.update(businessId, { admin_pin: value } as never);
      if (supabase) {
        await supabase.from("businesses").update({ admin_pin: value }).eq("id", businessId);
      }
      if (user?.id) logActivity(businessId, user.id, "Staff Mode PIN updated", { message: "Admin changed the global staff PIN." });
      setPinSaved(true);
      resetAll();
      setTimeout(() => setPinSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const doSaveSettings = useCallback(async (data: typeof form) => {
    if (!businessId) return;
    setSaving(true);
    try {
      const record = {
        id: settings?.id || crypto.randomUUID(),
        business_id: businessId,
        ...(settings || {}),
        ...data,
        updated_at: new Date().toISOString(),
      } as any;
      await db.business_settings.put(record);
      if (supabase) {
        await supabase.from("business_settings").upsert(record);
      }
      if (user?.id) logActivity(businessId, user.id, "Security settings updated", { message: "Modified settings or role permissions." });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, settings?.id]);

  useEffect(() => {
    if (isHydrating.current) {
      isHydrating.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSaveSettings(form), 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const u = (patch: Partial<typeof form>) => {
    isHydrating.current = false;
    setForm(prev => ({ ...prev, ...patch }));
  };

  // --- PIN LOGIC ---
  const handleInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, form.security_pin_length);
    setPinError("");
    if (step === "verify") {
      setCurrentPin(digits);
      if (digits.length === form.security_pin_length) {
        if (digits === business?.admin_pin) {
          setStep("enter"); setNewPin("");
        } else {
          if (user?.id) logActivity(businessId, user.id, "Failed PIN attempt", { message: "Incorrect Staff Mode PIN entered." });
          setPinError("Incorrect current PIN"); setCurrentPin(""); triggerShake(); focusInput();
        }
      }
    } else if (step === "enter") {
      setNewPin(digits);
      if (digits.length === form.security_pin_length) { setStep("confirm"); setConfirmPin(""); }
    } else {
      setConfirmPin(digits);
      if (digits.length === form.security_pin_length) {
        if (digits !== newPin) {
          setPinError("PINs do not match. Try again."); setConfirmPin(""); triggerShake(); focusInput();
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
    setStep(hasPin ? "verify" : "enter"); setPinError(""); focusInput();
  };

  const currentValue = step === "verify" ? currentPin : step === "enter" ? newPin : confirmPin;
  const stepLabel = step === "verify" ? "Enter Current PIN" : step === "enter" ? "Enter New PIN" : "Confirm New PIN";

  // --- PERMISSION LOGIC ---
  const handleTogglePermission = (role: string, actionId: string) => {
    const updated = { ...form.security_role_permissions };
    if (!updated[role]) {
      // Initialize with preset if empty
      const presetSet = ROLE_PRESETS[role] || new Set();
      const initialMap: Record<string, boolean> = {};
      Array.from(presetSet).forEach(a => { initialMap[a] = true; });
      updated[role] = initialMap;
    }
    updated[role][actionId] = !updated[role][actionId];
    u({ security_role_permissions: updated });
  };

  const handleTogglePinRequired = (actionId: string) => {
    const list = [...form.security_pin_required_actions];
    if (list.includes(actionId)) u({ security_pin_required_actions: list.filter(id => id !== actionId) });
    else u({ security_pin_required_actions: [...list, actionId] });
  };

  return (
    <div className="space-y-6 relative max-w-4xl pb-20">
      <h2 className="text-xl font-bold tracking-tight">Security</h2>

      {/* --- GROUP A: AUTHENTICATION & PIN CONTROLS --- */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" /> Staff Mode PIN
          </CardTitle>
          <CardDescription>
            {hasPin ? "To change your PIN, verify the current one first." : "Set a PIN to secure Staff Mode."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-medium ${hasPin ? "text-green-500" : "text-amber-500"}`}>
              {hasPin ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {hasPin ? "PIN is configured" : "No PIN set — Staff Mode is insecure"}
            </div>
            <div className="space-y-1 text-right">
              <Label className="text-xs text-muted-foreground">PIN Length</Label>
              <div className="flex justify-end">
                <ChipSelect value={form.security_pin_length} options={[
                  { label: "4 Digits", value: 4 },
                  { label: "6 Digits", value: 6 }
                ]} onChange={(v) => { u({ security_pin_length: v }); resetAll(); }} />
              </div>
            </div>
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

          {pinSaved && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
              ✅ PIN updated successfully!
            </motion.div>
          )}
          {pinError && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {pinError}
            </motion.div>
          )}

          <div onClick={focusInput} className="cursor-pointer">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{stepLabel}</Label>
            <motion.div animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.4 }}
              className="flex justify-start gap-3 mt-3">
              {Array.from({ length: form.security_pin_length }).map((_, i) => {
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

      {/* --- GROUP B: SESSION LOCK CONFIGURATION --- */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-primary" /> Session Lock
          </CardTitle>
          <CardDescription>Automatically lock the POS terminal to protect against unauthorized access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ToggleRow label="Enable Auto-Lock" desc="Automatically require PIN after inactivity." value={form.security_auto_lock_enabled} onChange={() => u({ security_auto_lock_enabled: !form.security_auto_lock_enabled })} />
          
          <AnimatePresence>
            {form.security_auto_lock_enabled && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-2 pb-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Inactivity Timeout</Label>
                    <ChipSelect value={form.security_auto_lock_minutes} options={LOCK_TIMEOUTS} onChange={(v) => u({ security_auto_lock_minutes: v })} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="Lock on Minimize" desc="Lock immediately when the app goes to the background." value={form.security_lock_on_minimize} onChange={() => u({ security_lock_on_minimize: !form.security_lock_on_minimize })} />
            <ToggleRow label="Lock After Sale" desc="Require PIN again after completing a checkout." value={form.security_lock_after_sale} onChange={() => u({ security_lock_after_sale: !form.security_lock_after_sale })} />
          </div>
        </CardContent>
      </Card>

      {/* --- GROUP C: RBAC & ACTION PINS --- */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4 text-primary" /> Access Control
          </CardTitle>
          <CardDescription>Configure granular permissions and high-security actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Failed Attempt Lockout Limit</Label>
              <ChipSelect value={form.security_failed_attempts_limit} options={FAILED_ATTEMPT_OPTIONS} onChange={(v) => u({ security_failed_attempts_limit: v })} />
            </div>
            <div className="space-y-2">
              <Label>Lockout Cooldown (mins)</Label>
              <ChipSelect value={form.security_cooldown_minutes} options={COOLDOWN_OPTIONS} onChange={(v) => u({ security_cooldown_minutes: v })} />
            </div>
          </div>
          
          <div className="pt-4 border-t border-border/50">
            <Label className="text-sm font-semibold mb-4 block">Require Admin PIN for Actions</Label>
            <div className="space-y-2">
              {PIN_ACTIONS.map(action => (
                <div key={action.key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <button onClick={() => handleTogglePinRequired(action.key)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.security_pin_required_actions.includes(action.key) ? "bg-red-500" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.security_pin_required_actions.includes(action.key) ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Label className="text-sm font-semibold mb-4 block">Role Permissions</Label>
            <div className="space-y-3">
              {ALL_ROLES.filter(r => r.id !== 'owner' && r.id !== 'admin' && r.id !== 'staff').map(role => (
                <div key={role.id} className="border border-border/50 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                    className="w-full flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground px-2 py-1 bg-background rounded border border-border">
                      {form.security_role_permissions[role.id] ? Object.values(form.security_role_permissions[role.id]).filter(Boolean).length : ROLE_PRESETS[role.id]?.size || 0} allowed
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedRole === role.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-background">
                        <div className="p-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
                          {PIN_ACTIONS.map(action => {
                            const isAllowed = form.security_role_permissions[role.id] !== undefined
                              ? !!form.security_role_permissions[role.id][action.key]
                              : ROLE_PRESETS[role.id]?.has(action.key as POSAction);
                            
                            return (
                              <div key={action.key} className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">{action.label}</Label>
                                <button onClick={() => handleTogglePermission(role.id, action.key)} className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${isAllowed ? "bg-primary" : "bg-muted"}`}>
                                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${isAllowed ? "translate-x-4" : ""}`} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- GROUP D: DEVICE & BRANCH BOUNDARIES --- */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" /> Branch & Device Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow label="Require Admin on New Device" desc="Admins must enter PIN when logging in from a new browser/device." value={form.security_require_admin_new_device} onChange={() => u({ security_require_admin_new_device: !form.security_require_admin_new_device })} />
          <ToggleRow label="Restrict Staff to Branch" desc="Staff can only view/sell inventory for their assigned branch." value={form.security_staff_branch_only} onChange={() => u({ security_staff_branch_only: !form.security_staff_branch_only })} />
          <ToggleRow label="PIN Required for Branch Switch" desc="Require Admin PIN to change the active register branch." value={form.security_admin_pin_switch_branch} onChange={() => u({ security_admin_pin_switch_branch: !form.security_admin_pin_switch_branch })} />
        </CardContent>
      </Card>

      {/* --- GROUP E: SENSITIVE DATA --- */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <EyeOff className="w-4 h-4 text-primary" /> Privacy & Data Masking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow label="Mask Customer Phone Numbers" desc="Display +91 98*** **345 outside of customer management." value={form.security_mask_customer_phone} onChange={() => u({ security_mask_customer_phone: !form.security_mask_customer_phone })} />
          <ToggleRow label="Hide Credit Balances" desc="Hide total customer credit/debt from non-admin staff." value={form.security_hide_credit_balance} onChange={() => u({ security_hide_credit_balance: !form.security_hide_credit_balance })} />
          <ToggleRow label="Hide Profit Margins" desc="Hide cost price and profit margin in inventory and reports." value={form.security_hide_profit_non_admin} onChange={() => u({ security_hide_profit_non_admin: !form.security_hide_profit_non_admin })} />
        </CardContent>
      </Card>

      {/* --- AUDIT LOG --- */}
      <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" /> Security Audit Log
          </CardTitle>
          <CardDescription>Recent security events and sensitive actions.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User & Device</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {auditLogs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No security events logged yet.</td></tr>
              )}
              {auditLogs.map((log) => {
                const date = new Date(log.created_at);
                return (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <Clock className="inline w-3 h-3 mr-1" />{format(date, "HH:mm")}<br/>
                      <span className="text-[10px]">{format(date, "yyyy-MM-dd")}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-foreground"><User className="inline w-3 h-3 mr-1" />{userMap[log.user_id] || "System"}</p>
                      <p className="text-[10px] text-muted-foreground"><Monitor className="inline w-3 h-3 mr-1" />{String(log.details?.device || "Registered Device")}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{log.action}</td>
                    <td className="px-4 py-3 text-muted-foreground"><Hash className="inline w-3 h-3 mr-1" />{String(log.details?.message || "-")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Auto-save toast ── */}
      <AnimatePresence>
        {(saving || saved) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-xl border ${
              saved
                ? "bg-green-500/10 border-green-500/30 text-green-500"
                : "bg-card/90 border-border/50 text-muted-foreground"
            }`}>
              {saved ? (
                <><Check className="w-4 h-4" /> Saved</>
              ) : (
                <><div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> Saving...</>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
