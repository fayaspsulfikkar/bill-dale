"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PackageOpen, Tags, Barcode, CalendarX, Layers, Zap } from "lucide-react";
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

function ChipSelect<T extends string | number>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            value === o.value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function InventoryTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      {/* Rules */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <PackageOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Advanced Inventory Rules</CardTitle>
              <CardDescription className="text-xs">Configure expiry, batches, and automation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="space-y-6 border-b border-border/40 pb-6">
            <ToggleRow
              label="Expiry Tracking (FEFO)"
              desc="Track expiration dates. Prioritizes First-Expired-First-Out for stock depletion."
              value={form.inventory_expiry_tracking ?? false}
              onChange={() => u({ inventory_expiry_tracking: !form.inventory_expiry_tracking })}
            />
            
            <ToggleRow
              label="Batch Tracking"
              desc="Group incoming stock into batches for recall management and granular cost-basis analysis."
              value={form.inventory_batch_tracking ?? false}
              onChange={() => u({ inventory_batch_tracking: !form.inventory_batch_tracking })}
            />

            <ToggleRow
              label="Auto-Reorder Automation"
              desc="Automatically generate PO drafts when stock levels fall below the minimum threshold."
              value={form.inventory_auto_reorder ?? false}
              onChange={() => u({ inventory_auto_reorder: !form.inventory_auto_reorder })}
            />
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-sm font-semibold flex items-center gap-2 mb-1">
                <Tags className="w-4 h-4 text-muted-foreground" /> SKU Generation Format
              </Label>
              <p className="text-xs text-muted-foreground mb-3">Format used when auto-generating new SKUs. Use "0" for padding.</p>
              <Input
                value={form.inventory_sku_generation_format || "PREFIX-0000"}
                onChange={(e) => u({ inventory_sku_generation_format: e.target.value })}
                className="max-w-md font-mono text-sm"
                placeholder="e.g. ITEM-0000"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold flex items-center gap-2 mb-1">
                <Barcode className="w-4 h-4 text-muted-foreground" /> Default Barcode Generation
              </Label>
              <p className="text-xs text-muted-foreground mb-3">Standard format for internally printed product labels.</p>
              <ChipSelect
                value={form.inventory_barcode_generation || 'ean13'}
                options={[
                  { label: "EAN-13", value: 'ean13' },
                  { label: "Code 128", value: 'code128' },
                  { label: "QR Code", value: 'qr' }
                ]}
                onChange={(val) => u({ inventory_barcode_generation: val as any })}
              />
            </div>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
