"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Store } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function BusinessSettingsPage() {
  const { businessId } = useAuthStore();
  const business = useLiveQuery(
    () => businessId ? db.businesses.get(businessId) : undefined,
    [businessId]
  );

  const [form, setForm] = useState({
    name: "", owner_name: "", mobile: "", email: "",
    gstin: "", pan: "", address: "", state: "", pincode: "",
    invoice_prefix: "", bank_name: "", account_number: "", ifsc: "", upi_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // PIN management
  const [pinForm, setPinForm] = useState({ newPin: "", confirmPin: "" });
  const [pinError, setPinError] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  const handleSavePin = async () => {
    if (pinForm.newPin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (pinForm.newPin !== pinForm.confirmPin) { setPinError("PINs do not match."); return; }
    if (!businessId) return;
    setPinError("");
    setSavingPin(true);
    await db.businesses.update(businessId, { admin_pin: pinForm.newPin } as never);
    if (supabase) await supabase.from("businesses").update({ admin_pin: pinForm.newPin }).eq("id", businessId);
    setSavingPin(false);
    setPinSaved(true);
    setPinForm({ newPin: "", confirmPin: "" });
    setTimeout(() => setPinSaved(false), 3000);
  };

  useEffect(() => {
    if (business) setForm({ ...form, ...business });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    await db.businesses.update(businessId, form);
    if (supabase) await supabase.from("businesses").update(form).eq("id", businessId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    className: "bg-background/50",
  });

  return (
    <RoleGuard adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
          <p className="text-muted-foreground">Edit your business details used on invoices and receipts.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Store className="w-4 h-4 text-primary" />Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label>Shop Name</Label><Input {...f("name")} placeholder="Shop Name" /></div>
              <div className="space-y-1.5"><Label>Owner Name</Label><Input {...f("owner_name")} placeholder="Owner Name" /></div>
              <div className="space-y-1.5"><Label>Mobile</Label><Input {...f("mobile")} placeholder="+91..." /></div>
              <div className="space-y-1.5 col-span-2"><Label>Business Email</Label><Input {...f("email")} type="email" placeholder="shop@email.com" /></div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">GST & Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>GSTIN</Label><Input {...f("gstin")} placeholder="22AAAAA0000A1Z5" className="bg-background/50 font-mono text-sm" /></div>
              <div className="space-y-1.5"><Label>PAN</Label><Input {...f("pan")} placeholder="AAAAA0000A" className="bg-background/50 font-mono text-sm" /></div>
              <div className="space-y-1.5"><Label>Invoice Prefix</Label><Input {...f("invoice_prefix")} placeholder="INV" className="bg-background/50 font-mono" /></div>
              <div className="space-y-1.5"><Label>Pincode</Label><Input {...f("pincode")} placeholder="600001" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input {...f("address")} placeholder="Full address" /></div>
              <div className="space-y-1.5 col-span-2"><Label>State</Label><Input {...f("state")} placeholder="Tamil Nadu" /></div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader><CardTitle className="text-base">Bank & UPI</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Bank Name</Label><Input {...f("bank_name")} placeholder="HDFC Bank" /></div>
              <div className="space-y-1.5"><Label>UPI ID</Label><Input {...f("upi_id")} placeholder="shop@upi" /></div>
              <div className="space-y-1.5"><Label>Account Number</Label><Input {...f("account_number")} placeholder="XXXX XXXX" className="bg-background/50 font-mono" /></div>
              <div className="space-y-1.5"><Label>IFSC</Label><Input {...f("ifsc")} placeholder="HDFC0001234" className="bg-background/50 font-mono" /></div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">🔐 Staff Mode PIN</CardTitle>
              <CardDescription>
                This PIN is required to exit Staff Mode or access locked sections.
                Must be 4–8 digits. Keep it private.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>New PIN (4–8 digits)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "") })}
                  placeholder="••••"
                  className="bg-background/50 font-mono tracking-widest text-center"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, "") })}
                  placeholder="••••"
                  className="bg-background/50 font-mono tracking-widest text-center"
                />
              </div>
              {pinError && <p className="col-span-2 text-destructive text-xs">{pinError}</p>}
              {pinSaved && <p className="col-span-2 text-green-400 text-xs">✅ PIN updated successfully!</p>}
              <div className="col-span-2">
                <Button type="button" variant="outline" onClick={handleSavePin} disabled={savingPin} className="w-full max-w-xs">
                  {savingPin ? "Saving…" : "Set / Update PIN"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving} className="w-full max-w-xs h-11 font-semibold">
            {saving ? "Saving..." : saved ? "✅ Saved!" : "Save Changes"}
          </Button>
        </form>
      </div>
    </RoleGuard>
  );
}

