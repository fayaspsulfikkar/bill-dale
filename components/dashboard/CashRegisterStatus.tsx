"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { CashRegister } from "@/offline/db";
import { Wallet, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  register: CashRegister | null;
}

export function CashRegisterStatus({ register }: Props) {
  if (!register) {
    return (
      <Card className="bg-card/50 border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Cash Register
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-3 text-amber-500 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Register not opened today. Open the POS to start.
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOpen = register.status === "open";
  const expectedCash = register.opening_balance + register.cash_sales - register.cash_refunds + register.cash_in - register.cash_out;

  const rows = [
    { label: "Opening Balance", value: formatINR(register.opening_balance) },
    { label: "Cash Sales", value: `+ ${formatINR(register.cash_sales)}`, color: "text-green-600" },
    { label: "Cash Refunds", value: `- ${formatINR(register.cash_refunds)}`, color: "text-red-500" },
    { label: "Cash In", value: `+ ${formatINR(register.cash_in)}`, color: "text-green-600" },
    { label: "Cash Out", value: `- ${formatINR(register.cash_out)}`, color: "text-red-500" },
    { label: "Expected Cash", value: formatINR(expectedCash), color: "font-black text-primary" },
  ];

  return (
    <Card className={cn("bg-card/50", isOpen ? "border-green-500/20" : "border-border/50")}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Cash Register
        </CardTitle>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
          isOpen ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
        )}>
          {isOpen ? <><CheckCircle className="w-3 h-3 inline mr-1" />Open</> : "Closed"}
        </span>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className={cn(
            "flex justify-between items-center py-1",
            i === rows.length - 1 && "border-t border-border/50 pt-2 mt-1"
          )}>
            <span className="text-xs text-muted-foreground">{r.label}</span>
            <span className={cn("text-sm font-mono font-semibold", r.color)}>{r.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
