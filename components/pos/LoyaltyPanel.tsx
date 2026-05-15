"use client";

import { usePOSStore } from "@/store/posStore";
import { formatINR } from "@/lib/formatCurrency";
import { Star, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS_PER_RUPEE = 0.1; // 0.1 points per ₹ spent
const POINTS_VALUE = 0.5;     // 1 point = ₹0.50

export function LoyaltyPanel({ total }: { total: number }) {
  const { selectedCustomer } = usePOSStore();
  if (!selectedCustomer || selectedCustomer.id === "__walk_in__") return null;

  const pointsToEarn = Math.floor(total * POINTS_PER_RUPEE);
  const currentPoints = selectedCustomer.loyalty_points;
  const pointsValue = currentPoints * POINTS_VALUE;

  const tierColors: Record<string, string> = {
    standard: "bg-slate-500/10 text-slate-600",
    silver: "bg-slate-400/10 text-slate-500",
    gold: "bg-amber-500/10 text-amber-600",
    platinum: "bg-violet-500/10 text-violet-600",
  };

  return (
    <div className="mx-0 mt-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-amber-700">Loyalty</span>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded font-bold capitalize ${tierColors[selectedCustomer.membership_tier] ?? tierColors.standard}`}>
          {selectedCustomer.membership_tier}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Current Points</span>
        <span className="font-bold text-amber-600">{currentPoints.toLocaleString("en-IN")} pts ({formatINR(pointsValue)})</span>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
        <span>Points this sale</span>
        <span className="font-bold text-green-600">+{pointsToEarn} pts</span>
      </div>
    </div>
  );
}
