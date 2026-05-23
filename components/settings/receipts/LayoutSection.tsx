"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";
import type { ReceiptSettingsSnapshot, DividerStyle, LayoutMode, TextAlignment } from "./receipt-types";
import {
  FONT_SIZE_OPTIONS,
  DIVIDER_STYLE_OPTIONS,
  LAYOUT_MODE_OPTIONS,
  TEXT_ALIGNMENT_OPTIONS,
  LINE_SPACING_OPTIONS,
  PAPER_SIZE_OPTIONS,
  MARGIN_RANGE,
} from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
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

export default function LayoutSection({ form, u }: Props) {
  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="w-4 h-4 text-primary" /> Receipt Layout
          </CardTitle>
          <CardDescription>
            Control the layout, typography, and spacing of your receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paper Size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Paper Size</Label>
            <ChipSelect
              value={form.receipt_paper_size || "80mm"}
              options={PAPER_SIZE_OPTIONS}
              onChange={(v) => u({ receipt_paper_size: v })}
            />
            <p className="text-[10px] text-muted-foreground mt-2">
              80mm is standard for thermal printers. 58mm is compact. A4 is for standard document printers.
            </p>
          </div>

          {/* Layout Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Layout Mode</Label>
            <ChipSelect
              value={form.receipt_layout_mode || "detailed"}
              options={LAYOUT_MODE_OPTIONS}
              onChange={(v) => u({ receipt_layout_mode: v as LayoutMode })}
            />
            <p className="text-[10px] text-muted-foreground">
              {form.receipt_layout_mode === "compact"
                ? "Minimized spacing, smaller fonts, saves paper."
                : "Full spacing with all details visible."}
            </p>
          </div>

          <div className="border-t border-border/50 pt-4 space-y-5">
            {/* Font Size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Size</Label>
              <ChipSelect
                value={form.receipt_font_size || 9}
                options={FONT_SIZE_OPTIONS}
                onChange={(v) => u({ receipt_font_size: v })}
              />
            </div>

            {/* Line Spacing */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Line Spacing</Label>
              <ChipSelect
                value={form.receipt_line_spacing || 1.4}
                options={LINE_SPACING_OPTIONS}
                onChange={(v) => u({ receipt_line_spacing: v })}
              />
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Header Text Alignment</Label>
              <ChipSelect
                value={form.receipt_text_alignment || "left"}
                options={TEXT_ALIGNMENT_OPTIONS}
                onChange={(v) => u({ receipt_text_alignment: v as TextAlignment })}
              />
            </div>

            {/* Divider Style */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Section Divider Style</Label>
              <ChipSelect
                value={form.receipt_divider_style || "dashed"}
                options={DIVIDER_STYLE_OPTIONS}
                onChange={(v) => u({ receipt_divider_style: v as DividerStyle })}
              />
              {/* Divider preview */}
              <div className="pt-1">
                <div style={{
                  borderTopWidth: form.receipt_divider_style === "double" ? "3px" : "1px",
                  borderTopStyle: form.receipt_divider_style === "none" ? "none"
                    : form.receipt_divider_style === "double" ? "double"
                    : (form.receipt_divider_style as any) || "dashed",
                  borderTopColor: "#666",
                  width: "100%",
                }} />
              </div>
            </div>
          </div>

          {/* Margins */}
          <div className="border-t border-border/50 pt-4 space-y-4">
            <Label className="text-sm font-semibold">Margins</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Top Margin</Label>
                  <span className="text-xs font-mono text-muted-foreground">{form.receipt_margin_top || 6}mm</span>
                </div>
                <input
                  type="range"
                  min={MARGIN_RANGE.min}
                  max={MARGIN_RANGE.max}
                  step={MARGIN_RANGE.step}
                  value={form.receipt_margin_top || 6}
                  onChange={(e) => u({ receipt_margin_top: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Bottom Margin</Label>
                  <span className="text-xs font-mono text-muted-foreground">{form.receipt_margin_bottom || 6}mm</span>
                </div>
                <input
                  type="range"
                  min={MARGIN_RANGE.min}
                  max={MARGIN_RANGE.max}
                  step={MARGIN_RANGE.step}
                  value={form.receipt_margin_bottom || 6}
                  onChange={(e) => u({ receipt_margin_bottom: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>

          {/* Borders Toggle */}
          <div className="border-t border-border/50 pt-4">
            <ToggleRow
              label="Show Item Borders"
              desc="Add subtle borders between line items on the receipt."
              value={form.receipt_show_borders || false}
              onChange={() => u({ receipt_show_borders: !form.receipt_show_borders })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
