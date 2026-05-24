"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Code, TerminalSquare, Settings2, Activity, FlaskConical } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

function ToggleRow({ label, desc, value, onChange, icon: Icon }: { label: string; desc: string; value: boolean; onChange: () => void; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="flex gap-4 items-start">
        <div className="mt-0.5">
          <Icon className={`w-5 h-5 ${value ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{desc}</p>
        </div>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${value ? "bg-primary" : "bg-muted"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function AdvancedTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Code className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Advanced Diagnostics</CardTitle>
              <CardDescription className="text-xs">Developer options and experimental flags</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          
          <ToggleRow
            icon={TerminalSquare}
            label="Developer Mode"
            desc="Enable detailed console logging, debug overlays, and raw state inspection."
            value={form.advanced_developer_mode ?? false}
            onChange={() => u({ advanced_developer_mode: !form.advanced_developer_mode })}
          />

          <ToggleRow
            icon={Settings2}
            label="API Management"
            desc="Enable the API playground and rate-limit controls for third-party headless access."
            value={form.advanced_api_management ?? false}
            onChange={() => u({ advanced_api_management: !form.advanced_api_management })}
          />

          <ToggleRow
            icon={Activity}
            label="Performance Analytics"
            desc="Send anonymous runtime telemetry to help optimize POS performance."
            value={form.advanced_performance_analytics ?? true}
            onChange={() => u({ advanced_performance_analytics: !form.advanced_performance_analytics })}
          />

          <ToggleRow
            icon={FlaskConical}
            label="Experimental Features"
            desc="Get early access to beta features before they are officially released."
            value={form.advanced_experimental_features ?? false}
            onChange={() => u({ advanced_experimental_features: !form.advanced_experimental_features })}
          />

        </CardContent>
      </Card>

    </div>
  );
}
