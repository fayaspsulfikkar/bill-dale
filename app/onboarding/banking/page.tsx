"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Shield, Eye, EyeOff } from "lucide-react";
import db, { type Business } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLogger";

const STEPS = ["Business", "GST & Tax", "Banking"];

type Phase = "banking" | "pin" | "done";

export default function OnboardingBanking() {
  const router = useRouter();
  const { user, setOnboardingComplete } = useAuthStore();

  // Phase 1 — banking form
  const [form, setForm] = useState({ bankName: "", accountNumber: "", ifsc: "", upiId: "" });
  const [saving, setSaving] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  // Phase 2 — PIN creation
  const [pinForm, setPinForm] = useState({ pin: "", confirm: "" });
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pinError, setPinError] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("banking");

  // ── Phase 1: Save banking + business ─────────────────────
  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const step1 = JSON.parse(sessionStorage.getItem("onboarding_step1") || "{}");
      const step2 = JSON.parse(sessionStorage.getItem("onboarding_step2") || "{}");

      const businessId = crypto.randomUUID();
      const newBusiness: Business = {
        id: businessId,
        name: step1.shopName || "My Business",
        owner_name: step1.ownerName,
        mobile: step1.mobile,
        email: step1.email,
        gstin: step2.gstin,
        pan: step2.pan,
        address: step2.address,
        state: step2.state,
        pincode: step2.pincode,
        invoice_prefix: step2.invoicePrefix || "INV",
        tax_type: (step2.taxType || "regular") as "regular" | "composition",
        bank_name: form.bankName,
        account_number: form.accountNumber,
        ifsc: form.ifsc,
        upi_id: form.upiId,
        created_at: new Date().toISOString(),
      };

      // Save to local Dexie
      await db.transaction("rw", db.businesses, db.business_members, db.sync_queue, async () => {
        await db.businesses.add(newBusiness);
        await db.business_members.add({
          id: crypto.randomUUID(),
          business_id: businessId,
          user_id: user?.id ?? "mock",
          role: "admin",
          permissions: [],
          joined_at: new Date().toISOString(),
        });
        await db.sync_queue.add({ table_name: "businesses", operation: "INSERT", data: newBusiness, timestamp: new Date().toISOString() });
      });

      // Sync to Supabase
      if (supabase && user) {
        await supabase.from("businesses").upsert(newBusiness, { onConflict: "id" });
        await supabase.from("business_members").upsert(
          { business_id: businessId, user_id: user.id, role: "admin", permissions: [] },
          { onConflict: "business_id,user_id" }
        );
      }

      setOnboardingComplete(businessId, newBusiness.name);
      await logActivity(businessId, user?.id ?? "mock", "business_created", { name: newBusiness.name });
      sessionStorage.removeItem("onboarding_step1");
      sessionStorage.removeItem("onboarding_step2");

      setCurrentBusinessId(businessId);
      // Move to PIN creation phase
      setPhase("pin");
      setTimeout(() => pinRef.current?.focus(), 200);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Phase 2: Set staff mode PIN ───────────────────────────
  const handleSetPin = async () => {
    if (pinForm.pin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (pinForm.pin !== pinForm.confirm) { setPinError("PINs do not match."); return; }
    if (!currentBusinessId) return;

    setPinError("");
    setSavingPin(true);
    try {
      await db.businesses.update(currentBusinessId, { admin_pin: pinForm.pin } as never);
      if (supabase) {
        await supabase.from("businesses").update({ admin_pin: pinForm.pin }).eq("id", currentBusinessId);
      }
      setPhase("done");
      setTimeout(() => router.push("/dashboard"), 1800);
    } finally {
      setSavingPin(false);
    }
  };

  // ── Phase 3: Done ─────────────────────────────────────────
  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-10 shadow-2xl text-center"
      >
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
        <p className="text-muted-foreground">Taking you to your dashboard…</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">

      {/* ── Banking form ── */}
      {phase === "banking" && (
        <motion.div
          key="banking"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
        >
          <OnboardingProgress currentStep={3} steps={STEPS} />
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Bank & UPI Details</h1>
                <p className="text-sm text-muted-foreground">For payment tracking and receipts</p>
              </div>
            </div>

            <form onSubmit={handleFinish} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="HDFC Bank" className="bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label>UPI ID</Label>
                  <Input value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="shop@upi" className="bg-background/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input type="text" inputMode="numeric" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="XXXX XXXX XXXX" className="bg-background/50 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" maxLength={11} className="bg-background/50 font-mono" />
              </div>
              <div className="pt-2 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm text-muted-foreground">
                ✅ Bank details are stored securely and used only for receipt generation.
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => router.back()}>← Back</Button>
                <Button type="submit" disabled={saving} className="flex-1 h-11 font-bold">
                  {saving ? "Setting up…" : "Next: Set Security PIN →"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* ── PIN creation ── */}
      {phase === "pin" && (
        <motion.div
          key="pin"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
        >
          <OnboardingProgress currentStep={3} steps={STEPS} />
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Set Your Staff Mode PIN</h1>
                <p className="text-sm text-muted-foreground">Required before you can access the dashboard</p>
              </div>
            </div>

            {/* Explanation */}
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
              <p className="font-semibold mb-1">🔐 Why do I need a PIN?</p>
              <p className="opacity-90 text-xs leading-relaxed">
                Your app will always start in <strong>Staff Mode</strong> — sensitive sections like Analytics,
                Settings, and Reports are locked by default. Enter this PIN anytime to unlock them.
                You can change it later in Settings.
              </p>
            </div>

            {pinError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {pinError}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>PIN (4–8 digits)</Label>
                <div className="relative">
                  <input
                    ref={pinRef}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={8}
                    value={pinForm.pin}
                    onChange={(e) => { setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, "") }); setPinError(""); }}
                    placeholder="Enter PIN"
                    className="w-full h-12 px-4 pr-12 rounded-xl bg-background/50 border border-input text-2xl font-mono tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="button" onClick={() => setShowPin((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Confirm PIN</Label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={8}
                    value={pinForm.confirm}
                    onChange={(e) => { setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, "") }); setPinError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
                    placeholder="Repeat PIN"
                    className="w-full h-12 px-4 pr-12 rounded-xl bg-background/50 border border-input text-2xl font-mono tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                onClick={handleSetPin}
                disabled={savingPin || pinForm.pin.length < 4}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 transition-all text-base"
              >
                {savingPin ? "Saving PIN…" : "Set PIN & Enter Dashboard 🚀"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
