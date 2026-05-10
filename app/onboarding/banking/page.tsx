"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2 } from "lucide-react";
import db, { type Business } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLogger";

const STEPS = ["Business", "GST & Tax", "Banking"];

export default function OnboardingBanking() {
  const router = useRouter();
  const { user, setOnboardingComplete, role } = useAuthStore();
  const [form, setForm] = useState({ bankName: "", accountNumber: "", ifsc: "", upiId: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

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
        const ts = new Date().toISOString();
        await db.sync_queue.add({ table_name: "businesses", operation: "INSERT", data: newBusiness, timestamp: ts });
      });

      // Also save to Supabase if available
      if (supabase && user) {
        await supabase.from("businesses").insert(newBusiness);
        await supabase.from("business_members").insert({
          business_id: businessId,
          user_id: user.id,
          role: "admin",
          permissions: [],
        });
      }

      setOnboardingComplete(businessId, newBusiness.name);
      await logActivity(businessId, user?.id ?? "mock", "business_created", { name: newBusiness.name });

      // Clean up session storage
      sessionStorage.removeItem("onboarding_step1");
      sessionStorage.removeItem("onboarding_step2");

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-10 shadow-2xl text-center"
      >
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
        <p className="text-muted-foreground">Taking you to your dashboard...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
              <Input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="HDFC Bank"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label>UPI ID</Label>
              <Input
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                placeholder="shop@upi"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Account Number</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="XXXX XXXX XXXX"
              className="bg-background/50 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>IFSC Code</Label>
            <Input
              value={form.ifsc}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
              placeholder="HDFC0001234"
              maxLength={11}
              className="bg-background/50 font-mono"
            />
          </div>

          <div className="pt-2 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm text-muted-foreground">
            ✅ Bank details are stored securely and used only for receipt generation. You can update them anytime in Settings.
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => router.back()}>
              ← Back
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 h-11 font-bold">
              {saving ? "Setting up..." : "Finish Setup 🚀"}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
