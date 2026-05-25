"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCustomers } from "@/lib/api/queries";
import type { Customer } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserCircle2, X, Plus, UserCheck } from "lucide-react";

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

export function CustomerPanel() {
  const { businessId } = useAuthStore();
  const queryClient = useQueryClient();
  const { selectedCustomer, setSelectedCustomer } = usePOSStore();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
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
    : allCustomers.slice(0, 6);

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
      setShowCreate(false);
      setShowSearch(false);
      setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Compact customer bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setShowSearch(true)}
      >
        <div className={`p-1 rounded-full ${isWalkIn ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
          {isWalkIn ? <UserCircle2 className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{customer.name}</p>
          {!isWalkIn && customer.phone && (
            <p className="text-xs text-muted-foreground truncate">{customer.phone}</p>
          )}
        </div>
        {!isWalkIn && (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isWalkIn && <Search className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      {/* Customer search dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="font-bold">Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search by name, phone, or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {/* Walk-in option */}
              <button
                onClick={() => { setSelectedCustomer(null); setShowSearch(false); setSearch(""); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Walk-in Customer</p>
                  <p className="text-xs text-muted-foreground">No customer record</p>
                </div>
              </button>

              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setShowSearch(false); setSearch(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone} {c.email && `• ${c.email}`}</p>
                  </div>
                  {c.loyalty_points > 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold shrink-0">
                      {c.loyalty_points} pts
                    </span>
                  )}
                </button>
              ))}

              {filteredCustomers.length === 0 && search && (
                <p className="text-center text-sm text-muted-foreground py-4">No customers found</p>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setShowSearch(false); setShowCreate(true); }}
            >
              <Plus className="w-4 h-4" /> New Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create new customer dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="font-bold">New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" maxLength={10} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1">
              <Label>Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
            </div>
            <div className="space-y-1">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? "Saving..." : "Create & Select"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
