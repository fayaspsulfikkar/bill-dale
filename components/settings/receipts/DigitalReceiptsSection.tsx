"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Smartphone, Mail, MessageCircle, QrCode, FileDown } from "lucide-react";
import type { ReceiptSettingsSnapshot } from "./receipt-types";
import { RECEIPT_PLACEHOLDERS, CHAR_LIMITS } from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
}

function ToggleRow({ label, desc, value, onChange, icon }: { label: string; desc: string; value: boolean; onChange: () => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-2">
        {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-primary" : "bg-muted"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function DigitalReceiptsSection({ form, u }: Props) {
  return (
    <div className="space-y-4">
      {/* Channel Toggles */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-primary" /> Digital Receipt Channels
          </CardTitle>
          <CardDescription>Enable digital receipt delivery methods.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="SMS Receipt"
            desc="Send receipt summary via SMS to customer's phone."
            value={form.receipt_sms_enabled || false}
            onChange={() => u({ receipt_sms_enabled: !form.receipt_sms_enabled })}
            icon={<MessageCircle className="w-4 h-4 text-green-500" />}
          />
          <ToggleRow
            label="Email Receipt"
            desc="Send a detailed receipt via email."
            value={form.receipt_email_enabled || false}
            onChange={() => u({ receipt_email_enabled: !form.receipt_email_enabled })}
            icon={<Mail className="w-4 h-4 text-blue-500" />}
          />
          <ToggleRow
            label="WhatsApp Receipt"
            desc="Send receipt via WhatsApp message."
            value={form.receipt_whatsapp_enabled || false}
            onChange={() => u({ receipt_whatsapp_enabled: !form.receipt_whatsapp_enabled })}
            icon={<MessageCircle className="w-4 h-4 text-emerald-500" />}
          />
          <ToggleRow
            label="QR-based Digital Receipt"
            desc="Print a QR code linking to a digital receipt page."
            value={form.receipt_qr_digital_link || false}
            onChange={() => u({ receipt_qr_digital_link: !form.receipt_qr_digital_link })}
            icon={<QrCode className="w-4 h-4 text-purple-500" />}
          />
          <ToggleRow
            label="PDF Download"
            desc="Allow customers to download receipt as PDF."
            value={form.receipt_pdf_download || false}
            onChange={() => u({ receipt_pdf_download: !form.receipt_pdf_download })}
            icon={<FileDown className="w-4 h-4 text-orange-500" />}
          />

          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs text-blue-600 dark:text-blue-400">
            <strong>Note:</strong> Digital receipt delivery requires external provider integration (Twilio, SendGrid, etc.). Enable these toggles to configure templates — delivery endpoints can be connected later.
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      {(form.receipt_email_enabled || form.receipt_sms_enabled || form.receipt_whatsapp_enabled) && (
        <Card className="bg-card/50 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4 text-primary" /> Message Templates
            </CardTitle>
            <CardDescription>
              Customize templates for each channel. Use placeholders like {"{store_name}"} and {"{total_amount}"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Placeholder reference */}
            <div className="flex flex-wrap gap-1.5">
              {RECEIPT_PLACEHOLDERS.map(ph => (
                <span
                  key={ph.key}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/20 font-mono"
                >
                  {ph.key}
                </span>
              ))}
            </div>

            {form.receipt_email_enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" /> Email Subject
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(form.receipt_email_subject || "").length}/{CHAR_LIMITS.receipt_email_subject}
                  </span>
                </div>
                <input
                  type="text"
                  value={form.receipt_email_subject || ""}
                  onChange={(e) => u({ receipt_email_subject: e.target.value })}
                  placeholder="Your receipt from {store_name}"
                  maxLength={CHAR_LIMITS.receipt_email_subject}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            {form.receipt_sms_enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-green-500" /> SMS Template
                  </Label>
                  <span className={`text-[10px] font-mono ${
                    (form.receipt_sms_template || "").length >= CHAR_LIMITS.receipt_sms_template ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {(form.receipt_sms_template || "").length}/{CHAR_LIMITS.receipt_sms_template}
                  </span>
                </div>
                <textarea
                  value={form.receipt_sms_template || ""}
                  onChange={(e) => u({ receipt_sms_template: e.target.value })}
                  placeholder="Thank you for shopping at {store_name}! Total: {total_amount}"
                  rows={2}
                  maxLength={CHAR_LIMITS.receipt_sms_template}
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-[10px] text-muted-foreground">
                  Standard SMS limit: 160 characters. Longer messages may be split.
                </p>
              </div>
            )}

            {form.receipt_whatsapp_enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Template
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(form.receipt_whatsapp_template || "").length}/{CHAR_LIMITS.receipt_whatsapp_template}
                  </span>
                </div>
                <textarea
                  value={form.receipt_whatsapp_template || ""}
                  onChange={(e) => u({ receipt_whatsapp_template: e.target.value })}
                  placeholder="Hi {customer_name}! Here's your receipt from {store_name}."
                  rows={3}
                  maxLength={CHAR_LIMITS.receipt_whatsapp_template}
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
