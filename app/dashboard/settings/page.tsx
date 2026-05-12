"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Shield, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import db from "@/offline/db";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const router = useRouter();
  const { businessId } = useAuthStore();

  const [pinForm, setPinForm] = useState({ newPin: "", confirmPin: "" });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  const handleSavePin = async () => {
    if (pinForm.newPin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (pinForm.newPin !== pinForm.confirmPin) { setPinError("PINs do not match."); return; }
    if (!businessId) { setPinError("No business found. Complete onboarding first."); return; }
    setPinError("");
    setSavingPin(true);
    try {
      await db.businesses.update(businessId, { admin_pin: pinForm.newPin } as never);
      if (supabase) {
        await supabase.from("businesses").update({ admin_pin: pinForm.newPin }).eq("id", businessId);
      }
      setPinSaved(true);
      setPinForm({ newPin: "", confirmPin: "" });
      setTimeout(() => setPinSaved(false), 3000);
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your POS system preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">

        {/* Business Profile link */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => router.push("/dashboard/settings/business")}
          className="text-left"
        >
          <Card className="bg-card/50 border-border/50 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer h-full">
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

        {/* Staff Mode PIN — right here, no sub-page needed */}
        <Card className="bg-card/50 border-border/50 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Staff Mode PIN
            </CardTitle>
            <CardDescription>
              Set the 4–8 digit PIN that unlocks sensitive sections when Staff Mode is active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pinSaved && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold"
              >
                ✅ PIN updated successfully!
              </motion.div>
            )}
            {pinError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {pinError}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <Label>New PIN (4–8 digits)</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={pinForm.newPin}
                  onChange={(e) => { setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "") }); setPinError(""); }}
                  placeholder="Enter PIN"
                  className="bg-background/50 font-mono tracking-widest text-center pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Confirm PIN</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={pinForm.confirmPin}
                  onChange={(e) => { setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, "") }); setPinError(""); }}
                  placeholder="Repeat PIN"
                  className="bg-background/50 font-mono tracking-widest text-center pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSavePin()}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleSavePin}
              disabled={savingPin || pinForm.newPin.length < 4}
              className="w-full"
            >
              {savingPin ? "Saving…" : "Set / Update PIN"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
