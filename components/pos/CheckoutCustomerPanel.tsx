"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCustomers } from "@/lib/api/queries";
import type { Customer } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, UserCircle2, X, Plus, UserCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const WALK_IN: Customer = {
  id: "__walk_in__",
  business_id: "",
  name: "Walk-in Customer",
  loyalty_points: 0,
  wallet_balance: 0,
  membership_tier: "standard",
  created_at: "",
};

function validatePhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}

function validateEmail(email: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CheckoutCustomerPanel() {
  const { businessId } = useAuthStore();
  const queryClient = useQueryClient();
  const { selectedCustomer, setSelectedCustomer } = usePOSStore();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"view" | "search" | "create">("view");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const customer = selectedCustomer ?? WALK_IN;
  const isWalkIn = customer.id === "__walk_in__";

  const { data: allCustomers = [] } = useCustomers(businessId || null);

  const filteredCustomers = search.trim()
    ? allCustomers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : allCustomers.slice(0, 5);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!validatePhone(form.phone)) e.phone = "Invalid 10-digit mobile number";
    if (form.email && !validateEmail(form.email)) e.email = "Invalid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate() || !businessId) return;
    setSaving(true);
    try {
      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        business_id: businessId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        loyalty_points: 0,
        wallet_balance: 0,
        membership_tier: "standard",
        created_at: new Date().toISOString(),
        synced: false,
      };
      await supabase.from('customers').insert(newCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomer(newCustomer);
      setMode("view");
      setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  // If we are in 'view' mode but no customer is selected (i.e. walk-in), we can default to search mode
  // But actually, it's fine to show "Walk-in" and let them click "Assign Customer"
  if (mode === "view") {
    return (
      <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <UserCircle2 className="w-4 h-4" /> Customer Details
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isWalkIn ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
              {isWalkIn ? <UserCircle2 className="w-6 h-6" /> : customer.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-base leading-tight">{customer.name}</p>
              {!isWalkIn && customer.phone ? (
                <p className="text-sm text-muted-foreground font-mono mt-0.5">{customer.phone}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">No customer record attached</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMode("search")}>
            {isWalkIn ? "Assign Customer" : "Change"}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "search") {
    return (
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col h-[350px]">
        <div className="p-3 border-b border-border/60 bg-muted/5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by mobile number or name..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMode("view")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 min-h-0 bg-muted/5">
          <div className="p-2 space-y-1">
            <button
              onClick={() => { setSelectedCustomer(null); setMode("view"); setSearch(""); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background border border-transparent hover:border-border/60 hover:shadow-sm transition-all text-left"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <UserCircle2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Walk-in Customer</p>
                <p className="text-xs text-muted-foreground">Continue without saving details</p>
              </div>
            </button>

            {filteredCustomers.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCustomer(c); setMode("view"); setSearch(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background border border-transparent hover:border-border/60 hover:shadow-sm transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{c.phone} {c.email && `• ${c.email}`}</p>
                </div>
                {c.loyalty_points > 0 && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold shrink-0">
                    {c.loyalty_points} pts
                  </span>
                )}
              </button>
            ))}

            {filteredCustomers.length === 0 && search && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">No matching customers found</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 bg-card border-t border-border/60">
          <Button className="w-full gap-2" variant="outline" onClick={() => setMode("create")}>
            <Plus className="w-4 h-4" /> Add New Customer
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col h-[350px]">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/5 flex items-center justify-between">
          <h3 className="font-bold">New Customer</h3>
          <Button variant="ghost" size="icon" className="-mr-2" onClick={() => setMode("search")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer Name" />
              {errors.name && <p className="text-[10px] text-destructive font-semibold">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Mobile Number <span className="text-destructive">*</span></Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" maxLength={10} />
              {errors.phone && <p className="text-[10px] text-destructive font-semibold">{errors.phone}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              {errors.email && <p className="text-[10px] text-destructive font-semibold">{errors.email}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Shipping or billing address" />
            </div>
          </div>
        </ScrollArea>
        <div className="p-3 bg-card border-t border-border/60 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setMode("search")}>Cancel</Button>
          <Button className="flex-1" onClick={handleCreate} disabled={saving}>
            {saving ? "Saving..." : "Create & Select"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
