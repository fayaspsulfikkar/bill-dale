"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice } from "@/offline/db";
import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  invoices: Invoice[];
}

interface StaffStat {
  name: string;
  orders: number;
  revenue: number;
  avgOrder: number;
  discounts: number;
  topMethod: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", upi: "UPI", card: "Card", split: "Split",
  store_credit: "Store Credit", credit_sale: "Credit",
};

export function StaffPerformance({ invoices }: Props) {
  const data = useMemo<StaffStat[]>(() => {
    const map: Record<string, { orders: number; revenue: number; discounts: number; methods: Record<string, number> }> = {};

    invoices.forEach(inv => {
      const name = inv.staff_name || "Unassigned";
      if (!map[name]) map[name] = { orders: 0, revenue: 0, discounts: 0, methods: {} };
      map[name].orders++;
      map[name].revenue += inv.total_amount;
      map[name].discounts += inv.discount || 0;
      const m = inv.payment_method || "cash";
      map[name].methods[m] = (map[name].methods[m] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, d]) => {
        const topMethod = Object.entries(d.methods).sort((a, b) => b[1] - a[1])[0];
        return {
          name,
          orders: d.orders,
          revenue: d.revenue,
          avgOrder: d.orders > 0 ? d.revenue / d.orders : 0,
          discounts: d.discounts,
          topMethod: topMethod ? (METHOD_LABELS[topMethod[0]] || topMethod[0]) : "—",
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          Staff Sales Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((s, i) => (
            <div key={s.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                    i === 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.orders} orders · Avg {formatINR(s.avgOrder)} · {s.topMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-black text-sm font-mono">{formatINR(s.revenue)}</p>
                  {s.discounts > 0 && (
                    <p className="text-[10px] text-amber-500">-{formatINR(s.discounts)} disc.</p>
                  )}
                </div>
              </div>
              {/* Revenue bar */}
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    i === 0 ? "bg-primary" : "bg-primary/40"
                  )}
                  style={{ width: `${(s.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
