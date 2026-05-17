"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice, InvoiceItem, Product, Inventory } from "@/offline/db";
import { cn } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";

type SortBy = "units" | "revenue" | "stock";

interface Props {
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  products: Product[];
  inventory: Inventory[];
  branchId: string | "all";
}

export function TopSellingProducts({ invoices, invoiceItems, products, inventory, branchId }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("units");

  const data = useMemo(() => {
    const invoiceIds = new Set(invoices.map(i => i.id));
    const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));

    const productMap: Record<string, { units: number; revenue: number }> = {};
    filteredItems.forEach(ii => {
      if (!productMap[ii.product_id]) productMap[ii.product_id] = { units: 0, revenue: 0 };
      productMap[ii.product_id].units += ii.quantity;
      productMap[ii.product_id].revenue += ii.price * ii.quantity;
    });

    return Object.entries(productMap)
      .map(([pid, d]) => {
        const prod = products.find(p => p.id === pid);
        const inv = branchId === "all"
          ? inventory.filter(i => i.product_id === pid).reduce((s, i) => s + i.stock, 0)
          : inventory.find(i => i.product_id === pid && i.branch_id === branchId)?.stock ?? 0;
        return {
          id: pid,
          name: prod?.name || "Unknown",
          sku: prod?.sku || "---",
          size: prod?.size,
          color: prod?.color,
          units: d.units,
          revenue: d.revenue,
          stock: inv,
        };
      })
      .sort((a, b) => sortBy === "units" ? b.units - a.units : sortBy === "revenue" ? b.revenue - a.revenue : a.stock - b.stock)
      .slice(0, 10);
  }, [invoices, invoiceItems, products, inventory, branchId, sortBy]);

  const sorts: { id: SortBy; label: string }[] = [
    { id: "units", label: "Units Sold" },
    { id: "revenue", label: "Revenue" },
    { id: "stock", label: "Stock Left" },
  ];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Top Selling Products</CardTitle>
        <div className="flex gap-1 items-center">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {sorts.map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={cn(
                "px-2 py-1 rounded-full text-[11px] font-bold transition-colors",
                sortBy === s.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-2">
            {data.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 flex items-center justify-center bg-primary/15 text-primary font-black text-xs rounded-md shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {item.sku}
                      {item.size && ` · ${item.size}`}
                      {item.color && ` · ${item.color}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="font-bold text-sm">{item.units}</p>
                    <p className="text-[10px] text-muted-foreground">sold</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm font-mono">{formatINR(item.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">revenue</p>
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm", item.stock <= 0 ? "text-red-500" : item.stock <= 5 ? "text-amber-500" : "")}>{item.stock}</p>
                    <p className="text-[10px] text-muted-foreground">in stock</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">No sales data available yet</div>
        )}
      </CardContent>
    </Card>
  );
}
