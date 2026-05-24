"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ChevronRight, Settings2, FileText, Clock, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee",       flag: "🇮🇳" },
  { code: "USD", symbol: "$",     name: "US Dollar",          flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro",               flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound",      flag: "🇬🇧" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen",       flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan",       flag: "🇨🇳" },
  { code: "SGD", symbol: "S$",    name: "Singapore Dollar",   flag: "🇸🇬" },
  { code: "MYR", symbol: "RM",    name: "Malaysian Ringgit",  flag: "🇲🇾" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka",  flag: "🇧🇩" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee",   flag: "🇵🇰" },
  { code: "LKR", symbol: "₨", name: "Sri Lankan Rupee",  flag: "🇱🇰" },
  { code: "NPR", symbol: "₨", name: "Nepalese Rupee",    flag: "🇳🇵" },
  { code: "AUD", symbol: "A$",    name: "Australian Dollar",  flag: "🇦🇺" },
  { code: "CAD", symbol: "C$",    name: "Canadian Dollar",   flag: "🇨🇦" },
  { code: "CHF", symbol: "Fr",    name: "Swiss Franc",        flag: "🇨🇭" },
  { code: "KRW", symbol: "₩", name: "South Korean Won",  flag: "🇰🇷" },
  { code: "THB", symbol: "฿", name: "Thai Baht",         flag: "🇹🇭" },
  { code: "IDR", symbol: "Rp",    name: "Indonesian Rupiah", flag: "🇮🇩" },
];

const ALL_DAYS = [
  { id: "mon", label: "Mon" }, { id: "tue", label: "Tue" }, { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" }, { id: "fri", label: "Fri" }, { id: "sat", label: "Sat" }, { id: "sun", label: "Sun" },
];

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

export default function GeneralTab() {
  const router = useRouter();
  const { form, u, saving, saved } = useBusinessSettings();

  return (
    <div className="space-y-6 relative">
      <h2 className="text-lg font-semibold">General</h2>

      {/* ── Card 1: Business Profile ── */}
      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => router.push("/dashboard/settings/business")} className="text-left w-full">
        <Card className="bg-card/50 border-border/50 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Business Profile</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Update shop name, GST, bank details, address, and invoice prefix.</CardDescription>
          </CardHeader>
        </Card>
      </motion.button>

      {/* ── Card 2: Currency & Formatting ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" /> Currency & Formatting</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <select
                value={form.currency_code}
                onChange={(e) => {
                  const c = CURRENCIES.find(c => c.code === e.target.value);
                  if (c) u({ currency_code: c.code, currency_symbol: c.symbol, decimal_places: c.code === "JPY" || c.code === "KRW" ? 0 : 2 });
                }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name} ({c.symbol})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Decimal Places</Label>
              <ChipSelect value={form.decimal_places} options={[{ label: "0", value: 0 }, { label: "2", value: 2 }, { label: "3", value: 3 }]} onChange={v => u({ decimal_places: v })} />
              <p className="text-xs text-muted-foreground">e.g. JPY uses 0, INR/USD uses 2</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date Format</Label>
              <ChipSelect value={form.date_format} options={[
                { label: "DD/MM/YYYY", value: "DD/MM/YYYY" as const },
                { label: "MM/DD/YYYY", value: "MM/DD/YYYY" as const },
                { label: "YYYY-MM-DD", value: "YYYY-MM-DD" as const },
              ]} onChange={v => u({ date_format: v })} />
            </div>
            <div className="space-y-2">
              <Label>Time Format</Label>
              <ChipSelect value={form.time_format} options={[
                { label: "12-hour", value: "12h" as const },
                { label: "24-hour", value: "24h" as const },
              ]} onChange={v => u({ time_format: v })} />
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="Tax-Inclusive Pricing Mode" desc="Assume entered product prices already include GST." value={form.tax_inclusive_pricing} onChange={() => u({ tax_inclusive_pricing: !form.tax_inclusive_pricing })} />
            <ToggleRow label="Multi-Currency Support (Preview)" desc="Prepare the POS for multi-currency transactions." value={false} onChange={() => {}} />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Tax & Invoicing ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Tax & Invoicing</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default GST Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={form.default_gst_rate} onChange={e => u({ default_gst_rate: Number(e.target.value) })} className="max-w-[120px]" />
              <p className="text-xs text-muted-foreground">Pre-filled when adding new products.</p>
            </div>
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input value={form.invoice_prefix} onChange={e => u({ invoice_prefix: e.target.value })} placeholder="e.g. INV-, BD-" className="max-w-[160px]" maxLength={10} />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Starting Invoice Number</Label>
              <Input type="number" min="1" value={form.invoice_start_number} onChange={e => u({ invoice_start_number: Number(e.target.value) })} className="max-w-[120px]" />
            </div>
            <div className="space-y-2">
              <Label>Number Padding</Label>
              <ChipSelect value={form.invoice_number_padding} options={[
                { label: "1 → 1", value: 1 }, { label: "01 → 2", value: 2 },
                { label: "001 → 3", value: 3 }, { label: "0001 → 4", value: 4 },
              ]} onChange={v => u({ invoice_number_padding: v })} />
              <p className="text-xs text-muted-foreground">Preview: {form.invoice_prefix}{String(form.invoice_start_number).padStart(form.invoice_number_padding, '0')}</p>
            </div>
            <div className="space-y-2">
              <Label>Invoice Reset Cycle</Label>
              <ChipSelect value={form.invoice_reset_cycle} options={[
                { label: "Never", value: "never" as const },
                { label: "Monthly", value: "monthly" as const },
                { label: "Yearly", value: "yearly" as const },
              ]} onChange={v => u({ invoice_reset_cycle: v })} />
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="Return Invoice Templates" desc="Use dedicated templates for refunds and credit notes." value={form.return_invoice_templates} onChange={() => u({ return_invoice_templates: !form.return_invoice_templates })} />
            <ToggleRow label="GST Auto-Classification" desc="Automatically assign HSN codes based on product category." value={false} onChange={() => {}} />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: POS Behavior ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" /> POS Behavior</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Payment Method</Label>
              <ChipSelect value={form.default_payment_method} options={[
                { label: "💵 Cash", value: "cash" as const },
                { label: "💳 Card", value: "card" as const },
                { label: "📱 UPI", value: "upi" as const },
              ]} onChange={v => u({ default_payment_method: v })} />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Alert Threshold</Label>
              <Input type="number" min="0" value={form.low_stock_threshold} onChange={e => u({ low_stock_threshold: Number(e.target.value) })} className="max-w-[120px]" />
              <p className="text-xs text-muted-foreground">Items below this quantity trigger alerts.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Staff Mode Default Timer</Label>
              <ChipSelect value={form.staff_mode_default_minutes} options={[
                { label: "5m", value: 5 }, { label: "10m", value: 10 }, { label: "20m", value: 20 },
                { label: "30m", value: 30 }, { label: "1hr", value: 60 },
              ]} onChange={v => u({ staff_mode_default_minutes: v })} />
              <p className="text-xs text-muted-foreground">Pre-selected unlock duration in PIN dialog.</p>
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="POS Quick Add Mode" desc="Clicking a product directly adds it to cart." value={form.pos_quick_add} onChange={() => u({ pos_quick_add: !form.pos_quick_add })} />
            <ToggleRow label="POS Sound Effects" desc="Play a beep when scanning or adding items." value={form.pos_sound_effects} onChange={() => u({ pos_sound_effects: !form.pos_sound_effects })} />
            <ToggleRow label="Auto Cart Recovery" desc="Restore abandoned carts if the POS is closed unexpectedly." value={form.pos_auto_cart_recovery} onChange={() => u({ pos_auto_cart_recovery: !form.pos_auto_cart_recovery })} />
            <ToggleRow label="Auto Print Receipts" desc="Automatically fire a print job after successful checkout." value={form.pos_auto_print_receipt} onChange={() => u({ pos_auto_print_receipt: !form.pos_auto_print_receipt })} />
            <ToggleRow label="Barcode Autofocus" desc="Keep the global search bar focused for rapid scanning." value={form.pos_barcode_autofocus} onChange={() => u({ pos_barcode_autofocus: !form.pos_barcode_autofocus })} />
            <ToggleRow label="Session Persistence" desc="Keep the POS drawer state intact between reloads." value={form.pos_session_persistence} onChange={() => u({ pos_session_persistence: !form.pos_session_persistence })} />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 5: Business Hours & Notifications ── */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Business Hours & Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input type="time" value={form.business_hours_open} onChange={e => u({ business_hours_open: e.target.value })} className="max-w-[160px]" />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input type="time" value={form.business_hours_close} onChange={e => u({ business_hours_close: e.target.value })} className="max-w-[160px]" />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <select
                value={form.business_timezone}
                onChange={e => u({ business_timezone: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>System Language</Label>
              <select
                value={form.business_multi_language}
                onChange={e => u({ business_multi_language: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="en">English (US)</option>
                <option value="hi">Hindi (India)</option>
                <option value="ar">Arabic</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map(d => {
                const active = form.business_days.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => u({ business_days: active ? form.business_days.filter(x => x !== d.id) : [...form.business_days, d.id] })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-border/50">
            <ToggleRow label="Low Stock Notifications" desc="Alert when items fall below threshold." value={form.notify_low_stock} onChange={() => u({ notify_low_stock: !form.notify_low_stock })} />
            <ToggleRow label="Daily Summary" desc="Receive a daily sales summary notification." value={form.notify_daily_summary} onChange={() => u({ notify_daily_summary: !form.notify_daily_summary })} />
            <ToggleRow label="Sync Failure Alerts" desc="Notify when data sync to cloud fails." value={form.notify_sync_failures} onChange={() => u({ notify_sync_failures: !form.notify_sync_failures })} />
          </div>
        </CardContent>
      </Card>

      {/* ── Auto-save toast ── */}
      <AnimatePresence>
        {(saving || saved) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-xl border ${
              saved
                ? "bg-green-500/10 border-green-500/30 text-green-500"
                : "bg-card/90 border-border/50 text-muted-foreground"
            }`}>
              {saved ? (
                <><Check className="w-4 h-4" /> Saved</>
              ) : (
                <><div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> Saving...</>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
