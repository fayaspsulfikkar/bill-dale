"use client";

import { useCartStore } from "@/store/cartStore";
import { aggregateGST } from "@/lib/taxUtil";
import { formatINR } from "@/lib/formatCurrency";

export function TaxBreakdown({ businessState, customerState }: { businessState?: string; customerState?: string }) {
  const { items, discount, getTotals } = useCartStore();
  const { subtotal } = getTotals();

  const lineItems = items.map(item => {
    const unitPrice = item.overridePrice !== undefined ? item.overridePrice : item.product.price;
    const lineTaxable = Math.max(0, unitPrice * item.quantity - item.itemDiscount);
    return { taxableValue: lineTaxable, gstRate: item.product.gst_percent };
  });

  const agg = aggregateGST(lineItems, businessState, customerState);

  if (agg.totalTax === 0) return null;

  return (
    <div className="space-y-1 text-xs text-muted-foreground border-t border-border/30 pt-2 mt-1">
      <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide mb-1">Tax Breakdown</p>
      {agg.rateGroups.map(g => (
        <div key={g.rate} className="flex justify-between">
          <span>
            {agg.isIGST
              ? `IGST @ ${g.rate}%`
              : `CGST @ ${g.rate / 2}% + SGST @ ${g.rate / 2}%`}
          </span>
          <span className="font-mono">{formatINR(g.cgst + g.sgst + g.igst)}</span>
        </div>
      ))}
      <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border/20">
        <span>Total Tax</span>
        <span className="font-mono">{formatINR(agg.totalTax)}</span>
      </div>
    </div>
  );
}
