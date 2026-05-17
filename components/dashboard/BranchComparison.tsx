"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice, Branch } from "@/offline/db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type Mode = "revenue" | "orders" | "aov";

interface Props {
  invoices: Invoice[];
  branches: Branch[];
}

export function BranchComparison({ invoices, branches }: Props) {
  const [mode, setMode] = useState<Mode>("revenue");

  const data = useMemo(() => {
    return branches.map(b => {
      const bInvoices = invoices.filter(i => i.branch_id === b.id);
      const revenue = bInvoices.reduce((s, i) => s + i.total_amount, 0);
      const orders = bInvoices.length;
      const aov = orders > 0 ? revenue / orders : 0;
      return { name: b.name, revenue, orders, aov };
    });
  }, [invoices, branches]);

  const hasData = data.some(d => d.revenue > 0 || d.orders > 0);

  const modes: { id: Mode; label: string }[] = [
    { id: "revenue", label: "Revenue" },
    { id: "orders", label: "Orders" },
    { id: "aov", label: "Avg Order" },
  ];

  if (branches.length <= 1) {
    const d = data[0];
    if (!d) return null;
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Branch Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground font-bold uppercase">Revenue</p>
              <p className="font-black font-mono text-primary mt-1">{formatINR(d.revenue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground font-bold uppercase">Orders</p>
              <p className="font-black font-mono mt-1">{d.orders}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground font-bold uppercase">Avg Order</p>
              <p className="font-black font-mono mt-1">{formatINR(d.aov)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Branch Comparison</CardTitle>
        <div className="flex gap-1">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors",
                mode === m.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[280px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => mode === "revenue" || mode === "aov" ? `₹${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "13px" }}
                formatter={(value: any) => [mode === "revenue" || mode === "aov" ? formatINR(Number(value)) : value, modes.find(m => m.id === mode)?.label]}
              />
              <Bar dataKey={mode} fill="oklch(0.65 0.25 250)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data</div>
        )}
      </CardContent>
    </Card>
  );
}
