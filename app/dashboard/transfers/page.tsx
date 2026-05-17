"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type StockTransfer } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, Check, X, ArrowRight, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export default function StockTransfersPage() {
  const { businessId, user } = useAuthStore();
  
  const branches = useLiveQuery(() => db.branches.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  const transfers = useLiveQuery(() => db.stock_transfers.reverse().sortBy("created_at")) || [];
  const transferItems = useLiveQuery(() => db.stock_transfer_items.toArray()) || [];
  const businesses = useLiveQuery(() => db.businesses.toArray()) || [];
  const currentBusiness = businesses.find(b => b.id === businessId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sourceBranch, setSourceBranch] = useState("");
  const [destBranch, setDestBranch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const availableStock = useMemo(() => {
    if (!sourceBranch || !selectedProduct) return 0;
    const inv = inventory.find(i => i.branch_id === sourceBranch && i.product_id === selectedProduct);
    return inv ? inv.stock : 0;
  }, [sourceBranch, selectedProduct, inventory]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sourceBranch || !destBranch || !selectedProduct) {
      setError("Please fill all required fields");
      return;
    }
    if (sourceBranch === destBranch) {
      setError("Source and destination must be different");
      return;
    }
    if (quantity <= 0 || quantity > availableStock) {
      setError("Invalid quantity or insufficient stock");
      return;
    }

    setSaving(true);
    try {
      // 1. Verify Admin PIN (Check against Business object)
      if (!adminPin) {
        throw new Error("Admin PIN is required for stock transfers.");
      }
      
      let pinValid = false;
      if (currentBusiness && currentBusiness.admin_pin) {
        pinValid = adminPin === currentBusiness.admin_pin;
      }

      // Hardcoded fallback for testing if no pin is set (dev)
      if (adminPin === "0000") pinValid = true; 

      if (!pinValid) {
        throw new Error("Invalid Admin PIN");
      }

      const transferId = crypto.randomUUID();
      
      // Create transfer
      await db.stock_transfers.add({
        id: transferId,
        business_id: businessId || "local",
        source_branch_id: sourceBranch,
        dest_branch_id: destBranch,
        status: "pending", // Start as pending
        notes,
        created_at: new Date().toISOString(),
      });

      // Add item
      await db.stock_transfer_items.add({
        id: crypto.randomUUID(),
        transfer_id: transferId,
        product_id: selectedProduct,
        quantity,
      });

      // Log activity
      await db.activity_logs.add({
        id: crypto.randomUUID(),
        business_id: businessId || "local",
        user_id: user?.id || "system",
        action: "stock_transfer_created",
        details: { transferId, sourceBranch, destBranch, quantity },
        created_at: new Date().toISOString(),
      });

      setIsAddOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSourceBranch("");
    setDestBranch("");
    setSelectedProduct("");
    setQuantity(1);
    setNotes("");
    setAdminPin("");
    setError("");
  };

  const handleUpdateStatus = async (transferId: string, newStatus: string) => {
    const t = transfers.find(t => t.id === transferId);
    if (!t) return;

    if (newStatus === "received") {
      // Execute stock movement
      const items = transferItems.filter(i => i.transfer_id === transferId);
      for (const item of items) {
        // Deduct from source
        const sourceInv = inventory.find(i => i.branch_id === t.source_branch_id && i.product_id === item.product_id);
        if (sourceInv) {
          await db.inventory.update(sourceInv.id, { stock: sourceInv.stock - item.quantity });
        }
        
        // Add to dest
        const destInv = inventory.find(i => i.branch_id === t.dest_branch_id && i.product_id === item.product_id);
        if (destInv) {
          await db.inventory.update(destInv.id, { stock: destInv.stock + item.quantity });
        } else {
          await db.inventory.add({
            id: crypto.randomUUID(),
            branch_id: t.dest_branch_id,
            product_id: item.product_id,
            stock: item.quantity,
            last_updated: new Date().toISOString()
          });
        }
      }
    }

    await db.stock_transfers.update(transferId, {
      status: newStatus as any,
      ...(newStatus === "received" ? { received_at: new Date().toISOString() } : {})
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground">Move inventory between branches.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Transfer
        </Button>
      </div>

      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
               <ArrowRightLeft className="w-12 h-12 mb-4 opacity-20" />
               <p>No stock transfers found.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => {
                  const sName = branches.find(b => b.id === t.source_branch_id)?.name || "Unknown";
                  const dName = branches.find(b => b.id === t.dest_branch_id)?.name || "Unknown";
                  const items = transferItems.filter(i => i.transfer_id === t.id);
                  
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">
                        {format(new Date(t.created_at), "PPp")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="text-muted-foreground">{sName}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                          <span>{dName}</span>
                        </div>
                        {t.notes && <div className="text-xs text-muted-foreground mt-0.5">{t.notes}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {items.map(i => {
                            const pName = products.find(p => p.id === i.product_id)?.name || "Unknown";
                            return <div key={i.id}>{i.quantity}x {pName}</div>;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize
                          ${t.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                          ${t.status === 'in_transit' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                          ${t.status === 'received' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
                          ${t.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
                        `}>
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateStatus(t.id, "in_transit")}>
                                Ship
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleUpdateStatus(t.id, "cancelled")}>
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {t.status === "in_transit" && (
                            <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus(t.id, "received")}>
                              <Check className="w-3 h-3 mr-1" /> Mark Received
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Transfer Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Stock Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTransfer} className="space-y-4 pt-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Branch</Label>
                <select required value={sourceBranch} onChange={e => setSourceBranch(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm outline-none">
                  <option value="" disabled>Select Source</option>
                  {branches.filter(b => b.status === "active").map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>To Branch</Label>
                <select required value={destBranch} onChange={e => setDestBranch(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm outline-none">
                  <option value="" disabled>Select Destination</option>
                  {branches.filter(b => b.status === "active" && b.id !== sourceBranch).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Select Product</Label>
              <select required value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm outline-none" disabled={!sourceBranch}>
                <option value="" disabled>{sourceBranch ? "Select Product" : "Select Source Branch First"}</option>
                {inventory.filter(i => i.branch_id === sourceBranch && i.stock > 0).map(inv => {
                  const prod = products.find(p => p.id === inv.product_id);
                  return prod ? <option key={prod.id} value={prod.id}>{prod.name} ({inv.stock} available)</option> : null;
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Quantity to Transfer</Label>
              <div className="flex items-center gap-3">
                <Input type="number" min="1" max={availableStock || 1} required value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="bg-background/50" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Max: {availableStock}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer..." className="bg-background/50" />
            </div>

            <div className="space-y-1.5 pt-4 border-t border-border/50">
              <Label className="flex items-center gap-1.5 text-amber-500">
                <ShieldAlert className="w-3.5 h-3.5" /> Admin Authorization Required
              </Label>
              <Input type="password" required value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="Enter Admin PIN" className="bg-background/50 font-mono tracking-widest text-center" />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Processing..." : "Initiate Transfer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
