"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product, Inventory, Branch } from "@/offline/db";
import { AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  products: Product[];
  inventory: Inventory[];
  branches: Branch[];
  branchId: string | "all";
}

interface AlertItem {
  productName: string;
  sku: string;
  size?: string;
  stock: number;
  threshold: number;
  branch: string;
  isOut: boolean;
}

export function LowStockAlerts({ products, inventory, branches, branchId }: Props) {
  const alerts = useMemo<AlertItem[]>(() => {
    const inv = branchId === "all" ? inventory : inventory.filter(i => i.branch_id === branchId);
    const result: AlertItem[] = [];
    inv.forEach(i => {
      const prod = products.find(p => p.id === i.product_id);
      const branch = branches.find(b => b.id === i.branch_id);
      const threshold = prod?.low_stock_threshold ?? 5;
      const isOut = i.stock <= 0;
      const isLow = i.stock > 0 && i.stock <= threshold;
      if (!isOut && !isLow) return;
      result.push({
        productName: prod?.name || "Unknown",
        sku: prod?.sku || "---",
        size: prod?.size,
        stock: i.stock,
        threshold,
        branch: branch?.name || "Unknown",
        isOut,
      });
    });
    return result.sort((a, b) => a.stock - b.stock);
  }, [products, inventory, branches, branchId]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Stock Alerts
        </CardTitle>
        {alerts.length > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
            {alerts.length} items
          </span>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {alerts.slice(0, 15).map((a, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-background/50 rounded-lg border border-border/30">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{a.productName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{a.sku}{a.size ? ` · ${a.size}` : ""} · {a.branch}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={cn(
                    "text-sm font-bold",
                    a.isOut ? "text-red-500" : "text-amber-500"
                  )}>{a.stock}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    a.isOut ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {a.isOut ? "OUT" : "LOW"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground text-sm">
            <Package className="w-5 h-5 text-green-500" />
            Inventory looks healthy
          </div>
        )}
      </CardContent>
    </Card>
  );
}
