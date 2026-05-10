"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

const STEPS = ["Business", "GST & Tax", "Banking"];

export default function OnboardingStep1() {
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: "",
    ownerName: "",
    mobile: "",
    email: "",
    businessType: "retail",
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    // Persist to sessionStorage for the multi-step flow
    sessionStorage.setItem("onboarding_step1", JSON.stringify(form));
    router.push("/onboarding/gst");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <OnboardingProgress currentStep={1} steps={STEPS} />

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Business Identity</h1>
            <p className="text-sm text-muted-foreground">Tell us about your shop</p>
          </div>
        </div>

        <form onSubmit={handleNext} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label>Shop Name *</Label>
              <Input
                required
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                placeholder="e.g. Sole Street Sneakers"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Owner Name *</Label>
              <Input
                required
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="Full name"
                className="bg-background/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mobile Number *</Label>
                <Input
                  required
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="+91 9876543210"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Business Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="shop@email.com"
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Business Type</Label>
              <select
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-background/50 border border-input text-sm text-foreground"
              >
                <option value="retail">Retail Store</option>
                <option value="wholesale">Wholesale</option>
                <option value="service">Service</option>
                <option value="restaurant">Restaurant / Cafe</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full h-11 font-semibold">
              Next: GST & Tax Setup →
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
