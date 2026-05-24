"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users2, Heart, Gift, Wallet, RefreshCw } from "lucide-react";
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

export default function CustomersTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Loyalty & Rewards Engine</CardTitle>
              <CardDescription className="text-xs">Configure how customers earn and spend points</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => u({ loyalty_program_enabled: !form.loyalty_program_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.loyalty_program_enabled ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.loyalty_program_enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className={`space-y-6 ${!form.loyalty_program_enabled ? "opacity-40 pointer-events-none" : ""}`}>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4 text-muted-foreground" /> Earning Rate
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Points earned per 1 {form.currency_code ?? 'currency'}</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.loyalty_points_per_currency || 1}
                  onChange={(e) => u({ loyalty_points_per_currency: parseFloat(e.target.value) || 0 })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" /> Min Redemption
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Minimum points required before redemption</p>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.loyalty_min_redemption_points || 100}
                  onChange={(e) => u({ loyalty_min_redemption_points: parseInt(e.target.value, 10) || 0 })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-4">
              <ToggleRow
                label="Store Credits"
                desc="Allow customers to store cash balances and refunds as digital credits."
                value={form.loyalty_enable_store_credits ?? true}
                onChange={() => u({ loyalty_enable_store_credits: !form.loyalty_enable_store_credits })}
              />

              <ToggleRow
                label="Referral Program"
                desc="Generate unique referral codes for customers to earn bonus points."
                value={form.loyalty_enable_referrals ?? false}
                onChange={() => u({ loyalty_enable_referrals: !form.loyalty_enable_referrals })}
              />
            </div>

          </div>
        </CardContent>
      </Card>

    </div>
  );
}
