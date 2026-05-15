"use client";

import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Product, type Invoice, type InvoiceItem } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, ScanBarcode, Trash, CreditCard, Banknote, QrCode, PieChart, Loader2, BadgeCheck, AlertCircle, Edit2, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PrintThermalReceipt } from "@/components/pos/PrintThermalReceipt";
import { PrintA4Invoice } from "@/components/pos/PrintA4Invoice";

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [scanError, setScanError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "split">("card");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitDetails, setSplitDetails] = useState({ cash: 0, card: 0, upi: 0 });
  const [amountTendered, setAmountTendered] = useState<number | "">("");

  // Post Checkout Print State
  const [completedTransaction, setCompletedTransaction] = useState<{
    invoice: Invoice,
    items: any[],
    amountTendered?: number,
    changeDue?: number
  } | null>(null);
  const [printMode, setPrintMode] = useState<"thermal" | "a4" | null>(null);

  // Trigger window.print() AFTER the print component has rendered in DOM
  useEffect(() => {
    if (printMode !== null) {
      const frame = requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          setCompletedTransaction(null);
          setPrintMode(null);
          clearCart();
          setPaymentMethod("card");
          setAmountTendered("");
          setSplitDetails({ cash: 0, card: 0, upi: 0 });
        }, 300);
      });
      return () => cancelAnimationFrame(frame);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printMode]);

  const handleQuickCash = (amt: number) => {
    setPaymentMethod("cash");
    setAmountTendered(amt);
  };

  const { user, businessId, role } = useAuthStore();
  const { items, discount, addItem, updateQuantity, updateItemDiscount, updateItemPrice, removeItem, setDiscount, clearCart, getTotals } = useCartStore();
  const { subtotal, taxAmount, total } = getTotals();

  const business = useLiveQuery(() => businessId ? db.businesses.get(businessId) : undefined, [businessId]);
  const allProducts = useLiveQuery(() => db.products.toArray(), []) || [];
  const allInventory = useLiveQuery(() => db.inventory.toArray(), []) || [];
  const activeBranchId = businessId ?? "default-branch";

  const getStock = (productId: string) => {
    const inv = allInventory.find(inv => inv.product_id === productId && inv.branch_id === activeBranchId);
    return inv ? inv.stock : 0;
  };

  const getCartQuantity = (productId: string) => {
    return items.find(i => i.product.id === productId)?.quantity || 0;
  };

  // Filter Categories
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.category));
    return ["All", ...Array.from(cats), "Low Stock", "Out of Stock"];
  }, [allProducts]);
  
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    if (activeCategory !== "All") {
      if (activeCategory === "Low Stock") {
        filtered = filtered.filter(p => {
          const stock = getStock(p.id);
          return stock > 0 && stock <= 5;
        });
      } else if (activeCategory === "Out of Stock") {
        filtered = filtered.filter(p => getStock(p.id) === 0);
      } else {
        filtered = filtered.filter(p => p.category === activeCategory);
      }
    }
    
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower) || 
        p.brand.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [allProducts, searchQuery, activeCategory, allInventory]);

  // Group Variants by Name
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.name]) groups[p.name] = [];
      groups[p.name].push(p);
    });
    return Object.values(groups);
  }, [filteredProducts]);

  // Barcode Scanner Listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      e.preventDefault();
      setScanError(false);
      const match = allProducts.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
      if (match) {
        addItem(match, 1);
        setSearchQuery("");
      } else {
        setScanError(true);
        setTimeout(() => setScanError(false), 2000);
      }
    }
  };

  // Variant Modal State
  const [selectedProductGroup, setSelectedProductGroup] = useState<Product[] | null>(null);

  const handleProductClick = (group: Product[]) => {
    if (group.length === 1) {
      addItem(group[0], 1);
    } else {
      setSelectedProductGroup(group);
    }
  };

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<{ productId: string, discount: number, price: number | '' } | null>(null);

  const handleCheckout = async () => {
    if (!activeBranchId) {
      alert("No branch assigned. Cannot process bill.");
      return;
    }
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      const invoiceId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const newInvoice: Invoice = {
        id: invoiceId,
        branch_id: activeBranchId,
        user_id: user?.id ?? "unknown",
        total_amount: total,
        tax_amount: taxAmount,
        discount,
        payment_method: paymentMethod,
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
          quantity: item.quantity,
          price: unitPrice, // Save overridden price if applicable
          gst_amount: (lineAfterDiscount * item.product.gst_percent) / 100,
          // note: our InvoiceItem interface doesn't store line_discount, but total is correct
        }
      });

      await db.transaction('rw', db.invoices, db.invoice_items, db.inventory, db.sync_queue, async () => {
        await db.invoices.add(newInvoice);
        await db.sync_queue.add({ table_name: 'invoices', operation: 'INSERT', data: newInvoice, timestamp });

        for (const item of invoiceItems) {
          await db.invoice_items.add(item);
          await db.sync_queue.add({ table_name: 'invoice_items', operation: 'INSERT', data: item, timestamp });

          const invRecord = await db.inventory.where({ product_id: item.product_id, branch_id: activeBranchId }).first();
          if (invRecord) {
            const updatedStock = invRecord.stock - item.quantity;
            await db.inventory.update(invRecord.id, { stock: updatedStock, last_updated: timestamp });
            await db.sync_queue.add({ table_name: 'inventory', operation: 'UPDATE', data: { ...invRecord, stock: updatedStock }, timestamp });
          }
        }
      });

      setCompletedTransaction({
        invoice: newInvoice,
        items: [...items], 
        amountTendered: typeof amountTendered === 'number' ? amountTendered : undefined,
        changeDue: paymentMethod === 'cash' && typeof amountTendered === 'number' ? amountTendered - total : undefined
      });

      setIsCheckoutOpen(false);
    } catch (err) {
      console.error(err);
      alert("Transaction failed. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStockBadge = (stock: number) => {
    if (stock <= 0) return <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-bold">Out of stock</span>;
    if (stock <= 5) return <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded font-bold">Only {stock} left</span>;
    return <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold">In stock</span>;
  };

  return (
    <>
      <div className="flex h-[calc(100vh-6rem)] gap-6 overflow-hidden print:hidden">
        {/* Product Selection Area */}
        <div className="flex-1 flex flex-col bg-background rounded-xl overflow-hidden shadow-sm border border-border/40">
          <div className="p-4 bg-card/40 border-b border-border/40 shrink-0">
            {/* Search / Barcode */}
            <div className="relative max-w-2xl mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                placeholder="Scan barcode or search by SKU, Name... (Press '/' to focus)" 
                className={`pl-12 pr-12 h-14 text-lg bg-background border-border focus-visible:ring-primary shadow-sm rounded-lg w-full transition-colors ${scanError ? 'border-destructive focus-visible:ring-destructive text-destructive' : ''}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <ScanBarcode className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 ${scanError ? 'text-destructive' : 'text-muted-foreground'}`} />
              {scanError && (
                <span className="absolute -bottom-5 left-2 text-xs text-destructive font-bold">No product found for this barcode</span>
              )}
            </div>

            {/* Quick Categories */}
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex gap-2">
                {categories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1 p-4 bg-muted/10">
            {groupedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-60">
                <Search className="w-12 h-12 mb-4" />
                <p className="text-lg">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                {groupedProducts.map((group, i) => {
                  const p = group[0];
                  // Calculate total stock for group
                  const totalStock = group.reduce((sum, item) => sum + getStock(item.id), 0);
                  const isMulti = group.length > 1;
                  
                  return (
                    <Card 
                      key={i} 
                      className={`cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card active:scale-[0.98] ${totalStock <= 0 ? 'opacity-60 grayscale' : ''}`}
                      onClick={() => handleProductClick(group)}
                    >
                      <CardContent className="p-4 flex flex-col h-full justify-between gap-3 relative">
                        {isMulti && (
                          <span className="absolute top-3 right-3 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {group.length} Variants
                          </span>
                        )}
                        <div>
                          <p className="font-bold leading-tight line-clamp-2 mt-4">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.brand} {p.category && `• ${p.category}`}</p>
                        </div>
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/40">
                          <div className="flex justify-between items-end">
                            <p className="font-black text-primary text-xl tracking-tight">₹{p.price.toFixed(2)}</p>
                            {renderStockBadge(totalStock)}
                          </div>
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
          <div className="p-4 bg-card border-b border-border/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-none">Current Order</h2>
                <p className="text-xs text-muted-foreground mt-1">{items.length} items</p>
              </div>
            </div>
            {items.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearCart} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash className="w-5 h-5" />
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 p-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20 px-6 text-center">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm mt-2">Scan barcode or select products to start billing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => {
                  const unitPrice = item.overridePrice !== undefined ? item.overridePrice : item.product.price;
                  const lineTotal = (unitPrice * item.quantity) - item.itemDiscount;

                  return (
                    <div key={item.product.id} className="flex gap-3 bg-background p-3 rounded-xl border border-border shadow-sm group relative">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-sm leading-tight truncate">{item.product.name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {(role === 'admin' || role === 'staff') && (
                              <button onClick={() => setEditingItem({ productId: item.product.id, discount: item.itemDiscount, price: item.overridePrice ?? item.product.price })} className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors shrink-0">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded transition-colors shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.product.sku} • {item.product.size} {item.product.color ? `• ${item.product.color}` : ''}</p>
                        
                        {(item.overridePrice !== undefined || item.itemDiscount > 0) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.overridePrice !== undefined && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded">Custom Price: ₹{item.overridePrice}</span>}
                            {item.itemDiscount > 0 && <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 rounded">Discount: -₹{item.itemDiscount}</span>}
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-3">
                          <p className="font-mono text-primary font-bold">₹{Math.max(0, lineTotal).toFixed(2)}</p>
                          
                          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border/50">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-background rounded-md text-foreground transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-background rounded-md text-foreground transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-5 bg-card border-t border-border/60 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono text-foreground">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>GST (Tax)</span>
                <span className="font-mono text-foreground">₹{taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm items-center group">
                <span className="text-muted-foreground transition-colors group-focus-within:text-foreground">Global Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">₹</span>
                  <Input 
                    type="number" 
                    className="w-20 h-8 text-right bg-muted border-none font-mono text-sm focus-visible:ring-1 focus-visible:ring-primary px-2" 
                    value={discount || ''} 
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <div className="border-t border-border/60 pt-4 pb-4 flex justify-between items-end">
              <span className="font-bold text-lg text-muted-foreground">Total Due</span>
              <span className="font-black text-4xl text-primary font-mono tracking-tight">₹{total.toFixed(2)}</span>
            </div>

            <Button 
              className="w-full h-16 text-lg font-black uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all" 
              disabled={items.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
            >
              <Receipt className="w-6 h-6 mr-2" /> Pay Now
            </Button>
          </div>
        </div>

        {/* Variant Selector Dialog */}
        <Dialog open={selectedProductGroup !== null} onOpenChange={(open) => !open && setSelectedProductGroup(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl print:hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{selectedProductGroup?.[0]?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Select a variant to add to cart</p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedProductGroup?.map(variant => {
                const stock = getStock(variant.id);
                const cartQty = getCartQuantity(variant.id);
                const remaining = stock - cartQty;
                
                return (
                  <div key={variant.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-bold text-sm">
                        {variant.size && `Size ${variant.size}`}
                        {variant.size && variant.color && ` • `}
                        {variant.color && `Color ${variant.color}`}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">SKU: {variant.sku}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{variant.price.toFixed(2)}</p>
                        {renderStockBadge(remaining)}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          addItem(variant, 1);
                          setSelectedProductGroup(null);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="sm:max-w-sm bg-card border-border/60 print:hidden">
            <DialogHeader>
              <DialogTitle>Edit Item Price & Discount</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Unit Price (Override)</Label>
                  <Input 
                    type="number" 
                    value={editingItem.price} 
                    onChange={e => setEditingItem({ ...editingItem, price: e.target.value ? parseFloat(e.target.value) : '' })}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to use default price.</p>
                </div>
                <div className="space-y-2">
                  <Label>Item Discount (Total Flat Amount)</Label>
                  <Input 
                    type="number" 
                    value={editingItem.discount} 
                    onChange={e => setEditingItem({ ...editingItem, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    updateItemPrice(editingItem.productId, typeof editingItem.price === 'number' ? editingItem.price : undefined);
                    updateItemDiscount(editingItem.productId, editingItem.discount);
                    setEditingItem(null);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Checkout Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="sm:max-w-5xl w-[95vw] bg-card border-border/60 shadow-2xl p-0 overflow-hidden print:hidden">
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
                      <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">GST (Tax)</span>
                      <span className="font-mono font-medium">₹{taxAmount.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-500">
                        <span>Discount</span>
                        <span className="font-mono font-medium">-₹{discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-4 mt-4 border-t border-border/60 flex justify-between items-end">
                      <span className="text-sm font-bold uppercase text-muted-foreground">Total Due</span>
                      <span className="text-4xl font-black text-primary font-mono tracking-tighter">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quick Cash */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Cash</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-12 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => handleQuickCash(total)}>Exact: ₹{total.toFixed(2)}</Button>
                      {[100, 500, 1000, 2000].map(amt => (
                        <Button key={amt} variant="outline" className="h-12 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => handleQuickCash(amt)}>₹{amt}</Button>
                      ))}
                      <Button variant="outline" className="h-12 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => handleQuickCash(Math.ceil(total / 100) * 100)}>Next ₹{Math.ceil(total / 100) * 100}</Button>
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
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-muted-foreground">₹</span>
                            <Input 
                              type="number" 
                              autoFocus
                              className="pl-10 h-20 text-4xl font-black font-mono rounded-2xl bg-muted/20 border-border/60 focus-visible:ring-primary/20" 
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
                                ₹{(amountTendered - total).toFixed(2)}
                              </p>
                            </div>
                            <Banknote className="w-12 h-12 text-green-500/50" />
                          </div>
                        )}
                        {typeof amountTendered === 'number' && amountTendered < total && (
                          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm font-bold">Tendered amount is less than total due (₹{(total - amountTendered).toFixed(2)} short).</p>
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
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                              <Input type="number" className="pl-7 h-12 bg-muted/20 text-lg font-mono rounded-xl border-border/60" placeholder="0.00" value={splitDetails.cash || ''} onChange={e => setSplitDetails({...splitDetails, cash: parseFloat(e.target.value) || 0})} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3"/> Card</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                              <Input type="number" className="pl-7 h-12 bg-muted/20 text-lg font-mono rounded-xl border-border/60" placeholder="0.00" value={splitDetails.card || ''} onChange={e => setSplitDetails({...splitDetails, card: parseFloat(e.target.value) || 0})} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="w-3 h-3"/> UPI</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
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
                                  <p className="text-sm font-bold text-destructive">Remaining Balance: ₹{remaining.toFixed(2)}</p>
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
                                    ₹{Math.abs(remaining).toFixed(2)}
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
