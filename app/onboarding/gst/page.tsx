"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

const STEPS = ["Business", "GST & Tax", "Banking"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
];

export default function OnboardingGST() {
  const router = useRouter();
  const [form, setForm] = useState({
    gstin: "",
    pan: "",
    taxType: "regular",
    invoicePrefix: "INV",
    address: "",
    state: "",
    pincode: "",
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("onboarding_step2", JSON.stringify(form));
    router.push("/onboarding/banking");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <OnboardingProgress currentStep={2} steps={STEPS} />

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">GST & Tax Settings</h1>
            <p className="text-sm text-muted-foreground">Required for GST billing and invoices</p>
          </div>
        </div>

        <form onSubmit={handleNext} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="bg-background/50 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>PAN Number</Label>
              <Input
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                placeholder="AAAAA0000A"
                maxLength={10}
                className="bg-background/50 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tax Type</Label>
              <select
                value={form.taxType}
                onChange={(e) => setForm({ ...form, taxType: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-background/50 border border-input text-sm text-foreground"
              >
                <option value="regular">Regular (GSTIN Registered)</option>
                <option value="composition">Composition Scheme</option>
                <option value="unregistered">Unregistered</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Prefix *</Label>
              <Input
                required
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                placeholder="INV"
                maxLength={6}
                className="bg-background/50 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Shop Address *</Label>
            <Input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Door No, Street, Area"
              className="bg-background/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>State *</Label>
              <select
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-background/50 border border-input text-sm text-foreground"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Pincode *</Label>
              <Input
                required
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
                placeholder="600001"
                className="bg-background/50 font-mono"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => router.back()}>
              ← Back
            </Button>
            <Button type="submit" className="flex-1 h-11 font-semibold">
              Next: Bank Details →
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
