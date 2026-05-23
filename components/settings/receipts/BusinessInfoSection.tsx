"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Eye, EyeOff } from "lucide-react";
import type { ReceiptSettingsSnapshot } from "./receipt-types";
import { CHAR_LIMITS } from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
}

const FIELDS: {
  key: keyof ReceiptSettingsSnapshot;
  toggleKey: keyof ReceiptSettingsSnapshot;
  label: string;
  placeholder: string;
  maxLength?: number;
  mono?: boolean;
  type?: string;
}[] = [
  { key: "receipt_store_name", toggleKey: "receipt_show_store_name", label: "Store Name", placeholder: "FashionHub", maxLength: CHAR_LIMITS.receipt_store_name },
  { key: "receipt_legal_name", toggleKey: "receipt_show_legal_name", label: "Legal Business Name", placeholder: "FashionHub Pvt Ltd", maxLength: CHAR_LIMITS.receipt_legal_name },
  { key: "receipt_address", toggleKey: "receipt_show_address", label: "Address", placeholder: "123 MG Road, Bangalore 560001", maxLength: CHAR_LIMITS.receipt_address },
  { key: "receipt_phone", toggleKey: "receipt_show_phone", label: "Phone Number", placeholder: "+91 98765 43210", maxLength: CHAR_LIMITS.receipt_phone, type: "tel" },
  { key: "receipt_email", toggleKey: "receipt_show_email", label: "Email", placeholder: "store@fashionhub.in", maxLength: CHAR_LIMITS.receipt_email, type: "email" },
  { key: "receipt_website", toggleKey: "receipt_show_website", label: "Website URL", placeholder: "https://fashionhub.in", maxLength: CHAR_LIMITS.receipt_website, type: "url" },
  { key: "receipt_gstin", toggleKey: "receipt_show_gstin", label: "GSTIN", placeholder: "29AAAAA0000A1Z5", maxLength: CHAR_LIMITS.receipt_gstin, mono: true },
  { key: "receipt_fssai", toggleKey: "receipt_show_fssai", label: "FSSAI License", placeholder: "12345678901234", maxLength: CHAR_LIMITS.receipt_fssai, mono: true },
  { key: "receipt_branch_name", toggleKey: "receipt_show_branch_name", label: "Branch Name", placeholder: "Main Store", maxLength: CHAR_LIMITS.receipt_branch_name },
  { key: "receipt_support_contact", toggleKey: "receipt_show_support_contact", label: "Support Contact", placeholder: "1800-123-4567", maxLength: CHAR_LIMITS.receipt_support_contact },
];

function formatGSTIN(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
}

export default function BusinessInfoSection({ form, u }: Props) {
  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="w-4 h-4 text-primary" /> Business Information
          </CardTitle>
          <CardDescription>
            Configure which business details appear on your receipts. Toggle visibility for each field.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            {FIELDS.map(({ key, toggleKey, label, placeholder, maxLength, mono, type }) => {
              const value = (form[key] as string) || "";
              const visible = (form[toggleKey] as boolean) ?? true;

              const handleChange = (val: string) => {
                let processedVal = val;
                if (key === "receipt_gstin") {
                  processedVal = formatGSTIN(val);
                }
                u({ [key]: processedVal } as any);
              };

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{label}</Label>
                    <button
                      type="button"
                      onClick={() => u({ [toggleKey]: !visible } as any)}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors ${
                        visible
                          ? "text-primary bg-primary/5 hover:bg-primary/10"
                          : "text-muted-foreground bg-muted/30 hover:bg-muted/50"
                      }`}
                      title={visible ? "Visible on receipt" : "Hidden on receipt"}
                    >
                      {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {visible ? "Show" : "Hide"}
                    </button>
                  </div>
                  <Input
                    type={type || "text"}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`bg-background/50 ${mono ? "font-mono text-sm" : ""} ${
                      !visible ? "opacity-50" : ""
                    }`}
                  />
                  {maxLength && value.length > maxLength * 0.8 && (
                    <p className={`text-[10px] text-right ${
                      value.length >= maxLength ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {value.length}/{maxLength}
                    </p>
                  )}
                  {key === "receipt_gstin" && value && value.length > 0 && value.length !== 15 && (
                    <p className="text-[10px] text-amber-500">GSTIN must be 15 characters</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
