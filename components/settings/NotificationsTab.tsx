"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

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

export default function NotificationsTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Notification Providers</CardTitle>
              <CardDescription className="text-xs">Configure the services used to deliver alerts and digital receipts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email Provider
              </Label>
              <ChipSelect
                value={form.notification_email_provider || 'smtp'}
                options={[
                  { label: "SMTP", value: 'smtp' },
                  { label: "SendGrid", value: 'sendgrid' },
                  { label: "Resend", value: 'resend' }
                ]}
                onChange={(val) => u({ notification_email_provider: val as any })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" /> WhatsApp Provider
              </Label>
              <ChipSelect
                value={form.notification_whatsapp_provider || 'meta'}
                options={[
                  { label: "Meta Official", value: 'meta' },
                  { label: "Twilio", value: 'twilio' }
                ]}
                onChange={(val) => u({ notification_whatsapp_provider: val as any })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" /> SMS Provider
              </Label>
              <ChipSelect
                value={form.notification_sms_provider || 'msg91'}
                options={[
                  { label: "MSG91", value: 'msg91' },
                  { label: "Twilio", value: 'twilio' }
                ]}
                onChange={(val) => u({ notification_sms_provider: val as any })}
              />
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-sm text-muted-foreground">
            API Keys for these services must be configured securely via the environment variables or the secure credential manager.
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
