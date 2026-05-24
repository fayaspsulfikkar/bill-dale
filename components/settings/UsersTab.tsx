"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Users, Clock, CalendarRange, Target, ShieldCheck } from "lucide-react";
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

export default function UsersTab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      {/* 1. Core Staff Management */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Staff Management Module</CardTitle>
              <CardDescription className="text-xs">Enable or disable the comprehensive staff engine</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => u({ staff_management_enabled: !form.staff_management_enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.staff_management_enabled ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${form.staff_management_enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className={`space-y-6 ${!form.staff_management_enabled ? "opacity-40 pointer-events-none" : ""}`}>
            
            <ToggleRow
              label="Attendance & Time Tracking"
              desc="Require staff to clock in/out for payroll and hour tracking."
              value={form.staff_attendance_tracking ?? false}
              onChange={() => u({ staff_attendance_tracking: !form.staff_attendance_tracking })}
            />
            
            <ToggleRow
              label="Shift Management"
              desc="Enable complex scheduling, shift handovers, and cash register balancing."
              value={form.staff_shift_management ?? false}
              onChange={() => u({ staff_shift_management: !form.staff_shift_management })}
            />

            <ToggleRow
              label="Performance Metrics & KPIs"
              desc="Track items scanned per minute, void ratios, and average transaction value per employee."
              value={form.staff_performance_metrics ?? false}
              onChange={() => u({ staff_performance_metrics: !form.staff_performance_metrics })}
            />

          </div>
        </CardContent>
      </Card>

      {/* Cross-sell for Security Module */}
      <Card className="bg-muted/30 border-dashed border-border/60">
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Need granular role-based access?</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Staff permissions, PIN requirements, and audit logs are managed centrally in the Security Hub.
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
