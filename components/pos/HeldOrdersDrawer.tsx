"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { HeldOrder } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/formatCurrency";
import { ShoppingBag, Trash2, RotateCcw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function HeldOrdersDrawer() {
  const { businessId, user } = useAuthStore();
  const { showHeldOrders, setShowHeldOrders, setSelectedCustomer } = usePOSStore();
  const { items: cartItems, addItem, setDiscount, clearCart } = useCartStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResumeOrder, setConfirmResumeOrder] = useState<HeldOrder | null>(null);

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  useEffect(() => {
    if (!businessId) return;
    const fetchOrders = async () => {
      const { data } = await supabase.from('held_orders').select('*').eq('business_id', businessId);
      if (data) setHeldOrders(data);
    };
    if (showHeldOrders) {
      fetchOrders();
    }
  }, [businessId, showHeldOrders]);

  const handleResume = async (order: HeldOrder) => {
    if (cartItems.length > 0) {
      setConfirmResumeOrder(order);
      return;
    }
    await doResume(order);
  };

  const doResume = async (order: HeldOrder) => {
    clearCart();
    const savedItems = JSON.parse(order.items);
    for (const item of savedItems) {
      addItem(item.product, item.quantity);
    }
    setDiscount(order.discount);

    // Restore customer if any
    if (order.customer_id && order.customer_id !== "__walk_in__") {
      const { data: customer } = await supabase.from('customers').select('*').eq('id', order.customer_id).single();
      if (customer) setSelectedCustomer(customer);
    }

    // Remove held order
    await supabase.from('held_orders').delete().eq('id', order.id);
    setConfirmResumeOrder(null);
    setShowHeldOrders(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('held_orders').delete().eq('id', id);
    setHeldOrders(prev => prev.filter(o => o.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <>
      <Dialog open={showHeldOrders} onOpenChange={setShowHeldOrders}>
        <DialogContent className="sm:max-w-lg bg-card border-border/60 shadow-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> Held Orders
            </DialogTitle>
          </DialogHeader>

          {heldOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-muted-foreground opacity-60">
              <ShoppingBag className="w-12 h-12 mb-3" />
              <p className="font-semibold">No held orders</p>
              <p className="text-sm mt-1">Hold an order to park it and start a new bill</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 py-2 pr-2">
                {heldOrders.map((order) => (
                  <div key={order.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-background">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{order.customer_name || "Walk-in Customer"}</p>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground shrink-0">
                          #{order.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {JSON.parse(order.items).length} items · {formatINR(order.total_amount)}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                        {order.user_name && <span>· by {order.user_name}</span>}
                      </div>
                      {order.notes && (
                        <p className="text-xs italic text-muted-foreground mt-1 truncate">"{order.notes}"</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => handleResume(order)}>
                        <RotateCcw className="w-3 h-3" /> Resume
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteId(order.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/60 print:hidden">
          <DialogHeader><DialogTitle>Delete Held Order?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This held order will be permanently removed. This cannot be undone.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm resume with active cart */}
      <Dialog open={!!confirmResumeOrder} onOpenChange={() => setConfirmResumeOrder(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/60 print:hidden">
          <DialogHeader><DialogTitle>Replace Current Cart?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Your current cart has items. Resuming this order will replace the current cart. Continue?</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmResumeOrder(null)}>Cancel</Button>
            <Button className="flex-1" onClick={() => confirmResumeOrder && doResume(confirmResumeOrder)}>Yes, Resume</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
