"use client";

import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/formatCurrency";
import { PrintThermalReceipt } from "@/components/pos/PrintThermalReceipt";
import { PrintA4Invoice } from "@/components/pos/PrintA4Invoice";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import {
  Receipt, Search, Printer, RefreshCw, ArrowLeft, CreditCard,
  Banknote, Smartphone, ChevronRight, ReceiptText, Tag, User,
  Calendar, BadgeCheck, AlertCircle, FileText, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { onStartReturn?: (invoiceId: string) => void; }

const PAYMENT_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash:         { label: "Cash",         icon: <Banknote className="w-3.5 h-3.5" />,    color: "text-green-600 bg-green-500/10 border-green-500/20" },
  card:         { label: "Card",         icon: <CreditCard className="w-3.5 h-3.5" />,  color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  upi:          { label: "UPI",          icon: <Smartphone className="w-3.5 h-3.5" />,  color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  split:        { label: "Split",        icon: <Layers className="w-3.5 h-3.5" />,      color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  store_credit: { label: "Store Credit", icon: <Tag className="w-3.5 h-3.5" />,         color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20" },
  credit_sale:  { label: "Credit",       icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
};

function PaymentBadge({ method }: { method: string }) {
  const meta = PAYMENT_META[method] ?? { label: method, icon: <Receipt className="w-3.5 h-3.5" />, color: "text-muted-foreground bg-muted border-border" };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border", meta.color)}>
      {meta.icon}{meta.label}
    </span>
  );
}

function groupByDate(invoices: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  const map = new Map<string, any[]>();
  for (const inv of invoices) {
    const d = startOfDay(new Date(inv.created_at)).toISOString();
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(inv);
  }
  for (const [key, items] of map) {
    const date = new Date(key);
    const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "dd MMM yyyy");
    groups.push({ label, items });
  }
  return groups;
}

export function RecentOrdersDrawer({ onStartReturn }: Props) {
  const { businessId } = useAuthStore();
  const business = useLiveQuery(() => businessId ? db.businesses.get(businessId) : undefined, [businessId]);
  const { showRecentOrders, setShowRecentOrders } = usePOSStore();
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [printMode, setPrintMode] = useState<"thermal" | "a4" | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch all invoices and sort in memory since created_at is not a Dexie index
  const allInvoicesRaw = useLiveQuery(() => db.invoices.toArray(), []) ?? [];
  const allInvoices = [...allInvoicesRaw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100);

  const filtered = search.trim()
    ? allInvoices.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        inv.id.toLowerCase().includes(search.toLowerCase())
      )
    : allInvoices;

  const groups = groupByDate(filtered);

  // Today's stats
  const todayInvoices = allInvoices.filter(i => isToday(new Date(i.created_at)));
  const todayRevenue = todayInvoices.reduce((s, i) => s + i.total_amount, 0);

  const openDetail = async (invoice: any) => {
    const items = await db.invoice_items.where("invoice_id").equals(invoice.id).toArray();
    const withProducts = await Promise.all(items.map(async (item) => {
      const product = await db.products.get(item.product_id);
      return { ...item, product };
    }));
    let customer = null;
    if (invoice.customer_id) customer = await db.customers.get(invoice.customer_id).catch(() => null);
    setSelectedItems(withProducts);
    setSelectedCustomer(customer);
    setSelectedInvoice(invoice);
  };

  const handlePrint = (mode: "thermal" | "a4") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(null), 1000);
    }, 100);
  };

  const subtotal = selectedInvoice
    ? selectedInvoice.total_amount - selectedInvoice.tax_amount + selectedInvoice.discount
    : 0;

  return (
    <>
      {/* Hidden print area */}
      {printMode && selectedInvoice && (
        <div className="hidden print:block">
          {printMode === "thermal"
            ? <PrintThermalReceipt invoice={selectedInvoice} items={selectedItems} businessName={business?.name} />
            : <PrintA4Invoice invoice={selectedInvoice} items={selectedItems} businessName={business?.name} />
          }
        </div>
      )}

      <Dialog open={showRecentOrders} onOpenChange={(v) => { setShowRecentOrders(v); if (!v) { setSelectedInvoice(null); setSearch(""); } }}>
        <DialogContent className="sm:max-w-2xl bg-card border-border/60 shadow-2xl print:hidden p-0 overflow-hidden gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/10 flex-row items-center justify-between space-y-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 font-black text-lg">
              {selectedInvoice ? (
                <button onClick={() => setSelectedInvoice(null)} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-mono text-base">{selectedInvoice.invoice_number ?? selectedInvoice.id.slice(0, 8).toUpperCase()}</span>
                </button>
              ) : (
                <>
                  <ReceiptText className="w-5 h-5 text-primary" />
                  Recent Orders
                </>
              )}
            </DialogTitle>
            {selectedInvoice && (
              <span className={cn("text-[11px] font-bold px-2 py-1 rounded-full",
                selectedInvoice.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600")}>
                {selectedInvoice.status === "completed" ? "✓ Completed" : selectedInvoice.status}
              </span>
            )}
          </DialogHeader>

          {!selectedInvoice ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Stats bar */}
              <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40 bg-muted/5 shrink-0">
                <div className="px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Orders</p>
                  <p className="text-xl font-black mt-0.5">{todayInvoices.length}</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Revenue</p>
                  <p className="text-xl font-black text-primary mt-0.5">{formatINR(todayRevenue)}</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Records</p>
                  <p className="text-xl font-black mt-0.5">{allInvoices.length}</p>
                </div>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-border/40 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by invoice number or ID…" className="pl-9 bg-background/50" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1 min-h-0">
                {groups.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground opacity-60">
                    <ReceiptText className="w-10 h-10 mx-auto mb-3" />
                    <p className="font-semibold">No orders found</p>
                    <p className="text-xs mt-1">Try a different search</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-5">
                    {groups.map(group => (
                      <div key={group.label}>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-[10px] text-muted-foreground">{formatINR(group.items.reduce((s, i) => s + i.total_amount, 0))}</span>
                        </div>
                        <div className="space-y-1.5">
                          {group.items.map(inv => (
                            <button
                              key={inv.id}
                              onClick={() => openDetail(inv)}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Receipt className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-sm font-mono">{inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase()}</p>
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold",
                                    inv.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600")}>
                                    {inv.status}
                                  </span>
                                  <PaymentBadge method={inv.payment_method} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {format(new Date(inv.created_at), "hh:mm a")}
                                  {inv.discount > 0 && <span className="ml-2 text-green-600 font-semibold">-{formatINR(inv.discount)} off</span>}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-black text-primary font-mono">{formatINR(inv.total_amount)}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Invoice meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/30 border-b border-border/40 bg-muted/5 shrink-0">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</p>
                  <p className="text-xs font-semibold mt-0.5">{format(new Date(selectedInvoice.created_at), "dd MMM yyyy")}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(selectedInvoice.created_at), "hh:mm a")}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment</p>
                  <div className="mt-1"><PaymentBadge method={selectedInvoice.payment_method} /></div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</p>
                  <p className="text-xs font-semibold mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    {selectedCustomer?.name ?? "Walk-in"}
                  </p>
                  {selectedCustomer?.phone && <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>}
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items</p>
                  <p className="text-xs font-semibold mt-0.5">{selectedItems.length} line{selectedItems.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-5 space-y-4">
                  {/* Items table */}
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <div className="bg-muted/20 px-4 py-2 grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span className="col-span-6">Product</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-2 text-right">Unit</span>
                      <span className="col-span-2 text-right">Total</span>
                    </div>
                    {selectedItems.map((item, idx) => {
                      const unitPrice = item.override_price ?? item.price;
                      const lineTotal = unitPrice * item.quantity - (item.item_discount ?? 0);
                      return (
                        <div key={item.id} className={cn("px-4 py-3 grid grid-cols-12 items-center text-sm", idx !== selectedItems.length - 1 && "border-b border-border/30")}>
                          <div className="col-span-6">
                            <p className="font-semibold leading-tight">{item.product?.name ?? item.product_name ?? "Item"}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.product?.sku ?? "—"}</p>
                            {item.item_discount > 0 && <p className="text-[10px] text-green-600 font-semibold">-{formatINR(item.item_discount)} item discount</p>}
                          </div>
                          <p className="col-span-2 text-center font-bold">{item.quantity}</p>
                          <p className="col-span-2 text-right font-mono text-muted-foreground text-xs">{formatINR(unitPrice)}</p>
                          <p className="col-span-2 text-right font-mono font-bold">{formatINR(lineTotal)}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30">
                    <div className="px-4 py-2.5 flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span><span className="font-mono">{formatINR(subtotal)}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="px-4 py-2.5 flex justify-between text-sm text-green-600 font-semibold">
                        <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Discount</span>
                        <span className="font-mono">-{formatINR(selectedInvoice.discount)}</span>
                      </div>
                    )}
                    <div className="px-4 py-2.5 flex justify-between text-sm text-muted-foreground">
                      <span>GST / Tax</span><span className="font-mono">{formatINR(selectedInvoice.tax_amount)}</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between text-base font-black bg-muted/10">
                      <span>Total</span><span className="font-mono text-primary">{formatINR(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>

                  {selectedInvoice.notes && (
                    <div className="rounded-xl border border-border/40 px-4 py-3 text-sm text-muted-foreground bg-muted/5">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Order Notes</p>
                      <p>{selectedInvoice.notes}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-border/40 bg-muted/5 flex flex-wrap gap-2">
                {/* Reprint options */}
                <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => handlePrint("thermal")}>
                  <Printer className="w-4 h-4" /> Thermal Receipt
                </Button>
                <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => handlePrint("a4")}>
                  <FileText className="w-4 h-4" /> A4 Invoice
                </Button>
                {onStartReturn && selectedInvoice.status !== "refunded" && (
                  <Button variant="outline" size="sm" className="gap-2 w-full border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                    onClick={() => { onStartReturn(selectedInvoice.id); setShowRecentOrders(false); setSelectedInvoice(null); }}>
                    <RefreshCw className="w-4 h-4" /> Start Return / Exchange
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
