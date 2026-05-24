"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CreditCard, Split, HandCoins, RefreshCcw } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

function ToggleRow({ label, desc, value, onChange, disabled = false }: { label: string; desc: string; value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
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

export default function PaymentsTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Payments & Checkout Logic</CardTitle>
              <CardDescription className="text-xs">Configure how transactions are handled at the register</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="space-y-6">
            <ToggleRow
              label="Split Payments"
              desc="Allow customers to pay a single invoice using multiple methods (e.g. Cash + Card)."
              value={form.payment_allow_split ?? true}
              onChange={() => u({ payment_allow_split: !form.payment_allow_split })}
            />
            
            <ToggleRow
              label="Tipping Engine"
              desc="Prompt for tip percentages (e.g. 10%, 15%, 20%) before finalizing card payments."
              value={form.payment_allow_tips ?? false}
              onChange={() => u({ payment_allow_tips: !form.payment_allow_tips })}
            />

            <ToggleRow
              label="Automated Refunds"
              desc="Automatically log refunds back to the original payment method without manager override."
              value={form.payment_auto_refunds ?? false}
              onChange={() => u({ payment_auto_refunds: !form.payment_auto_refunds })}
            />
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
