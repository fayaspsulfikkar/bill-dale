"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { AlertTriangle } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

export function LowStockAlertBar() {
  const { businessId } = useAuthStore();

  const lowStockProducts = useLiveQuery(async () => {
    if (!businessId) return [];
    const inventory = await db.inventory.where("branch_id").equals(businessId).toArray();
    const lowItems = inventory.filter(inv => inv.stock > 0 && inv.stock <= LOW_STOCK_THRESHOLD);
    if (lowItems.length === 0) return [];
    const products = await Promise.all(lowItems.map(inv => db.products.get(inv.product_id)));
    return lowItems.map((inv, i) => ({ ...inv, product: products[i] })).filter(i => i.product);
  }, [businessId]) ?? [];

  if (lowStockProducts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 text-orange-700 text-xs print:hidden overflow-hidden">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="font-semibold shrink-0">Low Stock:</span>
      <span className="truncate">
        {lowStockProducts.slice(0, 4).map(i => `${i.product!.name} (${i.stock})`).join(" · ")}
        {lowStockProducts.length > 4 && ` · +${lowStockProducts.length - 4} more`}
      </span>
    </div>
  );
}
