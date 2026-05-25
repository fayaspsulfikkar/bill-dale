"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { canDo } from "@/lib/permissions";
import { useNeedsApproval } from "@/hooks/usePermission";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManagerApprovalModal } from "./ManagerApprovalModal";
import { Zap } from "lucide-react";
import type { Product } from "@/lib/types";

export function QuickAddItemModal() {
  const { role } = useAuthStore();
  const { showQuickAdd, setShowQuickAdd } = usePOSStore();
  const { addItem } = useCartStore();

  const [form, setForm] = useState({ name: "", price: "", qty: "1", gst: "18", sku: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingApproval, setPendingApproval] = useState(false);

  const needsApproval = useNeedsApproval("quick_add_item");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Item name is required";
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) e.price = "Price must be greater than zero";
    const qty = parseInt(form.qty);
    if (isNaN(qty) || qty < 1) e.qty = "Quantity must be at least 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    if (needsApproval) {
      setPendingApproval(true);
      return;
    }
    doAdd();
  };

  const doAdd = () => {
    const customProduct: any = {
      id: `CUSTOM-${crypto.randomUUID()}`,
      business_id: role === "admin" ? null : null, // It's a custom cart item, doesn't actually exist in db
      name: form.name.trim(),
      category: "Custom",
      brand: "—",
      size: "—",
      color: "—",
      sku: form.sku.trim() || `CUST-${Date.now()}`,
      price: parseFloat(form.price),
      gst_percent: parseFloat(form.gst) || 0,
      created_at: new Date().toISOString(),
    };
    addItem(customProduct, parseInt(form.qty));
    setForm({ name: "", price: "", qty: "1", gst: "18", sku: "", note: "" });
    setShowQuickAdd(false);
  };

  return (
    <>
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent className="sm:max-w-sm bg-card border-border/60 shadow-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Zap className="w-5 h-5 text-amber-500" /> Quick Add Item
            </DialogTitle>
          </DialogHeader>
          {needsApproval && (
            <div className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg px-3 py-2">
              Manager approval required for custom items.
            </div>
          )}
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Item Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Custom Alteration" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
              <div className="space-y-1">
                <Label>Qty <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" placeholder="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>GST %</Label>
                <Input type="number" placeholder="18" value={form.gst} onChange={e => setForm(f => ({ ...f, gst: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>SKU <span className="text-xs text-muted-foreground">(opt.)</span></Label>
                <Input placeholder="auto" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAdd}>
                {needsApproval ? "Request Approval" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ManagerApprovalModal
        open={pendingApproval}
        action="quick_add_item"
        onApproved={() => { setPendingApproval(false); doAdd(); }}
        onClose={() => setPendingApproval(false)}
      />
    </>
  );
}
