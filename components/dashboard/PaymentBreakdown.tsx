"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice } from "@/offline/db";
import { Banknote, CreditCard, QrCode, Split, Wallet, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";

const METHOD_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash: { label: "Cash", icon: <Banknote className="w-4 h-4" />, color: "text-green-600 bg-green-500/10" },
  upi: { label: "UPI", icon: <QrCode className="w-4 h-4" />, color: "text-violet-600 bg-violet-500/10" },
  card: { label: "Card", icon: <CreditCard className="w-4 h-4" />, color: "text-blue-600 bg-blue-500/10" },
  split: { label: "Split Pay", icon: <Split className="w-4 h-4" />, color: "text-orange-600 bg-orange-500/10" },
  store_credit: { label: "Store Credit", icon: <Wallet className="w-4 h-4" />, color: "text-cyan-600 bg-cyan-500/10" },
  credit_sale: { label: "Credit Sale", icon: <HandCoins className="w-4 h-4" />, color: "text-amber-600 bg-amber-500/10" },
};

interface Props {
  invoices: Invoice[];
}

export function PaymentBreakdown({ invoices }: Props) {
  const data = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    invoices.forEach(inv => {
      const m = inv.payment_method || "cash";
      if (!map[m]) map[m] = { amount: 0, count: 0 };
      map[m].amount += inv.total_amount;
      map[m].count++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([method, d]) => ({
        method,
        ...d,
        meta: METHOD_META[method] || { label: method, icon: <Banknote className="w-4 h-4" />, color: "text-muted-foreground bg-muted" },
      }));
  }, [invoices]);

  const total = invoices.reduce((s, i) => s + i.total_amount, 0);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Payment Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-2">
            {data.map(d => {
              const pct = total > 0 ? (d.amount / total) * 100 : 0;
              return (
                <div key={d.method} className="flex items-center gap-3">
                  <div className={cn("p-1.5 rounded-lg shrink-0", d.meta.color)}>
                    {d.meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold">{d.meta.label}</span>
                      <span className="text-sm font-mono font-bold">{formatINR(d.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono w-12 text-right">
                        {d.count} txn
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">No payments recorded</div>
        )}
      </CardContent>
    </Card>
  );
}
