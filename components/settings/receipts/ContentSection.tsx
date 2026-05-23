"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText, Hash } from "lucide-react";
import type { ReceiptSettingsSnapshot } from "./receipt-types";
import { RECEIPT_PLACEHOLDERS, CHAR_LIMITS } from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
}

const FIELDS: {
  key: keyof ReceiptSettingsSnapshot;
  label: string;
  placeholder: string;
  rows: number;
  maxLength: number;
}[] = [
  { key: "receipt_header", label: "Header Message", placeholder: "Welcome to our store!", rows: 3, maxLength: CHAR_LIMITS.receipt_header },
  { key: "receipt_footer", label: "Footer Message", placeholder: "Thank you! Visit again.", rows: 3, maxLength: CHAR_LIMITS.receipt_footer },
  { key: "receipt_thank_you_msg", label: "Thank You Message", placeholder: "Thank you for your purchase!", rows: 2, maxLength: CHAR_LIMITS.receipt_thank_you_msg },
  { key: "receipt_promo_msg", label: "Promotional Message", placeholder: "Get 20% off on your next visit!", rows: 2, maxLength: CHAR_LIMITS.receipt_promo_msg },
  { key: "receipt_seasonal_msg", label: "Seasonal Message", placeholder: "Happy Diwali! Special offers inside.", rows: 2, maxLength: CHAR_LIMITS.receipt_seasonal_msg },
  { key: "receipt_return_policy", label: "Return Policy", placeholder: "Returns accepted within 7 days with original receipt.", rows: 3, maxLength: CHAR_LIMITS.receipt_return_policy },
  { key: "receipt_exchange_policy", label: "Exchange Policy", placeholder: "Exchange within 15 days. Conditions apply.", rows: 3, maxLength: CHAR_LIMITS.receipt_exchange_policy },
];

export default function ContentSection({ form, u }: Props) {
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const insertPlaceholder = (key: string, placeholder: string) => {
    const textarea = textareaRefs.current[key];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = (form[key as keyof ReceiptSettingsSnapshot] as string) || "";
    const before = current.slice(0, start);
    const after = current.slice(end);
    const newVal = before + placeholder + after;

    u({ [key]: newVal } as any);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = start + placeholder.length;
        textarea.selectionEnd = start + placeholder.length;
        textarea.focus();
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" /> Receipt Content
          </CardTitle>
          <CardDescription>
            Customize messages displayed on your receipts. Use placeholders to insert dynamic content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Placeholder Reference */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
              <Hash className="w-3 h-3" /> Available Placeholders
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RECEIPT_PLACEHOLDERS.map(ph => (
                <span
                  key={ph.key}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/20 font-mono"
                  title={`Example: ${ph.example}`}
                >
                  {ph.key}
                </span>
              ))}
            </div>
          </div>

          {FIELDS.map(({ key, label, placeholder, rows, maxLength }) => {
            const value = (form[key] as string) || "";
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{label}</Label>
                  <span className={`text-[10px] font-mono ${
                    value.length >= maxLength ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {value.length}/{maxLength}
                  </span>
                </div>
                <textarea
                  ref={(el) => { textareaRefs.current[key] = el; }}
                  value={value}
                  onChange={(e) => u({ [key]: e.target.value } as any)}
                  placeholder={placeholder}
                  rows={rows}
                  maxLength={maxLength}
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                />
                {/* Inline placeholder buttons */}
                <div className="flex flex-wrap gap-1">
                  {RECEIPT_PLACEHOLDERS.map(ph => (
                    <button
                      key={ph.key}
                      type="button"
                      onClick={() => insertPlaceholder(key, ph.key)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/30"
                      title={`Insert ${ph.label} — e.g. "${ph.example}"`}
                    >
                      + {ph.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
