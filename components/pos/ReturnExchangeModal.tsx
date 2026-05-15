"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/formatCurrency";
import { Search, RefreshCw, ArrowLeft, Minus, Plus } from "lucide-react";

const RETURN_REASONS = [
  "Size issue",
  "Damaged item",
  "Wrong item",
  "Customer changed mind",
  "Billing mistake",
  "Other",
];

interface ReturnItem {
  invoiceItemId: string;
  productId: string;
  productName: string;
  sku: string;
  originalQty: number;
  returnQty: number;
  price: number;
  gstAmount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ReturnExchangeModal({ open, onClose }: Props) {
  const { businessId, user } = useAuthStore();
  const { addItem } = useCartStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [foundInvoice, setFoundInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"search" | "select" | "done">("search");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      let invoice = null;

      // Try exact invoice number match
      const byNumber = await db.invoices.where("invoice_number").equals(searchQuery.trim()).first();
      if (byNumber) { invoice = byNumber; }

      // Try invoice ID prefix
      if (!invoice) {
        const allInvoices = await db.invoices.toArray();
        invoice = allInvoices.find(inv => inv.id.startsWith(searchQuery.trim()) || inv.id === searchQuery.trim()) ?? null;
      }

      // Try customer phone
      if (!invoice && businessId) {
        const customer = await db.customers
          .where("business_id").equals(businessId)
          .and(c => c.phone === searchQuery.trim())
          .first();
        if (customer) {
          const customerInvoices = await db.invoices.where("customer_id").equals(customer.id).toArray();
          invoice = customerInvoices.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
        }
      }

      if (!invoice) {
        setFoundInvoice(null);
        setInvoiceItems([]);
        return;
      }

      const items = await db.invoice_items.where("invoice_id").equals(invoice.id).toArray();
      const products = await Promise.all(items.map(i => db.products.get(i.product_id)));

      const returnItems: ReturnItem[] = items.map((item, idx) => ({
        invoiceItemId: item.id,
        productId: item.product_id,
        productName: item.product_name ?? products[idx]?.name ?? "Unknown",
        sku: products[idx]?.sku ?? "—",
        originalQty: item.quantity,
        returnQty: 0,
        price: item.price,
        gstAmount: item.gst_amount / item.quantity,
      }));

      setFoundInvoice(invoice);
      setInvoiceItems(returnItems);
      setStep("select");
    } finally {
      setSearching(false);
    }
  };

  const totalRefund = invoiceItems.reduce((sum, item) => {
    const linePrice = item.price * item.returnQty;
    const lineGst = item.gstAmount * item.returnQty;
    return sum + linePrice + lineGst;
  }, 0);

  const hasReturnItems = invoiceItems.some(i => i.returnQty > 0);
  const canConfirm = hasReturnItems && reason && (reason !== "Other" || reasonNote.trim());

  const handleConfirm = async () => {
    if (!canConfirm || !foundInvoice || !businessId || !user) return;
    setProcessing(true);
    try {
      const timestamp = new Date().toISOString();
      const activeBranchId = businessId;

      const returnOrderId = crypto.randomUUID();
      const returnOrderData = {
        id: returnOrderId,
        original_invoice_id: foundInvoice.id,
        branch_id: foundInvoice.branch_id,
        business_id: businessId,
        user_id: user.id,
        customer_id: foundInvoice.customer_id,
        items: JSON.stringify(invoiceItems.filter(i => i.returnQty > 0)),
        refund_amount: totalRefund,
        reason,
        reason_note: reasonNote,
        status: "completed" as const,
        created_at: timestamp,
        synced: false,
      };

      await db.transaction("rw", db.return_orders, db.inventory, db.sync_queue, async () => {
        await db.return_orders.add(returnOrderData);

        // Restock inventory
        for (const item of invoiceItems.filter(i => i.returnQty > 0)) {
          const invRecord = await db.inventory.where({ product_id: item.productId, branch_id: activeBranchId }).first();
          if (invRecord) {
            await db.inventory.update(invRecord.id, { stock: invRecord.stock + item.returnQty, last_updated: timestamp });
          }
        }

        await db.sync_queue.add({ table_name: "return_orders", operation: "INSERT", data: returnOrderData, timestamp });
      });

      setStep("done");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("search");
    setSearchQuery("");
    setFoundInvoice(null);
    setInvoiceItems([]);
    setReason("");
    setReasonNote("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl bg-card border-border/60 shadow-2xl print:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <RefreshCw className="w-5 h-5 text-orange-500" />
            Return / Exchange
            {step === "select" && <span className="text-sm font-normal text-muted-foreground">— Invoice {foundInvoice?.invoice_number ?? foundInvoice?.id?.slice(0,8)}</span>}
          </DialogTitle>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Search by invoice number, order ID, or customer phone number.</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Invoice number or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? "Searching..." : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {searchQuery && !foundInvoice && !searching && (
              <p className="text-sm text-destructive">No order found. Try the full invoice number or customer phone.</p>
            )}
          </div>
        )}

        {step === "select" && foundInvoice && (
          <div className="space-y-4 py-2">
            <button onClick={() => setStep("search")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to search
            </button>

            <ScrollArea className="max-h-64 border border-border/40 rounded-xl overflow-hidden">
              <div className="divide-y divide-border/30">
                {invoiceItems.map((item, idx) => (
                  <div key={item.invoiceItemId} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku} · Purchased: {item.originalQty}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors"
                        onClick={() => setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, returnQty: Math.max(0, it.returnQty - 1) } : it))}
                      ><Minus className="w-3 h-3" /></button>
                      <span className="w-6 text-center text-sm font-bold">{item.returnQty}</span>
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition-colors"
                        onClick={() => setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, returnQty: Math.min(it.originalQty, it.returnQty + 1) } : it))}
                      ><Plus className="w-3 h-3" /></button>
                    </div>
                    <p className="w-20 text-right text-sm font-mono font-bold text-primary">
                      {formatINR(item.price * item.returnQty + item.gstAmount * item.returnQty)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Return Reason <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {RETURN_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${reason === r ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/50"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reason === "Other" && (
                <Input placeholder="Describe the reason..." value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} />
              )}
            </div>

            {/* Total refund */}
            {hasReturnItems && (
              <div className="flex justify-between items-center p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <p className="font-bold text-sm text-orange-600">Refund Amount</p>
                <p className="font-black text-xl font-mono text-orange-600">{formatINR(totalRefund)}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
              <Button className="flex-1" disabled={!canConfirm || processing} onClick={handleConfirm}>
                {processing ? "Processing..." : "Confirm Return"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-xl">Return Processed</h3>
            <p className="text-muted-foreground text-sm">Refund of {formatINR(totalRefund)} recorded. Inventory has been updated.</p>
            <Button className="mt-2" onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
