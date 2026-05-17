"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice, InvoiceItem, ReturnOrder } from "@/offline/db";

interface Props {
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  returnOrders: ReturnOrder[];
}

export function RevenueSummary({ invoices, invoiceItems, returnOrders }: Props) {
  const data = useMemo(() => {
    const invoiceIds = new Set(invoices.map(i => i.id));
    const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));

    const grossSales = invoices.reduce((s, i) => s + i.total_amount + (i.discount || 0), 0);
    const discounts = invoices.reduce((s, i) => s + (i.discount || 0), 0)
      + filteredItems.reduce((s, ii) => s + (ii.item_discount || 0), 0);
    const returns = returnOrders.reduce((s, r) => s + r.refund_amount, 0);
    const gst = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
    const netSales = grossSales - discounts - returns;
    const totalPaid = invoices.reduce((s, i) => s + i.total_amount, 0);

    return [
      { label: "Gross Sales", value: formatINR(grossSales), color: "" },
      { label: "Discounts", value: `- ${formatINR(discounts)}`, color: "text-amber-500" },
      { label: "Returns / Refunds", value: `- ${formatINR(returns)}`, color: "text-red-500" },
      { label: "Net Sales", value: formatINR(netSales), color: "text-primary font-black" },
      { label: "GST Collected", value: formatINR(gst), color: "text-muted-foreground" },
      { label: "Total Paid Amount", value: formatINR(totalPaid), color: "text-primary font-black text-lg" },
    ];
  }, [invoices, invoiceItems, returnOrders]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Revenue Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((row, i) => (
          <div key={i} className={`flex justify-between items-center py-1.5 ${i === 3 ? "border-t border-b border-border/50 my-1" : ""} ${i === data.length - 1 ? "border-t border-border/50 pt-3 mt-2" : ""}`}>
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={`text-sm font-mono font-semibold ${row.color}`}>{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
