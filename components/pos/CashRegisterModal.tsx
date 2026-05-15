"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type CashRegister } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/formatCurrency";
import { format } from "date-fns";
import { Wallet, Lock, Unlock, TrendingUp, TrendingDown } from "lucide-react";

export function CashRegisterModal() {
  const { businessId, user } = useAuthStore();
  const { showCashRegister, setShowCashRegister, activeCashRegister, setActiveCashRegister } = usePOSStore();

  const [openingBalance, setOpeningBalance] = useState<number | "">("");
  const [closingBalance, setClosingBalance] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const existingRegister = useLiveQuery(
    () => businessId
      ? db.cash_registers.where({ branch_id: businessId, date: today }).first()
      : undefined,
    [businessId, today]
  );

  const register = activeCashRegister ?? existingRegister;

  const handleOpen = async () => {
    if (!businessId || !user || openingBalance === "") return;
    setProcessing(true);
    try {
      const newRegister: CashRegister = {
        id: crypto.randomUUID(),
        branch_id: businessId,
        business_id: businessId,
        opened_by: user.id,
        date: today,
        opening_balance: Number(openingBalance),
        cash_in: 0,
        cash_out: 0,
        cash_sales: 0,
        cash_refunds: 0,
        status: "open",
        opened_at: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };
      await db.cash_registers.add(newRegister);
      setActiveCashRegister(newRegister);
      setOpeningBalance("");
      setNotes("");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = async () => {
    if (!register || closingBalance === "") return;
    setProcessing(true);
    try {
      const expectedCash = register.opening_balance + register.cash_sales - register.cash_refunds + register.cash_in - register.cash_out;
      const difference = Number(closingBalance) - expectedCash;
      const timestamp = new Date().toISOString();

      await db.cash_registers.update(register.id, {
        status: "closed",
        closing_balance: Number(closingBalance),
        expected_cash: expectedCash,
        difference,
        closed_by: user?.id,
        closed_at: timestamp,
      });

      setActiveCashRegister(null);
      setClosingBalance("");
      setShowCashRegister(false);
    } finally {
      setProcessing(false);
    }
  };

  const isOpen = register?.status === "open";

  return (
    <Dialog open={showCashRegister} onOpenChange={setShowCashRegister}>
      <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl print:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <Wallet className="w-5 h-5" />
            Cash Register — {format(new Date(), "dd MMM yyyy")}
          </DialogTitle>
        </DialogHeader>

        {!register ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">No register open for today. Enter opening balance to begin.</p>
            <div className="space-y-1">
              <Label>Opening Balance <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input type="number" placeholder="0.00" className="pl-7" value={openingBalance} onChange={e => setOpeningBalance(e.target.value ? parseFloat(e.target.value) : "")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="Shift notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Button className="w-full gap-2" onClick={handleOpen} disabled={processing || openingBalance === ""}>
              <Unlock className="w-4 h-4" /> Open Register
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOpen ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {isOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="font-semibold text-sm">{isOpen ? "Register Open" : "Register Closed"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-muted-foreground text-xs mb-1">Opening Balance</p>
                <p className="font-bold">{formatINR(register.opening_balance)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-muted-foreground text-xs mb-1">Cash Sales</p>
                <p className="font-bold text-green-600">{formatINR(register.cash_sales)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-muted-foreground text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3" />Cash In</p>
                <p className="font-bold text-green-600">{formatINR(register.cash_in)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-muted-foreground text-xs flex items-center gap-1"><TrendingDown className="w-3 h-3" />Cash Out</p>
                <p className="font-bold text-orange-600">{formatINR(register.cash_out)}</p>
              </div>
            </div>

            {isOpen ? (
              <div className="space-y-3">
                <div className="border-t border-border/40 pt-3">
                  <p className="text-sm font-semibold mb-2">Close Register</p>
                  <div className="space-y-1">
                    <Label>Actual Cash Count <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input type="number" placeholder="0.00" className="pl-7" value={closingBalance} onChange={e => setClosingBalance(e.target.value ? parseFloat(e.target.value) : "")} />
                    </div>
                  </div>
                  {closingBalance !== "" && (
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected:</span>
                        <span>{formatINR(register.opening_balance + register.cash_sales - register.cash_refunds + register.cash_in - register.cash_out)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${Number(closingBalance) - (register.opening_balance + register.cash_sales - register.cash_refunds + register.cash_in - register.cash_out) < 0 ? "text-destructive" : "text-green-600"}`}>
                        <span>Difference:</span>
                        <span>{formatINR(Number(closingBalance) - (register.opening_balance + register.cash_sales - register.cash_refunds + register.cash_in - register.cash_out))}</span>
                      </div>
                    </div>
                  )}
                  <Button className="w-full mt-3 gap-2" variant="destructive" onClick={handleClose} disabled={processing || closingBalance === ""}>
                    <Lock className="w-4 h-4" /> Close Register
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">Register closed at {register.closed_at ? format(new Date(register.closed_at), "hh:mm a") : "—"}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
