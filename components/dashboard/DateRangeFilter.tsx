"use client";

import { useState } from "react";
import { startOfDay, endOfDay, subDays, startOfMonth, format } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DatePreset = "today" | "yesterday" | "7days" | "30days" | "month" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
  label: string;
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7days", label: "Last 7 Days" },
  { id: "30days", label: "Last 30 Days" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom Range" },
];

export function getDateRange(preset: DatePreset, customFrom?: Date, customTo?: Date): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), preset, label: "Today" };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y), preset, label: "Yesterday" };
    }
    case "7days":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), preset, label: "Last 7 Days" };
    case "30days":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now), preset, label: "Last 30 Days" };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now), preset, label: "This Month" };
    case "custom":
      return {
        from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 6)),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
        preset,
        label: customFrom && customTo
          ? `${format(customFrom, "dd MMM")} – ${format(customTo, "dd MMM yyyy")}`
          : "Custom Range",
      };
  }
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(format(value.from, "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(value.to, "yyyy-MM-dd"));

  const handlePreset = (preset: DatePreset) => {
    if (preset === "custom") {
      setOpen(true);
      return;
    }
    onChange(getDateRange(preset));
    setOpen(false);
  };

  const applyCustom = () => {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    if (from > to) return;
    onChange(getDateRange("custom", from, to));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-sm font-semibold transition-all",
          "bg-card/50 border-border/50 hover:bg-card/80 text-foreground"
        )}
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        {value.label}
        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border/60 bg-card shadow-xl p-2 space-y-1">
            {PRESETS.filter(p => p.id !== "custom").map(p => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  value.preset === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-border/40 pt-2 mt-2 space-y-2 px-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Custom Range</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg border border-border/50 bg-background text-xs"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="flex-1 h-8 px-2 rounded-lg border border-border/50 bg-background text-xs"
                />
              </div>
              <button
                onClick={applyCustom}
                className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
