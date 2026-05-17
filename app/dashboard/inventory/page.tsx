"use client";
import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Product, type Inventory, type Branch } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { AdminPinDialog } from "@/components/AdminPinDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/formatCurrency";
import { Plus, Search, AlertCircle, Building2, Pencil, Check, X, Trash2, PlusCircle, ChevronDown } from "lucide-react";

interface SizeVariant { id: string; size: string; sku: string; stockPerBranch: Record<string, string>; }
interface FormState { name: string; category: string; brand: string; color: string; price: string; gst_percent: string; price_includes_gst: boolean; variants: SizeVariant[]; }

function getBase(price: string, gst: string, inc: boolean) {
  const p = parseFloat(price) || 0, g = parseFloat(gst) || 0;
  return inc ? parseFloat((p / (1 + g / 100)).toFixed(2)) : p;
}

function StockCell({ stock, isSelected, onEdit }: { stock: number; isSelected: boolean; onEdit: () => void }) {
  const cls = stock === 0 ? "bg-red-500/10 text-red-500" : stock <= 5 ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600";
  return (
    <button onClick={onEdit} className={cn("inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-lg text-xs font-bold transition-all hover:ring-2 hover:ring-primary/40 group relative", cls, isSelected && "ring-2 ring-primary/30")}>
      {stock === 0 ? "—" : stock}
      <Pencil className="w-2.5 h-2.5 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-background rounded-full p-0.5 text-muted-foreground" />
    </button>
  );
}

export default function InventoryPage() {
  const { user, role } = useAuthStore();
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) ?? [];
  const branches = useLiveQuery(() => db.branches.toArray()) ?? [];
  const dbUser = useLiveQuery(() => user ? db.users.get(user.id) : undefined, [user?.id]);

  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", category: "", brand: "", color: "", price: "", gst_percent: "18", price_includes_gst: false, variants: [] });
  const [submitting, setSubmitting] = useState(false);
  const [editCell, setEditCell] = useState<{ productId: string; branchId: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [pinForEdit, setPinForEdit] = useState<{ productId: string; branchId: string; stock: number } | null>(null);
  const [pinForAddProduct, setPinForAddProduct] = useState(false);
  const [pinForDelete, setPinForDelete] = useState<string | null>(null);

  const { selectedBranchId } = usePOSStore();

  // Default chip to staff's branch
  useEffect(() => {
    if (dbUser?.branch_id && branchFilter === "all" && role === "staff") setBranchFilter(dbUser.branch_id);
  }, [dbUser?.branch_id, role]);

  // Add first variant when dialog opens
  const openDialog = () => {
    setForm({ name: "", category: "", brand: "", color: "", price: "", gst_percent: "18", price_includes_gst: false, variants: [newVariant()] });
    setIsOpen(true);
  };

  const newVariant = (): SizeVariant => ({ id: crypto.randomUUID(), size: "", sku: "", stockPerBranch: Object.fromEntries(branches.map(b => [b.id, "0"])) });

  const getBranchStock = (pid: string, bid: string) => inventory.find(i => i.product_id === pid && i.branch_id === bid)?.stock ?? 0;
  const getTotalStock = (pid: string) => inventory.filter(i => i.product_id === pid).reduce((s, i) => s + i.stock, 0);

  // Ordered branches: selected first
  const orderedBranches = useMemo(() => {
    if (branchFilter === "all") return branches;
    const sel = branches.find(b => b.id === branchFilter);
    return sel ? [sel, ...branches.filter(b => b.id !== branchFilter)] : branches;
  }, [branches, branchFilter]);

  const filtered = useMemo(() => {
    let p = products;
    if (search) { const q = search.toLowerCase(); p = p.filter(pr => pr.name.toLowerCase().includes(q) || pr.sku.toLowerCase().includes(q) || pr.brand.toLowerCase().includes(q)); }
    if (branchFilter !== "all") p = [...p].sort((a, b) => getBranchStock(b.id, branchFilter) - getBranchStock(a.id, branchFilter));
    return p;
  }, [products, search, branchFilter, inventory]);

  const handleEditClick = (productId: string, branchId: string, stock: number) => {
    // If the branch being edited is NOT the currently locked terminal branch, require Admin PIN
    if (selectedBranchId && branchId !== selectedBranchId) {
      setPinForEdit({ productId, branchId, stock });
    } else {
      setEditCell({ productId, branchId });
      setEditVal(String(stock));
    }
  };

  const handlePinSuccessForEdit = () => {
    if (pinForEdit) {
      setEditCell({ productId: pinForEdit.productId, branchId: pinForEdit.branchId });
      setEditVal(String(pinForEdit.stock));
      setPinForEdit(null);
    }
  };

  const saveEdit = async () => {
    if (!editCell) return;
    const stock = Math.max(0, parseInt(editVal) || 0);
    const ts = new Date().toISOString();
    const ex = inventory.find(i => i.product_id === editCell.productId && i.branch_id === editCell.branchId);
    if (ex) {
      await db.inventory.update(ex.id, { stock, last_updated: ts });
      await db.sync_queue.add({ table_name: "inventory", operation: "UPDATE", data: { ...ex, stock }, timestamp: ts });
    } else {
      const nw: Inventory = { id: crypto.randomUUID(), product_id: editCell.productId, branch_id: editCell.branchId, stock, last_updated: ts };
      await db.inventory.add(nw);
      await db.sync_queue.add({ table_name: "inventory", operation: "INSERT", data: nw, timestamp: ts });
    }
    setEditCell(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (branches.length === 0) { alert("Add a branch first."); return; }
    if (form.variants.length === 0 || form.variants.some(v => !v.size.trim() || !v.sku.trim())) { alert("All variants need Size and SKU."); return; }

    // Check if any variant has stock set for a branch other than the current terminal branch
    const hasOtherBranchStock = selectedBranchId && form.variants.some(v =>
      Object.entries(v.stockPerBranch).some(([bid, stockStr]) => bid !== selectedBranchId && (parseInt(stockStr) || 0) > 0)
    );

    if (hasOtherBranchStock) {
      // Show Admin PIN dialog first, actual save happens on pin success
      setPinForAddProduct(true);
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const ts = new Date().toISOString();
    const base = getBase(form.price, form.gst_percent, form.price_includes_gst);
    try {
      await db.transaction("rw", db.products, db.inventory, db.sync_queue, async () => {
        for (const v of form.variants) {
          const p: Product = { id: crypto.randomUUID(), name: form.name, category: form.category, brand: form.brand, size: v.size, color: form.color, sku: v.sku, price: base, gst_percent: parseFloat(form.gst_percent), created_at: ts };
          await db.products.add(p);
          await db.sync_queue.add({ table_name: "products", operation: "INSERT", data: p, timestamp: ts });
          for (const [bid, stockStr] of Object.entries(v.stockPerBranch)) {
            const inv: Inventory = { id: crypto.randomUUID(), product_id: p.id, branch_id: bid, stock: parseInt(stockStr) || 0, last_updated: ts };
            await db.inventory.add(inv);
            await db.sync_queue.add({ table_name: "inventory", operation: "INSERT", data: inv, timestamp: ts });
          }
        }
      });
      setIsOpen(false);
    } catch (err) { console.error(err); alert("Failed to save."); }
    finally { setSubmitting(false); }
  };

  const deleteProduct = (pid: string) => {
    // Gate all deletions behind Admin PIN
    setPinForDelete(pid);
  };

  const doDeleteProduct = async () => {
    if (!pinForDelete) return;
    await db.inventory.where("product_id").equals(pinForDelete).delete();
    await db.products.delete(pinForDelete);
    setPinForDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Per-branch stock management</p>
        </div>
        <Button onClick={openDialog} className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
      </div>

      {/* Search + Branch chips */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, SKU, brand…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {branches.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No branches yet. <a href="/dashboard/branches" className="underline font-semibold ml-1">Add a branch</a> before managing stock.
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Filter by branch:</span>
            {[{ id: "all", name: "All Branches" }, ...branches].map(b => (
              <button key={b.id} onClick={() => setBranchFilter(b.id)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5",
                  branchFilter === b.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")}>
                {b.id !== "all" && <Building2 className="w-3 h-3" />}
                {b.name}
                {b.id !== "all" && dbUser?.branch_id === b.id && <span className="bg-white/25 text-[9px] px-1.5 rounded-full font-bold">MY BRANCH</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-x-auto bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="text-xs font-bold uppercase tracking-wider">SKU</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Brand / Category</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Size / Color</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Price</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">GST</TableHead>
              {orderedBranches.map(b => (
                <TableHead key={b.id} className={cn("text-xs font-bold uppercase tracking-wider text-center min-w-[90px]", branchFilter === b.id && "text-primary")}>
                  <div className="flex flex-col items-center gap-0.5">
                    <Building2 className="w-3 h-3" />{b.name}
                    {branchFilter === b.id && <span className="text-[9px] normal-case text-primary font-bold">active</span>}
                  </div>
                </TableHead>
              ))}
              {branches.length > 1 && <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Total</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8 + orderedBranches.length} className="h-32 text-center text-muted-foreground text-sm">
                {products.length === 0 ? "No products yet. Click \"Add Product\" to get started." : "No results for your search."}
              </TableCell></TableRow>
            )}
            {filtered.map(p => {
              const total = getTotalStock(p.id);
              const inSelectedBranch = branchFilter !== "all" ? getBranchStock(p.id, branchFilter) : total;
              return (
                <TableRow key={p.id} className={cn("group", inSelectedBranch === 0 && branchFilter !== "all" && "opacity-60")}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.brand} / {p.category}</TableCell>
                  <TableCell className="text-xs">{p.size}{p.color && ` · ${p.color}`}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatINR(p.price)}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{p.gst_percent}%</TableCell>
                  {orderedBranches.map(b => {
                    const stock = getBranchStock(p.id, b.id);
                    const isEditing = editCell?.productId === p.id && editCell?.branchId === b.id;
                    return (
                      <TableCell key={b.id} className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input autoFocus type="number" min="0" value={editVal} onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditCell(null); }}
                              className="w-16 h-7 text-center text-xs p-1" />
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditCell(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <StockCell stock={stock} isSelected={branchFilter === b.id}
                            onEdit={() => handleEditClick(p.id, b.id, stock)} />
                        )}
                      </TableCell>
                    );
                  })}
                  {branches.length > 1 && (
                    <TableCell className="text-center">
                      <span className={cn("inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-lg text-xs font-bold", total === 0 ? "bg-red-500/10 text-red-500" : total <= 10 ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary")}>
                        {total === 0 ? "—" : total}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <button onClick={() => deleteProduct(p.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) setForm({ name: "", category: "", brand: "", color: "", price: "", gst_percent: "18", price_includes_gst: false, variants: [] }); }}>
        <DialogContent className="bg-card border-border/60 w-[96vw] sm:max-w-5xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/10 sticky top-0 z-10">
            <DialogTitle className="font-black text-lg">Add New Product</DialogTitle>
            <p className="text-xs text-muted-foreground">Fill in product details, then set stock per branch for each size variant.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Product info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold">Product Name *</Label>
                <Input placeholder="e.g. Air Jordan High 1 OG" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Brand *</Label>
                <Input placeholder="e.g. Nike" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Input placeholder="e.g. Sneakers" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Color</Label>
                <Input placeholder="e.g. Black" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price (₹) *</Label>
                <Input type="number" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">GST %</Label>
                <Input type="number" placeholder="18" value={form.gst_percent} onChange={e => setForm(f => ({ ...f, gst_percent: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                <input type="checkbox" id="incGst" checked={form.price_includes_gst} onChange={e => setForm(f => ({ ...f, price_includes_gst: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <Label htmlFor="incGst" className="text-xs cursor-pointer">Price includes GST</Label>
              </div>
            </div>

            {/* Variants table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Size Variants &amp; Branch Stock</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Each size is saved as a separate product entry. Set initial stock per branch.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, variants: [...f.variants, newVariant()] }))} className="gap-1 text-xs h-8">
                  <PlusCircle className="w-3.5 h-3.5" /> Add Size
                </Button>
              </div>

              {branches.length === 0 && (
                <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  No branches. <a href="/dashboard/branches" className="underline">Add branches first</a> to set per-branch stock.
                </div>
              )}

              {form.variants.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
                  Click &ldquo;Add Size&rdquo; to add size variants
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Size *</th>
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">SKU *</th>
                        {branches.map(b => (
                          <th key={b.id} className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-[80px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <Building2 className="w-3 h-3" />{b.name}
                            </div>
                          </th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {form.variants.map((v, idx) => (
                        <tr key={v.id} className="hover:bg-muted/10">
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" placeholder="US 9" value={v.size}
                              onChange={e => setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, size: e.target.value } : x) }))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs font-mono" placeholder="NK-AJ-001" value={v.sku}
                              onChange={e => setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, sku: e.target.value } : x) }))} />
                          </td>
                          {branches.map(b => (
                            <td key={b.id} className="px-3 py-2">
                              <Input type="number" min="0" className="h-8 text-xs text-center w-20 mx-auto" placeholder="0"
                                value={v.stockPerBranch[b.id] ?? "0"}
                                onChange={e => setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, stockPerBranch: { ...x.stockPerBranch, [b.id]: e.target.value } } : x) }))} />
                            </td>
                          ))}
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => setForm(f => ({ ...f, variants: f.variants.filter(x => x.id !== v.id) }))}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="min-w-[120px]">
                {submitting ? "Saving…" : "Save Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AdminPinDialog
        open={!!pinForEdit}
        title="Admin Access Required"
        onSuccess={handlePinSuccessForEdit}
        onClose={() => setPinForEdit(null)}
      />
      <AdminPinDialog
        open={pinForAddProduct}
        title="Admin Access Required"
        onSuccess={() => { setPinForAddProduct(false); doSubmit(); }}
        onClose={() => setPinForAddProduct(false)}
      />
      <AdminPinDialog
        open={!!pinForDelete}
        title="Confirm Product Deletion"
        onSuccess={doDeleteProduct}
        onClose={() => setPinForDelete(null)}
      />
    </div>
  );
}
