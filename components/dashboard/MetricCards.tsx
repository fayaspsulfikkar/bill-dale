"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice, InvoiceItem, Product, Inventory, HeldOrder } from "@/offline/db";
import {
  DollarSign, ShoppingBag, ReceiptText, TrendingUp,
  Package, Percent, BadgeIndianRupee, AlertTriangle,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  invoices: Invoice[];
  prevInvoices: Invoice[]; // previous period for comparison
  invoiceItems: InvoiceItem[];
  products: Product[];
  inventory: Inventory[];
  heldOrders: HeldOrder[];
  branchId: string | "all";
}

interface MetricDef {
  label: string;
  value: string;
  prevValue?: number;
  currentRaw?: number;
  icon: React.ReactNode;
  accent?: boolean;
  warning?: boolean;
}

function pctChange(current: number, prev: number): { pct: number; direction: "up" | "down" | "flat" } {
  if (prev === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (prev === 0) return { pct: 100, direction: "up" };
  const pct = ((current - prev) / prev) * 100;
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

export function MetricCards({ invoices, prevInvoices, invoiceItems, products, inventory, heldOrders, branchId }: Props) {
  const metrics = useMemo<MetricDef[]>(() => {
    const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
    const prevRevenue = prevInvoices.reduce((s, i) => s + i.total_amount, 0);
    const totalOrders = invoices.length;
    const prevOrders = prevInvoices.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAvgOrder = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    // Filter invoice items to the invoices in range
    const invoiceIds = new Set(invoices.map(i => i.id));
    const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));
    const itemsSold = filteredItems.reduce((s, ii) => s + ii.quantity, 0);
    const prevInvoiceIds = new Set(prevInvoices.map(i => i.id));
    const prevFilteredItems = invoiceItems.filter(ii => prevInvoiceIds.has(ii.invoice_id));
    const prevItemsSold = prevFilteredItems.reduce((s, ii) => s + ii.quantity, 0);

    const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0)
      + filteredItems.reduce((s, ii) => s + (ii.item_discount || 0), 0);
    const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);

    // Low stock items
    const inv = branchId === "all" ? inventory : inventory.filter(i => i.branch_id === branchId);
    const lowStockCount = inv.filter(i => {
      const prod = products.find(p => p.id === i.product_id);
      const threshold = prod?.low_stock_threshold ?? 5;
      return i.stock > 0 && i.stock <= threshold;
    }).length;
    const outOfStockCount = inv.filter(i => i.stock <= 0).length;

    return [
      {
        label: "Total Revenue",
        value: formatINR(totalRevenue),
        currentRaw: totalRevenue,
        prevValue: prevRevenue,
        icon: <BadgeIndianRupee className="w-5 h-5" />,
        accent: true,
      },
      {
        label: "Total Orders",
        value: totalOrders.toLocaleString("en-IN"),
        currentRaw: totalOrders,
        prevValue: prevOrders,
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        label: "Avg Order Value",
        value: formatINR(avgOrder),
        currentRaw: avgOrder,
        prevValue: prevAvgOrder,
        icon: <TrendingUp className="w-5 h-5" />,
      },
      {
        label: "Items Sold",
        value: itemsSold.toLocaleString("en-IN"),
        currentRaw: itemsSold,
        prevValue: prevItemsSold,
        icon: <Package className="w-5 h-5" />,
      },
      {
        label: "Discounts Given",
        value: formatINR(totalDiscount),
        icon: <Percent className="w-5 h-5" />,
      },
      {
        label: "Tax Collected",
        value: formatINR(totalTax),
        icon: <ReceiptText className="w-5 h-5" />,
      },
      {
        label: "Held Orders",
        value: heldOrders.length.toString(),
        icon: <DollarSign className="w-5 h-5" />,
        warning: heldOrders.length > 0,
      },
      {
        label: "Low / Out of Stock",
        value: `${lowStockCount} / ${outOfStockCount}`,
        icon: <AlertTriangle className="w-5 h-5" />,
        warning: lowStockCount + outOfStockCount > 0,
      },
    ];
  }, [invoices, prevInvoices, invoiceItems, products, inventory, heldOrders, branchId]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m, i) => {
        const change = m.currentRaw !== undefined && m.prevValue !== undefined
          ? pctChange(m.currentRaw, m.prevValue)
          : null;
        return (
          <Card key={i} className={cn(
            "bg-card/50 border-border/50 transition-all hover:shadow-sm",
            m.accent && "border-primary/20 shadow-[inset_0_0_10px_rgba(var(--primary),0.05)]",
            m.warning && "border-amber-500/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  m.accent ? "bg-primary/15 text-primary" :
                  m.warning ? "bg-amber-500/15 text-amber-500" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {m.icon}
                </div>
                {change && change.direction !== "flat" && (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                    change.direction === "up" ? "text-green-600 bg-green-500/10" : "text-red-500 bg-red-500/10"
                  )}>
                    {change.direction === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {change.pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{m.label}</p>
              <p className={cn(
                "text-xl font-black font-mono tracking-tight",
                m.accent && "text-primary"
              )}>{m.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
