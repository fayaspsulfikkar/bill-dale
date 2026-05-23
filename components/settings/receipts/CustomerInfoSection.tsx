"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Shield } from "lucide-react";
import type { ReceiptSettingsSnapshot } from "./receipt-types";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
}

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

export default function CustomerInfoSection({ form, u }: Props) {
  return (
    <div className="space-y-4">
      {/* Customer Fields */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-primary" /> Customer Information
          </CardTitle>
          <CardDescription>Control which customer details are printed on the receipt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Customer Name"
            desc="Print the customer's name on the receipt."
            value={form.receipt_show_customer_name ?? true}
            onChange={() => u({ receipt_show_customer_name: !(form.receipt_show_customer_name ?? true) })}
          />
          <ToggleRow
            label="Phone Number"
            desc="Print the customer's phone number."
            value={form.receipt_show_customer_phone || false}
            onChange={() => u({ receipt_show_customer_phone: !form.receipt_show_customer_phone })}
          />
          <ToggleRow
            label="Loyalty ID"
            desc="Print the customer's loyalty program ID."
            value={form.receipt_show_loyalty_id || false}
            onChange={() => u({ receipt_show_loyalty_id: !form.receipt_show_loyalty_id })}
          />
          <ToggleRow
            label="Loyalty Points"
            desc="Show earned / remaining loyalty points."
            value={form.receipt_show_loyalty_points || false}
            onChange={() => u({ receipt_show_loyalty_points: !form.receipt_show_loyalty_points })}
          />
          <ToggleRow
            label="Membership Tier"
            desc="Display the customer's tier (Gold, Silver, etc)."
            value={form.receipt_show_membership_tier || false}
            onChange={() => u({ receipt_show_membership_tier: !form.receipt_show_membership_tier })}
          />
          <ToggleRow
            label="Customer Notes"
            desc="Print any notes associated with the customer."
            value={form.receipt_show_customer_notes || false}
            onChange={() => u({ receipt_show_customer_notes: !form.receipt_show_customer_notes })}
          />
        </CardContent>
      </Card>

      {/* Privacy Controls */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" /> Privacy Controls
          </CardTitle>
          <CardDescription>Protect customer data on printed receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Mask Phone Number"
            desc="Display as +91 98*** **210 to protect privacy."
            value={form.receipt_mask_customer_phone || false}
            onChange={() => u({ receipt_mask_customer_phone: !form.receipt_mask_customer_phone })}
          />
          <ToggleRow
            label="Hide on Duplicate Copies"
            desc="Remove customer details from duplicate / reprint copies."
            value={form.receipt_hide_customer_on_duplicate || false}
            onChange={() => u({ receipt_hide_customer_on_duplicate: !form.receipt_hide_customer_on_duplicate })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
