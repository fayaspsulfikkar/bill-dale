"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice, InvoiceItem, Product, Inventory, Branch, ReturnOrder } from "@/offline/db";
import { Lightbulb } from "lucide-react";

interface Props {
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  products: Product[];
  inventory: Inventory[];
  branches: Branch[];
  returnOrders: ReturnOrder[];
  branchId: string | "all";
}

export function DashboardInsights({ invoices, invoiceItems, products, inventory, branches, returnOrders, branchId }: Props) {
  const insights = useMemo(() => {
    const tips: string[] = [];
    if (invoices.length === 0) return tips;

    const invoiceIds = new Set(invoices.map(i => i.id));
    const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));

    // Top branch by revenue
    if (branches.length > 1) {
      const branchRevenue = branches.map(b => ({
        name: b.name,
        revenue: invoices.filter(i => i.branch_id === b.id).reduce((s, i) => s + i.total_amount, 0),
      })).sort((a, b) => b.revenue - a.revenue);
      if (branchRevenue[0]?.revenue > 0) {
        tips.push(`${branchRevenue[0].name} generated the highest revenue (${formatINR(branchRevenue[0].revenue)}).`);
      }
    }

    // Top-selling product
    const productSales: Record<string, number> = {};
    filteredItems.forEach(ii => {
      productSales[ii.product_id] = (productSales[ii.product_id] || 0) + ii.quantity;
    });
    const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
    if (topProduct) {
      const prod = products.find(p => p.id === topProduct[0]);
      if (prod) tips.push(`${prod.name} is the top-selling product with ${topProduct[1]} units sold.`);
    }

    // Most popular payment method
    const pmCounts: Record<string, number> = {};
    invoices.forEach(i => { pmCounts[i.payment_method] = (pmCounts[i.payment_method] || 0) + 1; });
    const topPM = Object.entries(pmCounts).sort((a, b) => b[1] - a[1])[0];
    if (topPM) {
      const labels: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", split: "Split Payment", store_credit: "Store Credit", credit_sale: "Credit Sale" };
      tips.push(`${labels[topPM[0]] || topPM[0]} is the most used payment method (${topPM[1]} orders).`);
    }

    // Low stock items
    const inv = branchId === "all" ? inventory : inventory.filter(i => i.branch_id === branchId);
    const lowCount = inv.filter(i => {
      const prod = products.find(p => p.id === i.product_id);
      return i.stock > 0 && i.stock <= (prod?.low_stock_threshold ?? 5);
    }).length;
    if (lowCount > 0) tips.push(`${lowCount} product${lowCount > 1 ? "s are" : " is"} running low on stock.`);

    // Returns
    if (returnOrders.length > 0) {
      tips.push(`${returnOrders.length} return${returnOrders.length > 1 ? "s" : ""} processed (${formatINR(returnOrders.reduce((s, r) => s + r.refund_amount, 0))} refunded).`);
    }

    return tips.slice(0, 5);
  }, [invoices, invoiceItems, products, inventory, branches, returnOrders, branchId]);

  if (insights.length === 0) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span className="text-muted-foreground">{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
