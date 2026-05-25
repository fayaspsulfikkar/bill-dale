"use client";

import { useProducts, useInventory } from "@/lib/api/queries";
import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { AlertTriangle } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

export function LowStockAlertBar() {
  const { businessId } = useAuthStore();

  const { data: allInventory = [] } = useInventory(businessId ? [businessId] : []);
  const { data: allProducts = [] } = useProducts(businessId || null);

  const lowStockProducts = useMemo(() => {
    if (!businessId || allInventory.length === 0 || allProducts.length === 0) return [];
    const lowItems = allInventory.filter(inv => inv.stock > 0 && inv.stock <= LOW_STOCK_THRESHOLD);
    return lowItems.map(inv => {
      const product = allProducts.find(p => p.id === inv.product_id);
      return { ...inv, product };
    }).filter(i => i.product);
  }, [businessId, allInventory, allProducts]);

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
