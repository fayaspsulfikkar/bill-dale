"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Moon, LayoutDashboard, Type } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${value ? "bg-primary" : "bg-muted"}`}>
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

export default function AppearanceTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Appearance & Branding</CardTitle>
              <CardDescription className="text-xs">Customize the look and feel of the POS dashboard</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Moon className="w-4 h-4 text-muted-foreground" /> Interface Theme
              </Label>
              <ChipSelect
                value={form.appearance_theme || 'system'}
                options={[
                  { label: "System Default", value: 'system' },
                  { label: "Light Mode", value: 'light' },
                  { label: "Dark Mode", value: 'dark' }
                ]}
                onChange={(val) => u({ appearance_theme: val as any })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" /> Accent Color
              </Label>
              <ChipSelect
                value={form.appearance_accent_color || 'blue'}
                options={[
                  { label: "Blue", value: 'blue' },
                  { label: "Zinc", value: 'zinc' },
                  { label: "Rose", value: 'rose' },
                  { label: "Green", value: 'green' },
                  { label: "Orange", value: 'orange' }
                ]}
                onChange={(val) => u({ appearance_accent_color: val as string })}
              />
            </div>
            
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard Layout Preference
              </Label>
              <ChipSelect
                value={form.appearance_dashboard_layout || 'standard'}
                options={[
                  { label: "Standard", value: 'standard' },
                  { label: "Dense (More Data)", value: 'dense' },
                  { label: "Analytics First", value: 'analytics_first' }
                ]}
                onChange={(val) => u({ appearance_dashboard_layout: val as any })}
              />
            </div>
          </div>

          <div className="border-t border-border/40 pt-6 space-y-4">
            <ToggleRow
              label="Compact Mode"
              desc="Reduces padding and font sizes globally to fit more information on screen."
              value={form.appearance_compact_mode ?? false}
              onChange={() => u({ appearance_compact_mode: !form.appearance_compact_mode })}
            />
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
