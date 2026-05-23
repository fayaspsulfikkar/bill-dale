"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Receipt, CreditCard } from "lucide-react";
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

export default function TaxPaymentSection({ form, u }: Props) {
  return (
    <div className="space-y-4">
      {/* Tax Display */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-4 h-4 text-primary" /> Tax Display
          </CardTitle>
          <CardDescription>Configure how tax information appears on the receipt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="GST Breakdown"
            desc="Show total GST amount on the receipt."
            value={form.receipt_show_gst ?? true}
            onChange={() => u({ receipt_show_gst: !(form.receipt_show_gst ?? true) })}
          />
          <ToggleRow
            label="CGST / SGST Split"
            desc="Show Central and State GST separately (intra-state)."
            value={form.receipt_show_cgst_sgst || false}
            onChange={() => u({ receipt_show_cgst_sgst: !form.receipt_show_cgst_sgst })}
          />
          <ToggleRow
            label="IGST"
            desc="Show Integrated GST for inter-state transactions."
            value={form.receipt_show_igst || false}
            onChange={() => u({ receipt_show_igst: !form.receipt_show_igst })}
          />
          <ToggleRow
            label="Taxable Value"
            desc="Show the pre-tax value of items."
            value={form.receipt_show_taxable_value || false}
            onChange={() => u({ receipt_show_taxable_value: !form.receipt_show_taxable_value })}
          />
          <ToggleRow
            label="Discount Breakdown"
            desc="Show individual discounts applied to items."
            value={form.receipt_show_discount_breakdown ?? true}
            onChange={() => u({ receipt_show_discount_breakdown: !(form.receipt_show_discount_breakdown ?? true) })}
          />
          <ToggleRow
            label="Coupon Display"
            desc="Show coupon code and savings on the receipt."
            value={form.receipt_show_coupon ?? true}
            onChange={() => u({ receipt_show_coupon: !(form.receipt_show_coupon ?? true) })}
          />
          <ToggleRow
            label="You Saved Amount"
            desc="Display total savings prominently."
            value={form.receipt_show_saved_amount || false}
            onChange={() => u({ receipt_show_saved_amount: !form.receipt_show_saved_amount })}
          />
          <ToggleRow
            label="Round-off Values"
            desc="Show rounding adjustments in totals."
            value={form.receipt_show_round_off || false}
            onChange={() => u({ receipt_show_round_off: !form.receipt_show_round_off })}
          />
        </CardContent>
      </Card>

      {/* Payment Display */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4 text-primary" /> Payment Display
          </CardTitle>
          <CardDescription>Configure payment information visibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Payment Method"
            desc="Show whether payment was by Cash, Card, or UPI."
            value={form.receipt_show_payment_method ?? true}
            onChange={() => u({ receipt_show_payment_method: !(form.receipt_show_payment_method ?? true) })}
          />
          <ToggleRow
            label="Change Returned"
            desc="Show amount tendered and change due for cash payments."
            value={form.receipt_show_change_returned ?? true}
            onChange={() => u({ receipt_show_change_returned: !(form.receipt_show_change_returned ?? true) })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
