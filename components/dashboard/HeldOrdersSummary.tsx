"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { HeldOrder } from "@/offline/db";
import { Clock, ShoppingBag } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Props {
  heldOrders: HeldOrder[];
}

export function HeldOrdersSummary({ heldOrders }: Props) {
  const stats = useMemo(() => {
    const totalValue = heldOrders.reduce((s, o) => s + o.total_amount, 0);
    const oldest = heldOrders.length > 0
      ? heldOrders.reduce((min, o) => o.created_at < min.created_at ? o : min)
      : null;
    return { count: heldOrders.length, totalValue, oldest };
  }, [heldOrders]);

  if (stats.count === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Held Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-4 justify-center text-muted-foreground text-sm">
            <ShoppingBag className="w-5 h-5 text-green-500" />
            No held orders
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Held Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-amber-500">{stats.count}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Orders</p>
          </div>
          <div>
            <p className="text-lg font-black font-mono">{formatINR(stats.totalValue)}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Value</p>
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground">
              {stats.oldest ? formatDistanceToNow(parseISO(stats.oldest.created_at), { addSuffix: true }) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Oldest</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
