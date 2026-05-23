"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Printer, Zap, Moon } from "lucide-react";
import type { ReceiptSettingsSnapshot } from "./receipt-types";
import { COPY_OPTIONS } from "./receipt-constants";

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

function ChipSelect<T extends string | number>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
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

export default function PrintOptionsSection({ form, u }: Props) {
  return (
    <div className="space-y-4">
      {/* Auto Print & Copies */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Printer className="w-4 h-4 text-primary" /> Print Behavior
          </CardTitle>
          <CardDescription>Configure how receipts are printed after billing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ToggleRow
            label="Auto Print After Billing"
            desc="Automatically trigger print when a sale is completed."
            value={form.receipt_auto_print || false}
            onChange={() => u({ receipt_auto_print: !form.receipt_auto_print })}
          />
          <ToggleRow
            label="Duplicate Receipt"
            desc="Print a second copy labeled 'DUPLICATE' for records."
            value={form.receipt_duplicate_print || false}
            onChange={() => u({ receipt_duplicate_print: !form.receipt_duplicate_print })}
          />
          <ToggleRow
            label="Silent Printing"
            desc="Skip print dialog and send directly to default printer."
            value={form.receipt_silent_print || false}
            onChange={() => u({ receipt_silent_print: !form.receipt_silent_print })}
          />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of Copies</Label>
            <ChipSelect
              value={form.receipt_num_copies || 1}
              options={COPY_OPTIONS}
              onChange={(v) => u({ receipt_num_copies: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Thermal Optimization */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" /> Thermal Printer Optimization
          </CardTitle>
          <CardDescription>Fine-tune output for thermal receipt printers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Thermal Optimization"
            desc="Optimize layout, fonts, and contrast for thermal paper."
            value={form.receipt_thermal_optimization ?? true}
            onChange={() => u({ receipt_thermal_optimization: !(form.receipt_thermal_optimization ?? true) })}
          />
          <ToggleRow
            label="Ink-Saving Mode"
            desc="Reduce print density and remove decorative elements."
            value={form.receipt_ink_saving || false}
            onChange={() => u({ receipt_ink_saving: !form.receipt_ink_saving })}
          />

          {/* Ink-saving info callout */}
          {form.receipt_ink_saving && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <strong>Ink-Saving Mode Active:</strong> Logo, watermark, QR codes, and decorative dividers will be simplified or hidden during actual printing to extend thermal paper life.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dark Print Mode */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="w-4 h-4 text-primary" /> Print Contrast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Dark Print Mode"
            desc="Increase print density for better readability on faded paper."
            value={form.receipt_dark_mode || false}
            onChange={() => u({ receipt_dark_mode: !form.receipt_dark_mode })}
          />
          {form.receipt_dark_mode && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
              Dark mode increases thermal head intensity. This may reduce printer head lifespan with heavy use.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
