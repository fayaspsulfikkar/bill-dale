"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Product, type Invoice, type InvoiceItem, type HeldOrder } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { usePOSStore } from "@/store/posStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, ScanBarcode, Trash, CreditCard, Banknote, QrCode, PieChart, Loader2, BadgeCheck, AlertCircle, Edit2, ShoppingBag, Clock, RotateCcw, RefreshCw, Keyboard, Wallet, Zap, History, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PrintThermalReceipt } from "@/components/pos/PrintThermalReceipt";
import { PrintA4Invoice } from "@/components/pos/PrintA4Invoice";
import { CustomerPanel } from "@/components/pos/CustomerPanel";
import { HeldOrdersDrawer } from "@/components/pos/HeldOrdersDrawer";
import { ReturnExchangeModal } from "@/components/pos/ReturnExchangeModal";
import { RecentOrdersDrawer } from "@/components/pos/RecentOrdersDrawer";
import { CashRegisterModal } from "@/components/pos/CashRegisterModal";
import { QuickAddItemModal } from "@/components/pos/QuickAddItemModal";
import { KeyboardShortcutsModal } from "@/components/pos/KeyboardShortcutsModal";
import { OnlineStatusBar } from "@/components/pos/OnlineStatusBar";
import { LowStockAlertBar } from "@/components/pos/LowStockAlertBar";
import { OrderNotesField } from "@/components/pos/OrderNotesField";
import { LoyaltyPanel } from "@/components/pos/LoyaltyPanel";
import { TaxBreakdown } from "@/components/pos/TaxBreakdown";
import { generateInvoiceNumber } from "@/lib/invoiceNumber";
import { formatINR } from "@/lib/formatCurrency";
import { useDataSync } from "@/hooks/useDataSync";


export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [scanError, setScanError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "split">("card");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitDetails, setSplitDetails] = useState({ cash: 0, card: 0, upi: 0 });
  const [amountTendered, setAmountTendered] = useState<number | "">("");
  const [selectedProductGroup, setSelectedProductGroup] = useState<Product[] | null>(null);
  const [editingItem, setEditingItem] = useState<{ productId: string; discount: number; price: number | '' } | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showReturn, setShowReturn] = useState(false);

  const [completedTransaction, setCompletedTransaction] = useState<{
    invoice: Invoice;
    items: any[];
    amountTendered?: number;
    changeDue?: number;
  } | null>(null);
  const [printMode, setPrintMode] = useState<"thermal" | "a4" | null>(null);

  useEffect(() => {
    if (printMode !== null) {
      const frame = requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          setCompletedTransaction(null);
          setPrintMode(null);
          clearCart();
          resetPOSState();
          setPaymentMethod("card");
          setAmountTendered("");
          setSplitDetails({ cash: 0, card: 0, upi: 0 });
        }, 300);
      });
      return () => cancelAnimationFrame(frame);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printMode]);

  const { user, businessId, role } = useAuthStore();
  const dbUser = useLiveQuery(() => user ? db.users.get(user.id) : undefined, [user?.id]);

  // Sync branches + inventory from Supabase → Dexie on mount
  useDataSync();
  const { items, discount, addItem, updateQuantity, updateItemDiscount, updateItemPrice, removeItem, setDiscount, clearCart, getTotals } = useCartStore();
  const { subtotal, taxAmount, total } = getTotals();
  const { selectedCustomer, selectedBranchId, setSelectedBranchId, setShowHeldOrders, setShowRecentOrders, setShowCashRegister, setShowQuickAdd, setShowShortcutsHelp, orderNotes, resetPOSState } = usePOSStore();

  const business = useLiveQuery(() => businessId ? db.businesses.get(businessId) : undefined, [businessId]);
  const allBranches = useLiveQuery(() => db.branches.toArray(), []) ?? [];
  const allProducts = useLiveQuery(() => db.products.toArray(), []) || [];
  const allInventory = useLiveQuery(() => db.inventory.toArray(), []) || [];

  // Active branch: from persisted posStore, else staff's branch, else first branch
  const activeBranch = allBranches.find(b => b.id === selectedBranchId)
    ?? (dbUser?.branch_id ? allBranches.find(b => b.id === dbUser.branch_id) : null)
    ?? allBranches[0];
  const resolvedBranchId = activeBranch?.id ?? null;

  // Auto-set selectedBranchId once branches load (if not yet set)
  useEffect(() => {
    if (!selectedBranchId && allBranches.length > 0) {
      const staffBranch = dbUser?.branch_id ? allBranches.find(b => b.id === dbUser.branch_id) : null;
      setSelectedBranchId((staffBranch ?? allBranches[0]).id);
    }
  }, [allBranches, selectedBranchId, dbUser?.branch_id]);

  // Stock for current branch only
  const getStock = (productId: string) => {
    if (resolvedBranchId) {
      return allInventory.filter(i => i.product_id === productId && i.branch_id === resolvedBranchId).reduce((s, i) => s + i.stock, 0);
    }
    return allInventory.filter(i => i.product_id === productId).reduce((s, i) => s + i.stock, 0);
  };

  // Cross-branch availability (other branches that have stock)
  const getOtherBranchStock = (productId: string): { name: string; stock: number }[] => {
    return allBranches
      .filter(b => b.id !== resolvedBranchId)
      .map(b => ({ name: b.name, stock: allInventory.filter(i => i.product_id === productId && i.branch_id === b.id).reduce((s, i) => s + i.stock, 0) }))
      .filter(b => b.stock > 0);
  };

  const getCartQuantity = (productId: string) => items.find(i => i.product.id === productId)?.quantity || 0;

  const categories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.category).filter(Boolean));
    return ["All", ...Array.from(cats), "Low Stock", "Out of Stock"];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    if (activeCategory === "Low Stock") filtered = filtered.filter(p => { const s = getStock(p.id); return s > 0 && s <= (p.low_stock_threshold ?? 5); });
    else if (activeCategory === "Out of Stock") filtered = filtered.filter(p => getStock(p.id) === 0);
    else if (activeCategory !== "All") filtered = filtered.filter(p => p.category === activeCategory);
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower) || p.brand.toLowerCase().includes(lower));
    }
    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, searchQuery, activeCategory, allInventory]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => { if (!groups[p.name]) groups[p.name] = []; groups[p.name].push(p); });
    return Object.values(groups);
  }, [filteredProducts]);

  // Hold Order
  const handleHoldOrder = async () => {
    if (items.length === 0) return;
    const heldOrder: HeldOrder = {
      id: crypto.randomUUID(),
      business_id: businessId ?? "",
      branch_id: resolvedBranchId ?? "",
      user_id: user?.id ?? "",
      user_name: user?.name ?? user?.email ?? "",
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.name ?? "Walk-in Customer",
      items: JSON.stringify(items),
      discount,
      notes: orderNotes,
      total_amount: total,
      created_at: new Date().toISOString(),
    };
    await db.held_orders.add(heldOrder);
    clearCart();
    resetPOSState();
  };

  const handleQuickCash = (amt: number) => { setPaymentMethod("cash"); setAmountTendered(amt); };

  // Barcode scanner
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      setScanError(false);
      const match = allProducts.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
      if (match) { addItem(match, 1); setSearchQuery(""); }
      else { setScanError(true); setTimeout(() => setScanError(false), 2000); }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === '/' && !inInput) { e.preventDefault(); document.querySelector<HTMLInputElement>('#pos-search')?.focus(); }
      if (e.ctrlKey) {
        if (e.key === 'p') { e.preventDefault(); if (items.length > 0) setIsCheckoutOpen(true); }
        if (e.key === 'h') { e.preventDefault(); handleHoldOrder(); }
        if (e.key === 'r') { e.preventDefault(); setShowReturn(true); }
        if (e.key === 'b') { e.preventDefault(); setShowHeldOrders(true); }
        if (e.key === 'o') { e.preventDefault(); setShowRecentOrders(true); }
        if (e.key === 'q') { e.preventDefault(); setShowQuickAdd(true); }
        if (e.key === 'k') { e.preventDefault(); setShowShortcutsHelp(true); }
      }
      if (e.key === 'Escape') { setSearchQuery(""); setScanError(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, businessId]);

  const renderStockBadge = (stock: number, threshold = 5) => {
    if (stock <= 0) return <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-bold">Out of stock</span>;
    if (stock <= threshold) return <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded font-bold">Only {stock} left</span>;
    return <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold">In stock</span>;
  };


  const handleCheckout = async () => {
    if (!resolvedBranchId) { alert("No branch found. Please add a branch in Settings first."); return; }
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      const invoiceId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const invoiceNumber = await generateInvoiceNumber(resolvedBranchId, activeBranch?.name ?? "STORE");

      const newInvoice: Invoice = {
        id: invoiceId,
        invoice_number: invoiceNumber,
        branch_id: resolvedBranchId,
        user_id: user?.id ?? "unknown",
        customer_id: selectedCustomer && selectedCustomer.id !== "__walk_in__" ? selectedCustomer.id : undefined,
        total_amount: total,
        tax_amount: taxAmount,
        discount,
        payment_method: paymentMethod,
        notes: orderNotes || undefined,
        status: "completed",
        created_at: timestamp,
      };

      const invoiceItems: InvoiceItem[] = items.map(item => {
        const unitPrice = item.overridePrice !== undefined ? item.overridePrice : item.product.price;
        const lineBase = unitPrice * item.quantity;
        const lineAfterDiscount = Math.max(0, lineBase - item.itemDiscount);
        return {
          id: crypto.randomUUID(),
          invoice_id: invoiceId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: unitPrice,
          gst_amount: (lineAfterDiscount * item.product.gst_percent) / 100,
          item_discount: item.itemDiscount,
          override_price: item.overridePrice,
          is_custom_item: item.product.id.startsWith('CUSTOM-'),
        };
      });

      await db.transaction('rw', db.invoices, db.invoice_items, db.inventory, db.sync_queue, async () => {
        // Save Invoice
        await db.invoices.add(newInvoice);
        await db.sync_queue.add({ table_name: 'invoices', operation: 'INSERT', data: newInvoice, timestamp });

        // Save Items and Deduct Stock
        for (const item of invoiceItems) {
          await db.invoice_items.add(item);
          await db.sync_queue.add({ table_name: 'invoice_items', operation: 'INSERT', data: item, timestamp });

          // Deduct Stock — find by product_id only (branch_id may vary per product)
          const invRecord = await db.inventory.where('product_id').equals(item.product_id).first();
          if (invRecord) {
            const updatedStock = Math.max(0, invRecord.stock - item.quantity);
            await db.inventory.update(invRecord.id, { stock: updatedStock, last_updated: timestamp });
            await db.sync_queue.add({ table_name: 'inventory', operation: 'UPDATE', data: { ...invRecord, stock: updatedStock }, timestamp });
          }
        }
      });

      // Store completed transaction to show print modal
      setCompletedTransaction({
        invoice: newInvoice,
        items: [...items], // Clone items since we will clear cart
        amountTendered: typeof amountTendered === 'number' ? amountTendered : undefined,
        changeDue: paymentMethod === 'cash' && typeof amountTendered === 'number' ? amountTendered - total : undefined
      });

      setIsCheckoutOpen(false);
      // We do NOT clear cart or reset payment method here yet. We do it when they close the success modal.
    } catch (err) {
      console.error(err);
      alert("Transaction failed. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Global modals / drawers */}
      <HeldOrdersDrawer />
      <RecentOrdersDrawer onStartReturn={(id) => { setShowReturn(true); }} />
      <CashRegisterModal />
      <QuickAddItemModal />
      <KeyboardShortcutsModal />
      <ReturnExchangeModal open={showReturn} onClose={() => setShowReturn(false)} />

      {/* Variant Selector Dialog */}
      <Dialog open={!!selectedProductGroup} onOpenChange={(o) => !o && setSelectedProductGroup(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="font-bold">{selectedProductGroup?.[0]?.name ?? "Select Variant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {selectedProductGroup?.map((variant) => {
              const stock = getStock(variant.id);
              const inCart = getCartQuantity(variant.id);
              const isOut = stock <= 0;
              return (
                <button
                  key={variant.id}
                  onClick={() => {
                    addItem(variant, 1);
                    setSelectedProductGroup(null);
                  }}
                  disabled={isOut}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left ${
                    isOut
                      ? "border-border/30 opacity-50 cursor-not-allowed"
                      : "border-border/60 hover:border-primary/50 hover:bg-muted/40 active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">
                      {[variant.size, variant.color].filter(Boolean).join(" · ") || variant.sku}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{variant.sku}</p>
                    {inCart > 0 && (
                      <p className="text-[10px] text-primary font-bold mt-0.5">{inCart} in cart</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-black text-primary font-mono">{formatINR(variant.price)}</p>
                    {isOut
                      ? <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-bold">Out of stock</span>
                      : stock <= 5
                        ? <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded font-bold">Only {stock} left</span>
                        : <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold">In stock ({stock})</span>
                     }
                    {/* Cross-branch availability hint */}
                    {isOut && (() => {
                      const others = getOtherBranchStock(variant.id);
                      if (others.length === 0) return null;
                      return (
                        <p className="text-[10px] text-blue-500 font-semibold mt-1">
                          Available at: {others.map(o => `${o.name} (${o.stock})`).join(", ")}
                        </p>
                      );
                    })()}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-[calc(100vh-6rem)] gap-6 overflow-hidden print:hidden">
        {/* Product Selection Area */}
        <div className="flex-1 flex flex-col bg-background rounded-xl overflow-hidden shadow-sm border border-border/40">
          <OnlineStatusBar />
          <LowStockAlertBar />
          <div className="p-4 bg-card/40 border-b border-border/40 shrink-0">

          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              id="pos-search"
              placeholder="Search products or scan barcode (Enter to add)..."
              className={`pl-12 pr-12 h-14 text-lg bg-background border-border focus-visible:ring-primary shadow-sm rounded-lg w-full ${scanError ? 'border-destructive' : ''}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <ScanBarcode className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 ${scanError ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          </div>
          {scanError && <p className="text-xs text-destructive mt-1">No product found for this barcode/SKU.</p>}
          <div className="flex gap-2 mt-3 pb-1 overflow-x-auto" style={{scrollbarWidth:'none'}}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground hover:border-primary/40'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 bg-muted/10">
          {groupedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-60">
              <Search className="w-12 h-12 mb-4" />
              <p className="text-lg">{searchQuery ? `No products found for "${searchQuery}"` : 'No products in this category'}</p>
              <p className="text-sm mt-2">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
              {groupedProducts.map(group => {
                const representative = group[0];
                const stock = group.reduce((s, p) => s + getStock(p.id), 0);
                const cartQty = group.reduce((s, p) => s + getCartQuantity(p.id), 0);
                const isOutOfStock = stock === 0;
                return (
                  <Card
                    key={representative.name}
                    className={`cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card active:scale-[0.98] ${isOutOfStock ? 'opacity-60' : ''}`}
                    onClick={() => {
                      if (group.length > 1) setSelectedProductGroup(group);
                      else addItem(representative, 1);
                    }}
                  >
                    <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono text-muted-foreground bg-muted inline-block px-1.5 py-0.5 rounded mb-1.5">{representative.sku}{group.length > 1 ? ` +${group.length - 1}` : ''}</p>
                        <p className="font-bold leading-tight line-clamp-2">{representative.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{representative.brand}{representative.size ? ` • ${representative.size}` : ''}</p>
                      </div>
                      <div className="space-y-1">
                        {renderStockBadge(stock, representative.low_stock_threshold ?? 5)}
                        <div className="flex justify-between items-end pt-1 border-t border-border/40">
                          <p className="font-black text-primary text-lg tracking-tight">{formatINR(representative.price)}</p>
                          <span className="text-[10px] uppercase text-muted-foreground font-semibold">+{representative.gst_percent}% GST</span>
                        </div>
                        {cartQty > 0 && <div className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 text-center">{cartQty} in cart</div>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart Area */}
      <div className="w-[400px] xl:w-[450px] flex flex-col bg-card/80 border border-border/60 rounded-xl overflow-hidden shadow-2xl shrink-0">
        {/* Branch Selector */}
        {allBranches.length > 0 && (
          <div className="px-3 py-2 bg-primary/5 border-b border-border/40 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">Branch:</span>
            <select
              value={selectedBranchId ?? ""}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="flex-1 text-xs font-bold bg-transparent border-none outline-none text-foreground cursor-pointer truncate"
            >
              {allBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name}{b.location ? ` — ${b.location}` : ""}</option>
              ))}
            </select>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeBranch?.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {activeBranch?.is_active ? "OPEN" : "INACTIVE"}
            </span>
          </div>
        )}
        {/* Customer panel */}
        <CustomerPanel />
        <div className="p-3 bg-card border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-none">Current Order</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{items.length} items</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button title="Recent Orders (Ctrl+O)" onClick={() => setShowRecentOrders(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><History className="w-4 h-4" /></button>
            <button title="Held Orders (Ctrl+B)" onClick={() => setShowHeldOrders(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ShoppingBag className="w-4 h-4" /></button>
            <button title="Hold Order (Ctrl+H)" onClick={handleHoldOrder} disabled={items.length === 0} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 disabled:opacity-40 transition-colors"><Clock className="w-4 h-4" /></button>
            <button title="Return / Exchange (Ctrl+R)" onClick={() => setShowReturn(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors"><RotateCcw className="w-4 h-4" /></button>
            <button title="Quick Add Item (Ctrl+Q)" onClick={() => setShowQuickAdd(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Zap className="w-4 h-4" /></button>
            <button title="Cash Register" onClick={() => setShowCashRegister(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors"><Wallet className="w-4 h-4" /></button>
            {items.length > 0 && <button onClick={clearCart} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash className="w-4 h-4" /></button>}
          </div>
        </div>


        <ScrollArea className="flex-1 p-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-16 px-6 text-center">
              <ShoppingCart className="w-14 h-14 mb-4 opacity-50" />
              <p className="text-base font-medium">Cart is empty</p>
              <p className="text-sm mt-2">Search or scan a product to start billing.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const unitPrice = item.overridePrice !== undefined ? item.overridePrice : item.product.price;
                const lineTotal = unitPrice * item.quantity - item.itemDiscount;
                return (
                  <div key={item.product.id} className="flex gap-3 bg-background p-3 rounded-xl border border-border shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-sm leading-tight truncate">{item.product.name}</p>
                        <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">{item.product.sku}{item.product.size && ` · ${item.product.size}`}</p>
                      {item.itemDiscount > 0 && <p className="text-xs text-green-600">-{formatINR(item.itemDiscount)} discount</p>}
                      {item.overridePrice !== undefined && <p className="text-xs text-amber-600">Custom price: {formatINR(item.overridePrice)}</p>}
                      <div className="flex justify-between items-center mt-2">
                        <p className="font-mono text-primary font-bold">{formatINR(Math.max(0, lineTotal))}</p>
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border/50">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-md transition-colors"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-md transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-card border-t border-border/60 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono text-foreground">{formatINR(subtotal)}</span>
            </div>
            <TaxBreakdown businessState={business?.state} />
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">₹</span>
                <Input
                  type="number"
                  className="w-20 h-7 text-right bg-muted border-none font-mono text-sm focus-visible:ring-1 focus-visible:ring-primary px-2"
                  value={discount || ''}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <LoyaltyPanel total={total} />
          <OrderNotesField />

          <div className="border-t border-border/60 pt-3 pb-3 flex justify-between items-end mt-3">
            <span className="font-bold text-base text-muted-foreground">Total Due</span>
            <span className="font-black text-3xl text-primary font-mono tracking-tight">{formatINR(total)}</span>
          </div>

          <Button
            className="w-full h-14 text-base font-black uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all"
            disabled={items.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            title="Pay Now (Ctrl+P)"
          >
            <Receipt className="w-5 h-5 mr-2" /> Pay Now
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-5xl w-[95vw] bg-card border-border/60 shadow-2xl p-0 overflow-hidden">
          <div className="flex h-[80vh] min-h-[500px] max-h-[700px]">
            {/* Left Column: Summary & Quick Cash */}
            <div className="w-1/3 bg-muted/10 border-r border-border/60 flex flex-col">
              <DialogHeader className="px-6 py-6 border-b border-border/60 bg-background/50 backdrop-blur-sm">
                <DialogTitle className="text-2xl font-black tracking-tight">Checkout</DialogTitle>
              </DialogHeader>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Summary */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Order Summary</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">GST (Tax)</span>
                    <span className="font-mono font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-500">
                      <span>Discount</span>
                      <span className="font-mono font-medium">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-4 mt-4 border-t border-border/60 flex justify-between items-end">
                    <span className="text-sm font-bold uppercase text-muted-foreground">Total Due</span>
                    <span className="text-4xl font-black text-primary font-mono tracking-tighter">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Quick Cash */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Cash</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-12 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => handleQuickCash(total)}>Exact: ${total.toFixed(2)}</Button>
                    {[10, 20, 50, 100].map(amt => (
                      <Button key={amt} variant="outline" className="h-12 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => handleQuickCash(amt)}>${amt}</Button>
                    ))}
                    <Button variant="outline" className="h-12 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => handleQuickCash(Math.ceil(total / 10) * 10)}>Next ${Math.ceil(total / 10) * 10}</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Details */}
            <div className="flex-1 flex flex-col bg-background relative">
              <div className="p-8 flex-1 overflow-y-auto space-y-8">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Payment Method</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: "card", icon: CreditCard, label: "Card" },
                      { id: "upi", icon: QrCode, label: "UPI" },
                      { id: "cash", icon: Banknote, label: "Cash" },
                      { id: "split", icon: PieChart, label: "Split" }
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                          paymentMethod === method.id 
                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                            : "border-border/60 bg-muted/10 text-muted-foreground hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <method.icon className={`w-6 h-6 mb-2 ${paymentMethod === method.id ? "opacity-100" : "opacity-70"}`} />
                        <span className="text-sm font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Content based on Payment Method */}
                <div className="pt-4 border-t border-border/40">
                  {paymentMethod === "card" && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-80">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <CreditCard className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="text-lg font-bold mb-1">Process Card on Terminal</h4>
                      <p className="text-sm text-muted-foreground">Ask the customer to tap, insert, or swipe their card.</p>
                    </div>
                  )}
                  
                  {paymentMethod === "upi" && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-80">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <QrCode className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="text-lg font-bold mb-1">Scan QR Code</h4>
                      <p className="text-sm text-muted-foreground">Customer can scan the UPI QR code on the display.</p>
                    </div>
                  )}

                  {paymentMethod === "cash" && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount Tendered</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            autoFocus
                            className="pl-9 h-20 text-4xl font-black font-mono rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/20" 
                            placeholder="0.00" 
                            value={amountTendered} 
                            onChange={e => setAmountTendered(e.target.value ? parseFloat(e.target.value) : "")} 
                          />
                        </div>
                      </div>

                      {typeof amountTendered === 'number' && amountTendered >= total && (
                        <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-green-600 dark:text-green-500 mb-1">Change Due</p>
                            <p className="text-4xl font-black font-mono text-green-700 dark:text-green-400">
                              ${(amountTendered - total).toFixed(2)}
                            </p>
                          </div>
                          <Banknote className="w-12 h-12 text-green-500/50" />
                        </div>
                      )}
                      {typeof amountTendered === 'number' && amountTendered < total && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
                          <AlertCircle className="w-5 h-5" />
                          <p className="text-sm font-bold">Tendered amount is less than total due (${(total - amountTendered).toFixed(2)} short).</p>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === "split" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3"/> Cash</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input type="number" className="pl-7 h-12 bg-muted/20 text-lg font-mono rounded-xl border-border/60" placeholder="0.00" value={splitDetails.cash || ''} onChange={e => setSplitDetails({...splitDetails, cash: parseFloat(e.target.value) || 0})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3"/> Card</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input type="number" className="pl-7 h-12 bg-muted/20 text-lg font-mono rounded-xl border-border/60" placeholder="0.00" value={splitDetails.card || ''} onChange={e => setSplitDetails({...splitDetails, card: parseFloat(e.target.value) || 0})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="w-3 h-3"/> UPI</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input type="number" className="pl-7 h-12 bg-muted/20 text-lg font-mono rounded-xl border-border/60" placeholder="0.00" value={splitDetails.upi || ''} onChange={e => setSplitDetails({...splitDetails, upi: parseFloat(e.target.value) || 0})} />
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const splitTotal = splitDetails.cash + splitDetails.card + splitDetails.upi;
                        const remaining = total - splitTotal;
                        
                        if (remaining > 0.01) {
                          return (
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                              <AlertCircle className="w-5 h-5 text-destructive" />
                              <div>
                                <p className="text-sm font-bold text-destructive">Remaining Balance: ${remaining.toFixed(2)}</p>
                                <p className="text-xs text-destructive/80">Please tender full amount.</p>
                              </div>
                            </div>
                          );
                        } else if (remaining < -0.01) {
                          return (
                            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold uppercase tracking-widest text-green-600 dark:text-green-500 mb-1">Change Due</p>
                                <p className="text-4xl font-black font-mono text-green-700 dark:text-green-400">
                                  ${Math.abs(remaining).toFixed(2)}
                                </p>
                              </div>
                              <Banknote className="w-12 h-12 text-green-500/50" />
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                              <BadgeCheck className="w-5 h-5 text-green-600 dark:text-green-500" />
                              <p className="text-sm font-bold text-green-700 dark:text-green-400">Amount Exactly Matched.</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="p-6 bg-background border-t border-border/60 flex items-center justify-between gap-4">
                <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)} className="h-14 px-8 rounded-2xl text-base font-bold hover:bg-muted/50">Cancel</Button>
                <Button 
                  onClick={handleCheckout} 
                  disabled={
                    isProcessing || 
                    (paymentMethod === "cash" && (typeof amountTendered !== 'number' || amountTendered < total)) ||
                    (paymentMethod === "split" && (total - (splitDetails.cash + splitDetails.card + splitDetails.upi) > 0.01))
                  } 
                  className="flex-1 h-14 font-bold rounded-2xl text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  {isProcessing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> : "Complete Transaction"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      {/* Transaction Success & Print Dialog */}
      <Dialog 
        open={completedTransaction !== null && printMode === null} 
        onOpenChange={(open) => {
          // Only clear state when user manually dismisses the dialog,
          // NOT when printMode is activated (which also sets open→false)
          if (!open && printMode === null) {
            clearCart();
            setPaymentMethod("card");
            setAmountTendered("");
            setSplitDetails({ cash: 0, card: 0, upi: 0 });
            setCompletedTransaction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl overflow-hidden print:hidden">
          <DialogHeader className="text-center sm:text-center pb-4 border-b border-border/40">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <BadgeCheck className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <DialogTitle className="text-2xl font-black">Transaction Complete</DialogTitle>
            <p className="text-muted-foreground text-sm mt-2">
              Invoice {completedTransaction?.invoice.id.split('-')[0].toUpperCase()} generated successfully.
            </p>
          </DialogHeader>

          <div className="py-6 flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="h-14 justify-start px-6 font-bold text-base hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
              onClick={() => setPrintMode('thermal')}
            >
              <Receipt className="w-5 h-5 mr-3 opacity-70" />
              Print Thermal Receipt
            </Button>
            <Button 
              variant="outline" 
              className="h-14 justify-start px-6 font-bold text-base hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
              onClick={() => setPrintMode('a4')}
            >
              <ScanBarcode className="w-5 h-5 mr-3 opacity-70" />
              Print A4 Invoice
            </Button>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button 
              className="w-full h-12 font-bold text-lg"
              onClick={() => {
                clearCart();
                setPaymentMethod("card");
                setAmountTendered("");
                setSplitDetails({ cash: 0, card: 0, upi: 0 });
                setCompletedTransaction(null);
              }}
            >
              Start New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Areas — normal document flow, but only visible during @media print */}
      <div className="hidden print:block w-full bg-white">
        {printMode === 'thermal' && completedTransaction && (
          <PrintThermalReceipt 
            invoice={completedTransaction.invoice} 
            items={completedTransaction.items}
            amountTendered={completedTransaction.amountTendered}
            changeDue={completedTransaction.changeDue}
            businessName={business?.name}
          />
        )}
        {printMode === 'a4' && completedTransaction && (
          <PrintA4Invoice 
            invoice={completedTransaction.invoice} 
            items={completedTransaction.items}
            amountTendered={completedTransaction.amountTendered}
            changeDue={completedTransaction.changeDue}
            businessName={business?.name}
          />
        )}
      </div>
    </>
  );
}
