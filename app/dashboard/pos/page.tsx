"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Product, type Invoice, type InvoiceItem } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "split">("card");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitDetails, setSplitDetails] = useState({ cash: 0, card: 0, upi: 0 });

  const user = useAuthStore(state => state.user);
  const { items, discount, addItem, updateQuantity, removeItem, setDiscount, clearCart, getTotals } = useCartStore();
  const { subtotal, taxAmount, total } = getTotals();

  const allProducts = useLiveQuery(() => db.products.toArray(), []) || [];
  
  // Also fetch inventory so we don't oversell, though for POS speed sometimes we allow negative stock or just warn.
  // For simplicity, we just search products.
  
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return allProducts;
    const lower = searchQuery.toLowerCase();
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.sku.toLowerCase().includes(lower) || 
      p.brand.toLowerCase().includes(lower)
    );
  }, [allProducts, searchQuery]);

  const handleCheckout = async () => {
    if (!user?.branch_id) {
      alert("No branch assigned to user. Cannot process bill.");
      return;
    }
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      const invoiceId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const newInvoice: Invoice = {
        id: invoiceId,
        branch_id: user.branch_id,
        user_id: user.id,
        total_amount: total,
        tax_amount: taxAmount,
        discount,
        payment_method: paymentMethod,
        status: "completed",
        created_at: timestamp,
      };

      const invoiceItems: InvoiceItem[] = items.map(item => ({
        id: crypto.randomUUID(),
        invoice_id: invoiceId,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        gst_amount: (item.product.price * item.quantity * item.product.gst_percent) / 100,
      }));

      await db.transaction('rw', db.invoices, db.invoice_items, db.inventory, db.sync_queue, async () => {
        // Save Invoice
        await db.invoices.add(newInvoice);
        await db.sync_queue.add({ table_name: 'invoices', operation: 'INSERT', data: newInvoice, timestamp });

        // Save Items and Deduct Stock
        for (const item of invoiceItems) {
          await db.invoice_items.add(item);
          await db.sync_queue.add({ table_name: 'invoice_items', operation: 'INSERT', data: item, timestamp });

          // Deduct Stock
          const invRecord = await db.inventory.where({ product_id: item.product_id, branch_id: user.branch_id! }).first();
          if (invRecord) {
            const updatedStock = invRecord.stock - item.quantity;
            await db.inventory.update(invRecord.id, { stock: updatedStock, last_updated: timestamp });
            await db.sync_queue.add({ table_name: 'inventory', operation: 'UPDATE', data: { ...invRecord, stock: updatedStock }, timestamp });
          }
        }
      });

      // Clear cart after successful transaction
      clearCart();
      setIsCheckoutOpen(false);
      setPaymentMethod("card");
      alert("Invoice generated successfully!");
      // Here you would typically trigger the print dialog / open the invoice PDF
    } catch (err) {
      console.error(err);
      alert("Transaction failed. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 overflow-hidden">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Search by SKU, Name, or Brand... (Press '/' to focus)" 
            className="pl-10 h-14 text-lg bg-card/50 border-border/50 focus-visible:ring-primary shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors bg-card/30 active:scale-95"
                onClick={() => addItem(product)}
              >
                <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{product.sku}</p>
                    <p className="font-bold leading-tight mt-1">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.brand} - {product.size}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <p className="font-black text-primary text-lg">${product.price.toFixed(2)}</p>
                    <span className="text-[10px] uppercase bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-bold">
                      +{product.gst_percent}% GST
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Area */}
      <div className="w-96 flex flex-col bg-card/50 border border-border/50 rounded-xl overflow-hidden shadow-2xl shrink-0">
        <div className="p-4 bg-secondary/50 border-b border-border/50 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Current Order</h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
              <ShoppingCart className="w-12 h-12 mb-4" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.product.id} className="flex gap-3 bg-background/50 p-3 rounded-lg border border-border/30 relative group">
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-tight pr-6">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.sku} | Size {item.product.size}</p>
                    <p className="font-mono text-primary font-bold mt-1">${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-center justify-between">
                    <button onClick={() => removeItem(item.product.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 mt-auto bg-secondary rounded-md p-1">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-background rounded text-foreground"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-background rounded text-foreground"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border/50 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST (Tax)</span>
            <span className="font-mono">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              Discount
              <Input 
                type="number" 
                className="w-20 h-7 text-right bg-secondary/50 border-none" 
                value={discount || ''} 
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </span>
            <span className="font-mono text-destructive">-${discount.toFixed(2)}</span>
          </div>
          <div className="border-t border-border/50 pt-3 flex justify-between items-center">
            <span className="font-bold text-lg">Total</span>
            <span className="font-black text-3xl text-primary font-mono">${total.toFixed(2)}</span>
          </div>

          <Button 
            className="w-full h-14 text-lg font-black uppercase tracking-wider" 
            disabled={items.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            <Receipt className="w-5 h-5 mr-2" /> Pay Now
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Complete Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="text-center p-6 bg-secondary/30 rounded-xl border border-primary/20 shadow-[inset_0_0_20px_rgba(var(--primary),0.1)]">
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest mb-1">Total Amount Due</p>
              <p className="text-5xl font-black text-primary font-mono">${total.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger className="h-12 text-lg font-medium">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit / Debit Card</SelectItem>
                  <SelectItem value="upi">UPI (QR Code)</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="split">Split Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "split" && (
              <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-background/50">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Split Amounts</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Cash</Label>
                    <Input type="number" value={splitDetails.cash} onChange={e => setSplitDetails({...splitDetails, cash: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Card</Label>
                    <Input type="number" value={splitDetails.card} onChange={e => setSplitDetails({...splitDetails, card: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">UPI</Label>
                    <Input type="number" value={splitDetails.upi} onChange={e => setSplitDetails({...splitDetails, upi: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground mt-2">
                  Remaining: ${(total - (splitDetails.cash + splitDetails.card + splitDetails.upi)).toFixed(2)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="h-12 px-8">Cancel</Button>
            <Button onClick={handleCheckout} disabled={isProcessing || (paymentMethod === "split" && Math.abs(total - (splitDetails.cash + splitDetails.card + splitDetails.upi)) > 0.01)} className="h-12 px-8 font-bold">
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
